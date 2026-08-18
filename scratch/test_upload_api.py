import requests
import json
import os
import sys

# Test session login and upload
session = requests.Session()

# 1. Login as sara@gmail.com
login_url = "http://localhost:5000/api/auth/login"
login_res = session.post(login_url, json={"email": "sara@gmail.com", "password": "sara"})
print("Login status:", login_res.status_code, login_res.json())

# 2. Upload video with enable_site_calibration = true
upload_url = "http://localhost:5000/api/videos/upload"
sample_video = os.path.abspath(r"storage\uploads\videos\Labeled_test_video_bcda33d63358.mp4")

with open(sample_video, "rb") as f:
    files = {"videos": ("Test_UI_Upload.mp4", f, "video/mp4")}
    data = {"enable_site_calibration": "true"}
    upload_res = session.post(upload_url, files=files, data=data)

print("Upload API response:", upload_res.status_code, upload_res.json())
batch_id = upload_res.json().get("batch_id")
video_id = upload_res.json().get("results", [{}])[0].get("video_id")

print(f"Uploaded Video ID: {video_id}, Batch ID: {batch_id}")

# 3. Wait 10 seconds for worker to process
print("Waiting for background worker processing...")
import time
for i in range(15):
    time.sleep(2)
    logs_res = session.get("http://localhost:5000/api/videos/logs")
    logs = logs_res.json().get("logs", [])
    vid = next((v for v in logs if (v.get("video_id") or v.get("id")) == video_id), None)
    if vid:
        print(f"[{i*2}s] Video {video_id} status: {vid.get('status')}, message: {vid.get('message')}, has_standalone: {vid.get('has_standalone_site_calibration')}")
        if vid.get("status") in ("completed", "failed"):
            print("Processing finished!")
            print("Full video details:", json.dumps(vid, indent=2))
            break
