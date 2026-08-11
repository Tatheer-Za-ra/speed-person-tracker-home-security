# tests/test_report_service.py

import unittest
import json
from app import create_app
from app.db import get_db_session, engine, Base
from app.models import User, Event, Video
from app.report_service import generate_pdf_report, generate_csv_report


class TestReportService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        self.db = get_db_session()
        test_user = self.db.query(User).filter(User.email == "test_report@example.com").first()
        if not test_user:
            test_user = User(
                name="Report Test User",
                email="test_report@example.com",
                password_hash="fakehash",
            )
            self.db.add(test_user)
            self.db.commit()
            self.db.refresh(test_user)

        self.user_id = test_user.id

        with self.client.session_transaction() as sess:
            sess["user_id"] = self.user_id

        # Sample synthetic events
        self.sample_events = [
            {
                "id": 101,
                "video_id": 1,
                "video_title": "front_porch.mp4",
                "track_id": 5,
                "event_type": "overspeed_vehicle",
                "label": "car",
                "timestamp_seconds": 12.5,
                "confidence": 0.94,
                "is_alert": True,
                "metadata": {
                    "estimated_speed_kmh": 42.5,
                    "speed_limit_kmh": 30.0,
                    "speed_status": "OVERSPEED",
                },
                "created_at": "2026-08-11T10:00:00",
            },
            {
                "id": 102,
                "video_id": 1,
                "video_title": "front_porch.mp4",
                "track_id": 8,
                "event_type": "unknown_person",
                "label": "person",
                "timestamp_seconds": 15.0,
                "confidence": 0.88,
                "is_alert": True,
                "metadata": {
                    "face_match_status": "unknown",
                },
                "created_at": "2026-08-11T10:00:05",
            },
        ]

    def test_generate_pdf_report_bytes(self):
        pdf_bytes = generate_pdf_report(self.sample_events, {"scope_description": "Test Scope"})
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(len(pdf_bytes) > 0)
        # PDF binary files start with header %PDF
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_generate_csv_report_string(self):
        csv_str = generate_csv_report(self.sample_events)
        self.assertIsInstance(csv_str, str)
        self.assertIn("Event ID", csv_str)
        self.assertIn("front_porch.mp4", csv_str)
        self.assertIn("OVERSPEED", csv_str)

    def test_download_pdf_endpoint(self):
        response = self.client.get("/api/reports/pdf")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "application/pdf")
        self.assertIn("attachment; filename=", response.headers.get("Content-Disposition", ""))

    def test_download_csv_endpoint(self):
        response = self.client.get("/api/reports/csv")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "text/csv")
        self.assertIn("attachment; filename=", response.headers.get("Content-Disposition", ""))


if __name__ == "__main__":
    unittest.main()
