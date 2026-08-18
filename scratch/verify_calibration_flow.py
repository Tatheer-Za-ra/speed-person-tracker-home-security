import os
import sys
import time
import json

# Add backend and root to path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from app.db import get_db_session
from app.models import Video, ProcessingLog, UploadBatch, User
from app.repositories import VideoRepository, ProcessingLogRepository, UploadBatchRepository
from app.processing.worker import ProcessingWorker
from app.videos.service import VideoService
from app.config_routes import get_camera_calibration_config

def run_test():
    print("=== STARTING AUTOMATED CALIBRATION VERIFICATION TEST ===")
    db = get_db_session()
    worker = ProcessingWorker()
    try:
        # Find user sara (User ID 7) or fallback to 1
        user = db.query(User).filter(User.email == "sara@gmail.com").first()
        user_id = user.id if user else 1
        print(f"Testing for User ID: {user_id}")

        # Find sample video to simulate upload
        sample_video_path = os.path.abspath(r"storage\uploads\videos\Labeled_test_video_bcda33d63358.mp4")

        batch_repo = UploadBatchRepository(db)
        video_repo = VideoRepository(db)
        log_repo = ProcessingLogRepository(db)

        # -------------------------------------------------------------
        # TEST CASE 1: Upload WITH enable_site_calibration = True
        # -------------------------------------------------------------
        print("\n--- TEST CASE 1: Upload WITH enable_site_calibration = True ---")
        batch1 = batch_repo.create_batch(user_id=user_id)
        video1 = video_repo.create_video(
            batch_id=batch1.id,
            original_filename="Test_AutoCalib_Site1.mp4",
            stored_path=sample_video_path
        )
        log_repo.create_log(
            video_id=video1.id,
            status="queued",
            message="Video uploaded and queued for site calibration & processing"
        )
        print(f"Created Video ID {video1.id} with site calibration requested.")

        # Execute background processing worker for video1
        print(f"Processing Video ID {video1.id}...")
        res1 = worker.process_next_queued_video()
        print(f"Worker output: {res1}")

        # Refresh video1 record
        db.refresh(video1)
        print(f"Video {video1.id} site_calibration_json present: {bool(video1.site_calibration_json)}")
        print(f"Video {video1.id} calibration_diagnostic_path: {video1.calibration_diagnostic_path}")

        assert video1.site_calibration_json is not None, "FAILED: site_calibration_json is None!"
        assert video1.calibration_diagnostic_path is not None, "FAILED: calibration_diagnostic_path is None!"

        # -------------------------------------------------------------
        # TEST CASE 2: Upload WITHOUT enable_site_calibration (False)
        # -------------------------------------------------------------
        print("\n--- TEST CASE 2: Upload WITHOUT enable_site_calibration (False) ---")
        batch2 = batch_repo.create_batch(user_id=user_id)
        video2 = video_repo.create_video(
            batch_id=batch2.id,
            original_filename="Test_NoCalib_ExistingSite.mp4",
            stored_path=sample_video_path
        )
        log_repo.create_log(
            video_id=video2.id,
            status="queued",
            message="Video uploaded and queued for processing"
        )
        print(f"Created Video ID {video2.id} without site calibration requested.")

        # Execute background processing worker for video2
        print(f"Processing Video ID {video2.id}...")
        res2 = worker.process_next_queued_video()
        print(f"Worker output: {res2}")

        # Refresh video2 record
        db.refresh(video2)
        print(f"Video {video2.id} site_calibration_json present: {bool(video2.site_calibration_json)}")
        print(f"Video {video2.id} calibration_diagnostic_path: {video2.calibration_diagnostic_path}")

        assert video2.site_calibration_json is None, "FAILED: site_calibration_json should be None!"
        assert video2.calibration_diagnostic_path is None, "FAILED: calibration_diagnostic_path should be None!"

        # -------------------------------------------------------------
        # TEST CASE 3: Verify API Output for Speed Config & View Map
        # -------------------------------------------------------------
        print("\n--- TEST CASE 3: Verify API output scoping & fallback ---")
        logs = video_repo.get_all_videos_with_stats(user_id=user_id)
        
        item1 = next((v for v in logs if v["video_id"] == video1.id), None)
        item2 = next((v for v in logs if v["video_id"] == video2.id), None)

        print("\nVideo 1 (Auto-Calibrated) API Output:")
        print(f"  - has_standalone_site_calibration: {item1['has_standalone_site_calibration']}")
        print(f"  - is_active_profile_fallback: {item1['is_active_profile_fallback']}")
        print(f"  - site_calibration preset: {item1['site_calibration'].get('preset')}")

        print("\nVideo 2 (Unchecked Auto-Calib) API Output:")
        print(f"  - has_standalone_site_calibration: {item2['has_standalone_site_calibration']}")
        print(f"  - is_active_profile_fallback: {item2['is_active_profile_fallback']}")
        print(f"  - site_calibration height: {item2['site_calibration'].get('camera_height_m')}")

        assert item1['has_standalone_site_calibration'] == True, "FAILED: item1 should have standalone site calibration"
        assert item2['has_standalone_site_calibration'] == False, "FAILED: item2 should NOT have standalone site calibration"
        assert item2['is_active_profile_fallback'] == True, "FAILED: item2 should have active profile fallback"

        print("\n✅ ALL E2E CALIBRATION TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    run_test()
