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


class VideoService:
    def __init__(self):
        self.allowed_extensions = Config.ALLOWED_VIDEO_EXTENSIONS
        self.upload_dir = Config.UPLOAD_DIR

    def process_uploaded_videos(self, user_id: int, files):
        db = get_db_session()
        try:
            batch_repo = UploadBatchRepository(db)
            batch = batch_repo.create_batch(user_id=user_id)

            results = []

            for file in files:
                result = self._process_single_file(db, batch.id, file)
                results.append(result)

            return {
                "batch_id": batch.id,
                "results": results,
            }
        finally:
            db.close()

    def _process_single_file(self, db, batch_id, file):
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

            video_repo = VideoRepository(db)
            log_repo = ProcessingLogRepository(db)

            video = video_repo.create_video(
                batch_id=batch_id,
                original_filename=file.filename,
                stored_path=saved_path,
            )

            log_repo.create_log(
                video_id=video.id,
                status="queued",
                message="Video uploaded and queued for processing",
            )

            return {
                "success": True,
                "filename": file.filename,
                "video_id": video.id,
                "batch_id": batch_id,
                "stored_path": video.stored_path,
                "status": "queued",
            }

        except Exception as e:
            return {
                "success": False,
                "filename": file.filename,
                "batch_id": batch_id,
                "error": str(e),
            }