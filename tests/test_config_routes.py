# tests/test_config_routes.py

import unittest
import json
from app import create_app
from app.db import get_db_session, engine, Base
from app.models import SpeedThreshold, User


class TestConfigRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure database tables exist
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        # Create a test user in DB if not existing
        self.db = get_db_session()
        test_user = self.db.query(User).filter(User.email == "test_config@example.com").first()
        if not test_user:
            test_user = User(
                name="Test User",
                email="test_config@example.com",
                password_hash="fakehash",
            )
            self.db.add(test_user)
            self.db.commit()
            self.db.refresh(test_user)

        self.user_id = test_user.id

        # Authenticate session
        with self.client.session_transaction() as sess:
            sess["user_id"] = self.user_id

    def test_get_speed_thresholds_defaults(self):
        response = self.client.get("/api/config/speed-thresholds")
        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertIn("thresholds", data)
        thresholds = data["thresholds"]
        self.assertIn("car", thresholds)
        self.assertIn("motorcycle", thresholds)
        self.assertIn("truck", thresholds)

    def test_update_speed_thresholds_valid(self):
        payload = {
            "car": 35.0,
            "motorcycle": 45.0,
            "truck": 20.0,
        }
        response = self.client.put(
            "/api/config/speed-thresholds",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["thresholds"]["car"], 35.0)
        self.assertEqual(data["thresholds"]["motorcycle"], 45.0)
        self.assertEqual(data["thresholds"]["truck"], 20.0)

    def test_update_speed_thresholds_invalid_values(self):
        # Negative limit
        response = self.client.put(
            "/api/config/speed-thresholds",
            data=json.dumps({"car": -10.0}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "error")

        # Non-numeric limit
        response = self.client.put(
            "/api/config/speed-thresholds",
            data=json.dumps({"car": "invalid_speed"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
