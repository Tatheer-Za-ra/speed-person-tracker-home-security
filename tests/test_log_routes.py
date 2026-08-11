# tests/test_log_routes.py

import unittest
from app import create_app
from app.db import get_db_session, engine, Base
from app.models import User, Video, ProcessingLog, Event, Snapshot


class TestLogRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        self.db = get_db_session()
        test_user = self.db.query(User).filter(User.email == "test_log_user@example.com").first()
        if not test_user:
            test_user = User(
                name="Log Test User",
                email="test_log_user@example.com",
                password_hash="fakehash",
            )
            self.db.add(test_user)
            self.db.commit()
            self.db.refresh(test_user)

        self.user_id = test_user.id

        with self.client.session_transaction() as sess:
            sess["user_id"] = self.user_id

        # Insert dummy video and processing log
        dummy_video = Video(
            batch_id=99,
            original_filename="cctv_test_run.mp4",
            stored_path="uploads/dummy.mp4",
        )
        self.db.add(dummy_video)
        self.db.commit()
        self.db.refresh(dummy_video)
        self.dummy_video_id = dummy_video.id

        dummy_log = ProcessingLog(
            video_id=dummy_video.id,
            status="completed",
            message="Processing completed successfully",
        )
        self.db.add(dummy_log)

        dummy_event = Event(
            video_id=dummy_video.id,
            track_id=1,
            event_type="overspeed_vehicle",
            label="car",
            timestamp_seconds=5.0,
            is_alert=True,
        )
        self.db.add(dummy_event)
        self.db.commit()

    def test_list_all_video_logs(self):
        response = self.client.get("/api/videos/logs")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "success")
        self.assertIsInstance(data.get("logs"), list)
        self.assertTrue(len(data.get("logs")) > 0)
        filenames = [l.get("original_filename") for l in data.get("logs")]
        self.assertIn("cctv_test_run.mp4", filenames)

    def test_delete_video_log_cascade(self):
        # Delete video run
        del_resp = self.client.delete(f"/api/videos/logs/{self.dummy_video_id}")
        self.assertEqual(del_resp.status_code, 200)
        data = del_resp.get_json()
        self.assertEqual(data.get("status"), "success")

        # Verify DB records purged
        v = self.db.query(Video).filter(Video.id == self.dummy_video_id).first()
        self.assertIsNone(v)
        events = self.db.query(Event).filter(Event.video_id == self.dummy_video_id).all()
        self.assertEqual(len(events), 0)


if __name__ == "__main__":
    unittest.main()
