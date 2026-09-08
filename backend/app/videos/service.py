from datetime import datetime, timedelta
import cv2

from app.config import Config
from app.db import get_db_session
from app.repositories import (
    ProcessingLogRepository,
    UploadBatchRepository,
    VideoRepository,
)
from app.videos.utils import (
    allowed_video,
    generate_unique_video_filename,
    save_video_file,
)


def parse_start_time(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    val_str = str(val).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(val_str, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(val_str)
    except Exception:
        return None


def extract_video_duration(path: str) -> float:
    """Extract duration in seconds from video file via OpenCV."""
    dur = 0.0
    cap = None
    try:
        cap = cv2.VideoCapture(path)
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
            frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0
            if fps > 0 and frame_count > 0:
                dur = float(frame_count / fps)
    except Exception as ex:
        print(f"[VideoService] Video duration probe error: {ex}")
    finally:
        if cap is not None:
            cap.release()
    return dur


class VideoService:
    def __init__(self):
        self.allowed_extensions = Config.ALLOWED_VIDEO_EXTENSIONS
        self.upload_dir = Config.UPLOAD_DIR

    def process_uploaded_videos(
        self,
        user_id: int,
        files,
        enable_site_calibration: bool = False,
        is_continuous: bool = False,
        start_times: dict | None = None,
        single_start_time: str | None = None,
    ):
        db = get_db_session()
        try:
            batch_repo = UploadBatchRepository(db)
            batch = batch_repo.create_batch(user_id=user_id)

            results = []
            start_times = start_times or {}

            # Timing tracker for continuous batch chaining
            chained_start_time = None
            chained_duration = 0.0

            for idx, file in enumerate(files):
                # Determine intended start time for this specific file
                file_start_time = None
                if is_continuous:
                    if idx == 0:
                        raw_t0 = start_times.get("0") or start_times.get(0) or single_start_time
                        chained_start_time = parse_start_time(raw_t0) or datetime.now()
                        file_start_time = chained_start_time
                    else:
                        # Auto-chain: Previous Video Start Time + Previous Video Duration
                        if chained_start_time is not None:
                            chained_start_time = chained_start_time + timedelta(seconds=chained_duration)
                            file_start_time = chained_start_time
                        else:
                            file_start_time = datetime.now()
                else:
                    # Non-continuous: Lookup explicit start time for index idx or single_start_time fallback
                    raw_ti = start_times.get(str(idx)) or start_times.get(idx) or single_start_time
                    file_start_time = parse_start_time(raw_ti) or datetime.now()

                result = self._process_single_file(
                    db,
                    batch.id,
                    file,
                    enable_site_calibration=enable_site_calibration,
                    recording_start_time=file_start_time,
                )
                results.append(result)

                # Keep duration for next continuous file chaining
                if result.get("success") and result.get("duration_seconds") is not None:
                    chained_duration = float(result["duration_seconds"])
                else:
                    chained_duration = 0.0

            return {
                "batch_id": batch.id,
                "results": results,
            }
        finally:
            db.close()

    def _process_single_file(
        self,
        db,
        batch_id,
        file,
        enable_site_calibration: bool = False,
        recording_start_time: datetime | None = None,
    ):
        if not file:
            return {
                "success": False,
                "filename": None,
                "error": "No file provided",
            }

        if not file.filename:
            return {
                "success": False,
                "filename": None,
                "error": "Empty filename",
            }

        if not allowed_video(file.filename, self.allowed_extensions):
            return {
                "success": False,
                "filename": file.filename,
                "error": "Invalid video format. Allowed: mp4, avi, mov, mkv",
            }

        try:
            stored_filename = generate_unique_video_filename(file.filename)
            saved_path = save_video_file(file, self.upload_dir, stored_filename)

            # Probe video duration using OpenCV
            dur = extract_video_duration(saved_path)

            video_repo = VideoRepository(db)
            log_repo = ProcessingLogRepository(db)

            video = video_repo.create_video(
                batch_id=batch_id,
                original_filename=file.filename,
                stored_path=saved_path,
                recording_start_time=recording_start_time,
                duration_seconds=dur,
            )

            msg = "Video uploaded and queued for processing"
            if enable_site_calibration:
                msg = "Video uploaded and queued for site calibration & processing"

            log_repo.create_log(
                video_id=video.id,
                status="queued",
                message=msg,
            )

            return {
                "success": True,
                "filename": file.filename,
                "video_id": video.id,
                "batch_id": batch_id,
                "stored_path": video.stored_path,
                "recording_start_time": recording_start_time.isoformat() if recording_start_time else None,
                "duration_seconds": dur,
                "status": "queued",
            }

        except Exception as e:
            return {
                "success": False,
                "filename": file.filename,
                "batch_id": batch_id,
                "error": str(e),
            }