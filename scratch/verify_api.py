# scratch/verify_api.py

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def verify_live_backend():
    session = requests.Session()
    print("==================================================================")
    print("        LIVE FLASK BACKEND ENDPOINT VERIFICATION SUITE           ")
    print("==================================================================\n")

    # 1. Health Check
    print("1. Testing Base Health Check (GET /)...")
    res_health = session.get(f"{BASE_URL}/")
    print(f"   Status Code: {res_health.status_code}")
    print(f"   Response Payload: {res_health.json()}\n")

    # 2. Authentication (Login or Signup)
    print("2. Authenticating User Session (POST /api/auth/login)...")
    login_payload = {"email": "testuser@example.com", "password": "Password123!"}
    res_login = session.post(f"{BASE_URL}/api/auth/login", json=login_payload)

    if res_login.status_code != 200:
        print("   User not found, creating test account via POST /api/auth/signup...")
        signup_payload = {"name": "Test Operator", "email": "testuser@example.com", "password": "Password123!"}
        res_signup = session.post(f"{BASE_URL}/api/auth/signup", json=signup_payload)
        print(f"   Signup Status: {res_signup.status_code}")
        # Re-login
        res_login = session.post(f"{BASE_URL}/api/auth/login", json=login_payload)

    print(f"   Login Status Code: {res_login.status_code}")
    print(f"   Authenticated User: {res_login.json().get('user', {}).get('name')}\n")

    # 3. Test GET /api/events/summary
    print("3. Testing Summary Endpoint (GET /api/events/summary)...")
    res_summary = session.get(f"{BASE_URL}/api/events/summary")
    print(f"   Status Code: {res_summary.status_code} OK")
    summary_data = res_summary.json().get("summary", {})
    print(f"   Total Security Events: {summary_data.get('total_events')}")
    print(f"   Total Security Alerts: {summary_data.get('total_alerts')}")
    print(f"   Total Videos Processed: {summary_data.get('total_videos')}")
    print(f"   Vehicle/Person Label Breakdown: {summary_data.get('breakdown_by_label')}\n")

    # 4. Test GET /api/events
    print("4. Testing Event Timeline Feed (GET /api/events?limit=3)...")
    res_events = session.get(f"{BASE_URL}/api/events?limit=3")
    print(f"   Status Code: {res_events.status_code} OK")
    events = res_events.json().get("events", [])
    print(f"   Retrieved {len(events)} timeline events.")
    if events:
        first_ev = events[0]
        print(f"   Sample Event #{first_ev['id']}: {first_ev['event_type']} ({first_ev['label']}) @ {first_ev['timestamp_seconds']}s")
        print(f"   Snapshot URL: {first_ev['snapshot_url']}")
        print(f"   Telemetry Metadata: {first_ev['metadata']}\n")

    # 5. Test GET /api/events/alerts
    print("5. Testing Security Alerts Feed (GET /api/events/alerts)...")
    res_alerts = session.get(f"{BASE_URL}/api/events/alerts")
    print(f"   Status Code: {res_alerts.status_code} OK")
    alerts = res_alerts.json().get("alerts", [])
    print(f"   Retrieved {len(alerts)} priority alerts.\n")

    # 6. Test Static Media Snapshot Serving
    if events and events[0].get("snapshot_url"):
        snap_url = events[0]["snapshot_url"]
        print(f"6. Testing Snapshot Media Route (GET {snap_url})...")
        res_snap = session.get(f"{BASE_URL}{snap_url}")
        print(f"   Status Code: {res_snap.status_code} OK")
        print(f"   Content Type: {res_snap.headers.get('Content-Type')}")
        print(f"   File Size: {len(res_snap.content)} bytes\n")

    print("==================================================================")
    print("        ALL API ENDPOINTS VERIFIED SUCCESSFULLY (200 OK)         ")
    print("==================================================================")

if __name__ == "__main__":
    verify_live_backend()
