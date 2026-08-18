import requests
import json
import os
import time

API_BASE = "http://localhost:5000"
session = requests.Session()

print("==========================================================")
print("=== COMPREHENSIVE END-TO-END VERIFICATION TEST ===")
print("==========================================================")

# 1. Login as sara@gmail.com
print("\n[1] Logging in as sara@gmail.com...")
res_login = session.post(f"{API_BASE}/api/auth/login", json={"email": "sara@gmail.com", "password": "sara123"})
print("  Login response status:", res_login.status_code)
assert res_login.status_code == 200, "Login failed!"

# 2. Check initial active calibration config
print("\n[2] Fetching initial active camera calibration config...")
res_cfg_init = session.get(f"{API_BASE}/api/config/camera-calibration")
init_cfg = res_cfg_init.json().get("calibration", {})
print("  Initial Active Video ID:", init_cfg.get("active_video_id"))
print("  Initial Active Filename:", init_cfg.get("active_filename"))

# 3. Upload new video with enable_site_calibration = true
print("\n[3] Uploading new video with auto-calibration checked...")
sample_video = os.path.abspath(r"storage\uploads\videos\Labeled_test_video_bcda33d63358.mp4")

with open(sample_video, "rb") as f:
    files = {"videos": ("Verification_Run_AutoCalib.mp4", f, "video/mp4")}
    data = {"enable_site_calibration": "true"}
    res_upload = session.post(f"{API_BASE}/api/videos/upload", files=files, data=data)

print("  Upload API response status:", res_upload.status_code)
assert res_upload.status_code == 200, "Upload failed!"

upload_result = res_upload.json().get("results", [{}])[0]
new_video_id = upload_result.get("video_id")
new_batch_id = upload_result.get("batch_id")
print(f"  Uploaded New Video ID: {new_video_id}, Batch ID: {new_batch_id}")

# 4. Poll until video processing finishes
print(f"\n[4] Waiting for Video #{new_video_id} site calibration & background processing...")
status = "queued"
for i in range(30):
    time.sleep(2)
    res_st = session.get(f"{API_BASE}/api/videos/{new_video_id}/status")
    if res_st.status_code == 200:
        st_data = res_st.json()
        status = st_data.get("status")
        msg = st_data.get("message")
        print(f"  [{i*2}s] Status: {status} | Msg: {msg}")
        if status in ("completed", "failed"):
            break

assert status == "completed", f"Video processing ended with status: {status}"

# 5. Fetch updated active camera calibration config
print("\n[5] Fetching updated active camera calibration config...")
res_cfg_updated = session.get(f"{API_BASE}/api/config/camera-calibration")
updated_cfg = res_cfg_updated.json().get("calibration", {})
active_video_id = updated_cfg.get("active_video_id")
active_filename = updated_cfg.get("active_filename")

print(f"  Updated Active Video ID: {active_video_id}")
print(f"  Updated Active Filename: {active_filename}")

# 6. Fetch video logs (as done by CameraCalibrationPanel.jsx)
print("\n[6] Fetching all video logs for Speed Configuration panel...")
res_logs = session.get(f"{API_BASE}/api/videos/logs")
logs = res_logs.json().get("logs", [])
calibrated_cards = [v for v in logs if v.get("has_standalone_site_calibration")]

print(f"  Total standalone site cards in gallery: {len(calibrated_cards)}")

active_card_matches = []
for idx, card in enumerate(calibrated_cards):
    vid_id = card.get("video_id") or card.get("id")
    batch_num = card.get("user_seq_batch_num") or card.get("batch_id")
    filename = card.get("original_filename")
    
    is_active = bool(
        updated_cfg and (
            (active_video_id and str(active_video_id) == str(vid_id)) or
            (updated_cfg.get("active_batch_id") and str(updated_cfg.get("active_batch_id")) == str(batch_num)) or
            (not active_video_id and not updated_cfg.get("active_batch_id") and idx == 0)
        )
    )
    
    if is_active:
        active_card_matches.append(card)
        print(f"  [CARD #{idx+1} MATCH] Video ID: {vid_id}, Batch ID: {batch_num}, Filename: '{filename}' -> HAS ACTIVE BADGE!")
    else:
        # Print first 3 non-active cards as sanity check
        if idx < 3:
            print(f"  [CARD #{idx+1} NORMAL] Video ID: {vid_id}, Batch ID: {batch_num}, Filename: '{filename}' -> No active badge")

# 7. Assertions
print("\n[7] Running strict verification assertions...")
assert len(active_card_matches) == 1, f"Expected EXACTLY 1 active card, but found {len(active_card_matches)}"
active_card = active_card_matches[0]
active_card_vid = active_card.get("video_id") or active_card.get("id")

assert str(active_card_vid) == str(new_video_id), f"Active card Video ID {active_card_vid} does not match newly uploaded Video ID {new_video_id}!"
print(f"  VERIFIED: Active badge is attached ONLY to newly uploaded Video #{new_video_id} ('{active_card.get('original_filename')}')!")

# 8. Check visual diagnostic image URL endpoint
diag_url = f"{API_BASE}/api/videos/{new_video_id}/calibration-diagnostic"
res_diag = session.get(diag_url)
print(f"\n[8] Checking Calibration Diagnostic Image URL ({diag_url})...")
print(f"  HTTP Status: {res_diag.status_code}, Content-Type: {res_diag.headers.get('Content-Type')}, Size: {len(res_diag.content)} bytes")
assert res_diag.status_code == 200, "Diagnostic image URL returned non-200 status!"
assert len(res_diag.content) > 1000, "Diagnostic image content is empty!"

print("\n==========================================================")
print("=== VERIFICATION COMPLETE: ALL CHECKS PASSED 100% SUCCESS ===")
print("==========================================================")
