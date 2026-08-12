from datetime import datetime
import json

from app.db import get_db_session
from app.repositories import ProcessingLogRepository, VideoRepository, EventRepository, SnapshotRepository, SpeedThresholdRepository, UploadBatchRepository
from app.ai_pipeline.pipeline_service import analyze_video_frames
import cv2
from app.ai_pipeline.event_snapshot import save_event_snapshot

class ProcessingWorker:
    def process_next_queued_video(self):
        db = get_db_session()
        try:
            video_repo = VideoRepository(db)
            log_repo = ProcessingLogRepository(db)
            event_repo = EventRepository(db)
            snapshot_repo = SnapshotRepository(db)
            speed_repo = SpeedThresholdRepository(db)
            batch_repo = UploadBatchRepository(db)

            videos = video_repo.get_all_videos()

            queued_log = None
            queued_video = None

            for video in videos:
                log = log_repo.get_log_by_video_id(video.id)
                if log and log.status == "queued":
                    queued_log = log
                    queued_video = video
                    break

            if not queued_log or not queued_video:
                return {"message": "No queued videos found"}

            try:
                queued_log.status = "processing"
                queued_log.message = "Raw frame processing and tracking started"
                queued_log.started_at = datetime.now()
                db.commit()

                # Determine user_id from batch for speed limits
                batch = batch_repo.get_latest_batch_for_user(1) if hasattr(batch_repo, 'get_latest_batch_for_user') else None
                user_id = batch.user_id if batch else 1
                speed_limits = speed_repo.get_threshold_map(user_id)

                from app.config_routes import get_camera_calibration_config
                camera_params = get_camera_calibration_config(db)

                result = analyze_video_frames(
                    queued_video.stored_path,
                    speed_limits=speed_limits,
                    camera_params=camera_params
                )

                if result["status"] == "success":
                    created_events = []
                    for payload in result.get("event_payloads", []):
                        created_event = event_repo.create_event(
                            video_id=queued_video.id,
                            track_id=payload.get("track_id"),
                            event_type=payload.get("event_type"),
                            label=payload.get("label"),
                            timestamp_seconds=payload.get("timestamp_seconds"),
                            confidence=payload.get("confidence"),
                            metadata_json=payload.get("metadata_json"),
                            is_alert=payload.get("is_alert", False),
                        )
                        created_events.append(created_event)
                    track_counts = {
                        "person": 0,
                        "car": 0,
                        "motorcycle": 0,
                        "truck": 0,
                    }

                    created_snapshots = []

                    snapshot_payloads_by_track_id = {
                        payload["track_id"]: payload
                        for payload in result.get("snapshot_payloads", [])
                    }

                    cap = None
                    try:
                        cap = cv2.VideoCapture(queued_video.stored_path)
                        if cap.isOpened():
                            for created_event in created_events:
                                snapshot_payload = snapshot_payloads_by_track_id.get(created_event.track_id)
                                if not snapshot_payload:
                                    continue

                                raw_frame_index = snapshot_payload["raw_frame_index"]
                                bbox = snapshot_payload["bbox"]
                                label = snapshot_payload["label"]
                                timestamp_seconds = snapshot_payload["timestamp_seconds"]

                                cap.set(cv2.CAP_PROP_POS_FRAMES, raw_frame_index)
                                success, frame = cap.read()
                                if not success or frame is None:
                                    continue

                                extra_info = None
                                if created_event.metadata_json:
                                    try:
                                        meta = json.loads(created_event.metadata_json)
                                        if "estimated_speed_kmh" in meta:
                                            spd = meta["estimated_speed_kmh"]
                                            st = meta.get("speed_status", "")
                                            extra_info = f"{spd} km/h {st}".strip()
                                    except Exception:
                                        pass

                                snapshot_path = save_event_snapshot(
                                    video_id=queued_video.id,
                                    event_id=created_event.id,
                                    frame=frame,
                                    bbox=bbox,
                                    label=label,
                                    track_id=created_event.track_id,
                                    timestamp_seconds=timestamp_seconds,
                                    extra_info=extra_info,
                                    processed_size=(
                                        snapshot_payload.get("processed_width", 960),
                                        snapshot_payload.get("processed_height", 540),
                                    ),
                                )

                                created_snapshot = snapshot_repo.create_snapshot(
                                    event_id=created_event.id,
                                    file_path=snapshot_path,
                                )
                                created_snapshots.append(created_snapshot)
                    finally:
                        if cap is not None:
                            cap.release()

                    for track in result["tracks_summary"]:
                        class_name = track["class_name"]
                        if class_name in track_counts:
                            track_counts[class_name] += 1

                    stable_tracks_count = len(result["tracks_summary"])

                    queued_log.status = "completed"
                    queued_log.message = (
                        f"Detection and tracking completed successfully. "
                        f"Processed {result['processed_frames_count']} sampled frames, "
                        f"found {result['total_detections']} detections across "
                        f"{result['frames_with_detections_count']} frames. "
                        f"Detection counts - "
                        f"Persons: {result['detection_counts']['person']}, "
                        f"Cars: {result['detection_counts']['car']}, "
                        f"Motorcycles: {result['detection_counts']['motorcycle']}, "
                        f"Trucks: {result['detection_counts']['truck']}. "
                        f"Generated {stable_tracks_count} stable tracks. "
                        f"Stable track counts - "
                        f"Persons: {track_counts['person']}, "
                        f"Cars: {track_counts['car']}, "
                        f"Motorcycles: {track_counts['motorcycle']}, "
                        f"Trucks: {track_counts['truck']}. "
                        f"Created {len(created_events)} events. "
                        f"Saved {len(created_snapshots)} event snapshots. "
                        f"Saved {result['debug_frames_saved_count']} debug frames."
                    )
                    queued_log.completed_at = datetime.now()
                    db.commit()

                    return {
                        "message": "Processed one queued video successfully",
                        "video_id": queued_video.id,
                        "status": queued_log.status,
                        "processed_frames_count": result["processed_frames_count"],
                        "duration_seconds": result["duration_seconds"],
                        "total_detections": result["total_detections"],
                        "frames_with_detections_count": result["frames_with_detections_count"],
                        "detection_counts": result["detection_counts"],
                        "stable_tracks_count": stable_tracks_count,
                        "stable_track_counts": track_counts,
                        "events_created_count": len(created_events),
                        "snapshots_created_count": len(created_snapshots),
                        "debug_frames_saved_count": result["debug_frames_saved_count"],
                    }

                queued_log.status = "failed"
                queued_log.message = result.get("error", "Raw frame processing failed.")
                queued_log.completed_at = datetime.now()
                db.commit()

                return {
                    "message": "Processing failed",
                    "video_id": queued_video.id,
                    "status": queued_log.status,
                    "error": queued_log.message,
                }

            except Exception as e:
                queued_log.status = "failed"
                queued_log.message = f"Processing failed: {str(e)}"
                queued_log.completed_at = datetime.now()
                db.commit()

                return {
                    "message": "Processing failed",
                    "video_id": queued_video.id,
                    "status": queued_log.status,
                    "error": str(e),
                }

        finally:
            db.close()