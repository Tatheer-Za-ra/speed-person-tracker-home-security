import requests
import json
import os
import time

API_BASE = "http://localhost:5000"
session = requests.Session()

print("=== STARTING FULL HTTP WEB BROWSER SIMULATION ===")

# 1. Login
print("\n[Step 1] Logging in as sara@gmail.com...")
res_login = session.post(f"{API_BASE}/api/auth/login", json={"email": "sara@gmail.com", "password": "sara123"})
print("Login status:", res_login.status_code, res_login.json())
assert res_login.status_code == 200, "Login failed!"

# 2. Upload video with enable_site_calibration = true
print("\n[Step 2] Uploading video with 'enable_site_calibration = true'...")
sample_video = os.path.abspath(r"storage\uploads\videos\Labeled_test_video_bcda33d63358.mp4")

with open(sample_video, "rb") as f:
    files = {"videos": ("Test_Browser_Upload_SiteCalib.mp4", f, "video/mp4")}
    data = {"enable_site_calibration": "true"}
    res_upload = session.post(f"{API_BASE}/api/videos/upload", files=files, data=data)

print("Upload response:", res_upload.status_code, res_upload.json())
assert res_upload.status_code == 200, "Upload failed!"

upload_result = res_upload.json().get("results", [{}])[0]
video_id = upload_result.get("video_id")
print(f"Uploaded Video ID: {video_id}")

# 3. Wait for background processing to complete
print("\n[Step 3] Polling video status until processing completes...")
status = "queued"
for i in range(25):
    time.sleep(2)
    res_status = session.get(f"{API_BASE}/api/videos/{video_id}/status")
    if res_status.status_code == 200:
        s_data = res_status.json()
        status = s_data.get("status")
        print(f"  [{i*2}s] Video {video_id} status: {status}, message: {s_data.get('message')}")
        if status in ("completed", "failed"):
            break

assert status == "completed", f"Video processing failed with status {status}!"

# 4. Fetch listAllVideoLogs (as done by CameraCalibrationPanel.jsx & EventDetailsPage.jsx)
print("\n[Step 4] Fetching listAllVideoLogs (GET /api/videos/logs)...")
res_logs = session.get(f"{API_BASE}/api/videos/logs")
print("Logs API status:", res_logs.status_code)
logs_data = res_logs.json().get("logs", [])
print(f"Total video logs returned: {len(logs_data)}")

# Find uploaded video in logs
uploaded_log = next((v for v in logs_data if str(v.get("video_id") or v.get("id")) == str(video_id)), None)
print("\n[Uploaded Video Log Details]:")
print("  - video_id:", uploaded_log.get("video_id"))
print("  - original_filename:", uploaded_log.get("original_filename"))
print("  - has_standalone_site_calibration:", uploaded_log.get("has_standalone_site_calibration"))
print("  - is_active_profile_fallback:", uploaded_log.get("is_active_profile_fallback"))
print("  - calibration_diagnostic_url:", uploaded_log.get("calibration_diagnostic_url"))
print("  - site_calibration:", json.dumps(uploaded_log.get("site_calibration"), indent=4))

# 5. Check Speed Configuration Cards Filter (as done by CameraCalibrationPanel.jsx)
print("\n[Step 5] Checking Speed Configuration Panel filter...")
calibrated_cards = [v for v in logs_data if v.get("has_standalone_site_calibration")]
print(f"Total cards on Speed Config page: {len(calibrated_cards)}")
card_match = next((v for v in calibrated_cards if str(v.get("video_id")) == str(video_id)), None)

if card_match:
    print("SUCCESS: The newly uploaded video IS displayed as a card on Speed Configuration page!")
else:
    print("ERROR: Newly uploaded video was NOT found in Speed Configuration cards!")

# 6. Fetch Calibration Diagnostic Image URL (as done by CalibrationDiagnosticModal.jsx)
print("\n[Step 6] Fetching Calibration Diagnostic Image URL...")
diag_url = f"{API_BASE}{uploaded_log.get('calibration_diagnostic_url')}"
res_img = session.get(diag_url)
print("Diagnostic Image HTTP status:", res_img.status_code, "ContentType:", res_img.headers.get("Content-Type"), "ContentLength:", len(res_img.content))

if res_img.status_code == 200 and len(res_img.content) > 1000:
    print("SUCCESS: Diagnostic Image loaded cleanly!")
else:
    print("ERROR: Diagnostic Image failed to load!")

print("\n=== BROWSER SIMULATION FINISHED ===")
