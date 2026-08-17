from flask import Blueprint, jsonify, request, session

from app.auth.service import login_required
from app.db import get_db_session
from app.repositories import (
    ProcessingLogRepository,
    UploadBatchRepository,
    VideoRepository,
)
from app.videos.service import VideoService

videos_bp = Blueprint("videos", __name__, url_prefix="/api/videos")


@videos_bp.route("/upload", methods=["POST"])
@login_required
def upload_videos():
    files = request.files.getlist("videos")
    user_id = session.get("user_id")
    enable_site_calibration = request.form.get("enable_site_calibration", "false").lower() in ("true", "1", "yes")

    if not files:
        return jsonify({"error": "No video files provided"}), 400

    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    video_service = VideoService()
    upload_result = video_service.process_uploaded_videos(
        user_id=user_id,
        files=files,
        enable_site_calibration=enable_site_calibration
    )

    results = upload_result["results"]
    batch_id = upload_result["batch_id"]

    success_count = sum(1 for item in results if item.get("success"))
    failure_count = sum(1 for item in results if not item.get("success"))

    return jsonify({
        "message": "Video upload processing completed",
        "batch_id": batch_id,
        "success_count": success_count,
        "failure_count": failure_count,
        "results": results,
    }), 200


@videos_bp.route("", methods=["GET"])
@login_required
def list_current_batch_videos():
    user_id = session.get("user_id")
    db = get_db_session()

    try:
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        batch_repo = UploadBatchRepository(db)
        video_repo = VideoRepository(db)
        log_repo = ProcessingLogRepository(db)

        latest_batch = batch_repo.get_latest_batch_for_user(user_id)
        if not latest_batch:
            return jsonify([]), 200

        videos = video_repo.get_videos_by_batch_id(latest_batch.id)

        import re
        output = []
        for video in videos:
            log = log_repo.get_log_by_video_id(video.id)
            status = log.status if log else None
            msg = log.message if log else None
            progress = 0
            if (status or "").lower() == "completed":
                progress = 100
            elif (status or "").lower() == "processing":
                if msg and "%" in msg:
                    match = re.search(r"(\d+)%", msg)
                    if match:
                        progress = int(match.group(1))
                if progress == 0:
                    progress = 10

            output.append({
                "id": video.id,
                "batch_id": video.batch_id,
                "original_filename": video.original_filename,
                "stored_path": video.stored_path,
                "uploaded_at": str(video.uploaded_at) if video.uploaded_at else None,
                "status": status,
                "message": msg,
                "progress_percent": progress,
            })

        return jsonify(output), 200
    finally:
        db.close()


@videos_bp.route("/<int:video_id>/status", methods=["GET"])
@login_required
def get_video_status(video_id):
    user_id = session.get("user_id")
    db = get_db_session()

    try:
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        batch_repo = UploadBatchRepository(db)
        video_repo = VideoRepository(db)
        log_repo = ProcessingLogRepository(db)

        latest_batch = batch_repo.get_latest_batch_for_user(user_id)
        if not latest_batch:
            return jsonify({"error": "No upload batch found for this user"}), 404

        video = video_repo.get_video_by_id(video_id)
        if not video or video.batch_id != latest_batch.id:
            return jsonify({"error": "Video not found"}), 404

        log = log_repo.get_log_by_video_id(video.id)

        return jsonify({
            "video_id": video.id,
            "batch_id": video.batch_id,
            "original_filename": video.original_filename,
            "status": log.status if log else None,
            "message": log.message if log else None,
        }), 200
    finally:
        db.close()


@videos_bp.route("/logs", methods=["GET"])
@login_required
def list_all_video_logs():
    """
    Day 5: Return complete list of historical video processing logs with telemetry stats for active user.
    """
    user_id = session.get("user_id")
    db = get_db_session()
    try:
        video_repo = VideoRepository(db)
        logs_data = video_repo.get_all_videos_with_stats(user_id=user_id)
        return jsonify({"status": "success", "logs": logs_data}), 200
    finally:
        db.close()


@videos_bp.route("/logs/<int:video_id>", methods=["DELETE"])
@login_required
def delete_video_log(video_id):
    """
    Day 5: Permanently delete a video processing run belonging to user, cascading deletion.
    """
    user_id = session.get("user_id")
    db = get_db_session()
    try:
        video_repo = VideoRepository(db)
        success = video_repo.delete_video_cascade(video_id, user_id=user_id)
        if not success:
            return jsonify({"status": "error", "message": f"Video run #{video_id} not found."}), 404
        return jsonify({"status": "success", "message": f"Video run #{video_id} deleted successfully."}), 200
    finally:
        db.close()


@videos_bp.route("/<int:video_id>/calibration-diagnostic", methods=["GET"])
@login_required
def get_calibration_diagnostic_image(video_id):
    user_id = session.get("user_id")
    db = get_db_session()
    try:
        video_repo = VideoRepository(db)
        video = video_repo.get_video_by_id(video_id, user_id=user_id)
        if not video or not video.calibration_diagnostic_path:
            return jsonify({"error": "Diagnostic image not found"}), 404

        import os
        from flask import send_file
        abs_path = os.path.abspath(video.calibration_diagnostic_path)
        if not os.path.exists(abs_path):
            return jsonify({"error": "Diagnostic file missing on disk"}), 404
        return send_file(abs_path, mimetype="image/jpeg")
    finally:
        db.close()