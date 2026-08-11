# tests/test_retention_service.py

import unittest
from datetime import datetime, timedelta
from app import create_app
from app.db import get_db_session, engine, Base
from app.models import User, Video, ProcessingLog, Event, Config
from app.retention_service import (
    get_retention_settings,
    update_retention_settings,
    run_retention_cleanup,
)


class TestRetentionService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        self.db = get_db_session()
        test_user = self.db.query(User).filter(User.email == "test_retention_user@example.com").first()
        if not test_user:
            test_user = User(
                name="Retention Test User",
                email="test_retention_user@example.com",
                password_hash="fakehash",
            )
            self.db.add(test_user)
            self.db.commit()
            self.db.refresh(test_user)

        self.user_id = test_user.id

        with self.client.session_transaction() as sess:
            sess["user_id"] = self.user_id

        # Insert old video (60 days old)
        old_date = datetime.now() - timedelta(days=60)
        self.old_video = Video(
            batch_id=50,
            original_filename="old_cctv_run.mp4",
            stored_path="uploads/old.mp4",
            uploaded_at=old_date,
        )
        self.db.add(self.old_video)

        # Insert recent video (1 day old)
        recent_date = datetime.now() - timedelta(days=1)
        self.recent_video = Video(
            batch_id=51,
            original_filename="recent_cctv_run.mp4",
            stored_path="uploads/recent.mp4",
            uploaded_at=recent_date,
        )
        self.db.add(self.recent_video)
        self.db.commit()

        self.db.refresh(self.old_video)
        self.db.refresh(self.recent_video)

    def test_get_and_update_retention_settings(self):
        settings = get_retention_settings(self.db)
        self.assertIn("retention_days", settings)

        updated = update_retention_settings(self.db, 14)
        self.assertEqual(updated["retention_days"], 14)

    def test_run_retention_cleanup(self):
        # Set retention days to 30 -> old_video (60 days old) should be purged, recent_video (1 day old) should remain
        result = run_retention_cleanup(self.db, explicit_days=30)
        self.assertEqual(result["status"], "success")
        self.assertTrue(result["purged_videos"] >= 1)

        # Verify old video is deleted
        v_old = self.db.query(Video).filter(Video.id == self.old_video.id).first()
        self.assertIsNone(v_old)

        # Verify recent video remains
        v_recent = self.db.query(Video).filter(Video.id == self.recent_video.id).first()
        self.assertIsNotNone(v_recent)

    def test_retention_api_endpoints(self):
        # GET retention config
        get_resp = self.client.get("/api/config/retention")
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.get_json()["status"], "success")

        # PUT retention config
        put_resp = self.client.put("/api/config/retention", json={"retention_days": 14})
        self.assertEqual(put_resp.status_code, 200)
        self.assertEqual(put_resp.get_json()["retention"]["retention_days"], 14)

        # POST retention cleanup run
        post_resp = self.client.post("/api/config/retention/run")
        self.assertEqual(post_resp.status_code, 200)
        self.assertEqual(post_resp.get_json()["status"], "success")


if __name__ == "__main__":
    unittest.main()
