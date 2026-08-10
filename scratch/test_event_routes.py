# scratch/test_event_routes.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.db import get_db_session

def test_routes():
    app = create_app()
    with app.test_client() as client:
        # Mock logged in session
        with client.session_transaction() as sess:
            sess["user_id"] = 1

        res_summary = client.get("/api/events/summary")
        print("Summary Response Code:", res_summary.status_code)
        print("Summary JSON Output:\n", json.dumps(res_summary.get_json(), indent=2))

        res_events = client.get("/api/events?limit=5")
        print("\nEvents Response Code:", res_events.status_code)
        print("Events JSON Output (Top 2):\n", json.dumps(res_events.get_json()["events"][:2], indent=2))

        res_alerts = client.get("/api/events/alerts?limit=5")
        print("\nAlerts Response Code:", res_alerts.status_code)
        print("Alerts JSON Output:\n", json.dumps(res_alerts.get_json(), indent=2))

if __name__ == "__main__":
    test_routes()
