import os
import sys
import json

# Ensure paths
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(workspace_root, "backend")

if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db import SessionLocal
from app.models import Video, UploadBatch
from tools.site_calibration_trainer import SiteCalibrationTrainer
from app.config_routes import set_camera_calibration_config

def calibrate_video(video_id=356):
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            print(f"Error: Video {video_id} not found.")
            return

        batch = db.query(UploadBatch).filter(UploadBatch.id == video.batch_id).first()
        user_id = batch.user_id if batch else None

        print(f"Training calibration for video {video.id} ({video.original_filename})...")
        print(f"Stored path: {video.stored_path}")

        trainer = SiteCalibrationTrainer(video.stored_path)
        diag_filename = f"calib_diag_video_{video.id}.jpg"
        snapshots_dir = os.path.join(workspace_root, "storage", "snapshots")
        os.makedirs(snapshots_dir, exist_ok=True)
        diag_path = os.path.join(snapshots_dir, diag_filename)

        calib_profile = trainer.train_and_calibrate(
            save_to_db=False,
            user_id=user_id,
            output_diag=diag_path
        )

        calib_profile["active_video_id"] = video.id
        calib_profile["active_filename"] = video.original_filename

        video.site_calibration_json = json.dumps(calib_profile)
        video.calibration_diagnostic_path = diag_path
        db.commit()

        # Also set active config
        set_camera_calibration_config(db, calib_profile, user_id=user_id)

        print("SUCCESS!")
        print(f"Diagnostic saved to: {diag_path} (exists: {os.path.exists(diag_path)})")
        print(f"Profile: {json.dumps(calib_profile, indent=2)}")
    finally:
        db.close()

if __name__ == "__main__":
    vid_id = int(sys.argv[1]) if len(sys.argv) > 1 else 356
    calibrate_video(vid_id)
