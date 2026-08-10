
from app.ai_pipeline.config import (
    DEBUG_ANNOTATED_FRAMES_ENABLED,
    DEBUG_MAX_FRAMES_PER_VIDEO,
    TRACKING_ENABLED,
    CTD_ENABLED,
    CTD_MAX_FRAMES_WITHOUT_DETECTION,
)

from app.ai_pipeline.debug_visualizer import (
    save_annotated_frame,
    annotate_frame,
    ensure_debug_video_dir,
)
import cv2
#from app.ai_pipeline.detector import YoloDetector
from app.ai_pipeline.detector import create_detector
from app.ai_pipeline.tracker import VideoTracker
from app.ai_pipeline.frame_processor import (
    VideoLoaderError,
    iter_processed_frames,
    load_video_capture,
    release_video_capture,
)
from app.ai_pipeline import detector
import json
from app.ai_pipeline.face_pipeline import extract_faces_from_tracks

def _determine_event_type(class_name: str) -> str:
    if class_name == "person":
        return "person_detected"

    if class_name in {"car", "motorcycle", "truck"}:
        return "vehicle_detected"

    return "object_detected"


def _extract_event_confidence(track_summary: dict) -> float | None:
    bbox_history = track_summary.get("bbox_history", [])

    confidences = [
        item.get("confidence")
        for item in bbox_history
        if item.get("confidence") is not None
    ]

    if not confidences:
        return None

    return round(max(confidences), 4)


def _build_event_metadata(track_summary: dict) -> str:
    metadata = {
        "start_frame": track_summary.get("start_frame"),
        "end_frame": track_summary.get("end_frame"),
        "start_time_seconds": track_summary.get("start_time_seconds"),
        "end_time_seconds": track_summary.get("end_time_seconds"),
        "bbox_history_length": len(track_summary.get("bbox_history", [])),
    }

    return json.dumps(metadata)

def build_event_payloads(video_id: int, tracks_summary: list[dict]) -> list[dict]:
    event_payloads = []

    for track_summary in tracks_summary:
        class_name = track_summary.get("class_name")
        if not class_name:
            continue

        event_payloads.append(
            {
                "video_id": video_id,
                "track_id": track_summary.get("track_id"),
                "event_type": _determine_event_type(class_name),
                "label": class_name,
                "timestamp_seconds": track_summary.get("start_time_seconds"),
                "confidence": _extract_event_confidence(track_summary),
                "metadata_json": _build_event_metadata(track_summary),
                "is_alert": False,
            }
        )

    return event_payloads
def build_snapshot_payloads(video_id: int, tracks_summary: list[dict]) -> list[dict]:
    snapshot_payloads = []

    for track_summary in tracks_summary:
        bbox_history = track_summary.get("bbox_history", [])
        if not bbox_history:
            continue

        first_entry = bbox_history[0]

        snapshot_payloads.append(
            {
                "video_id": video_id,
                "track_id": track_summary.get("track_id"),
                "label": track_summary.get("class_name"),
                "timestamp_seconds": first_entry.get("timestamp_seconds"),
                "raw_frame_index": first_entry.get("raw_frame_index"),
                "processed_frame_index": first_entry.get("processed_frame_index"),                "bbox": first_entry.get("bbox"),
            }
        )

    return snapshot_payloads

def _decide_detection_run(
    tracker,
    detector_calls_count: int,
    frames_since_last_detection_run: int,
    frame_index: int,
):
    if not CTD_ENABLED:
        return True, "ctd_disabled"

    if tracker is None:
        return True, "no_tracker"

    if detector_calls_count == 0:
        return True, "first_frame"

    if not tracker.has_active_tracks(frame_index):
        return True, "no_active_tracks"

    if frames_since_last_detection_run >= CTD_MAX_FRAMES_WITHOUT_DETECTION:
        return True, "max_skip_reached"

    return False, "ctd_skipped"


def analyze_video_frames(video_path: str, preview_limit: int = 5, face_templates=None):
    """
    Day 10 pipeline runner (Chunk 1 foundation).

    It:
    - opens a video
    - reads metadata
    - iterates processed frames
    - runs YOLO inference on sampled frames
    - stores detections in memory for the current video
    - passes detections into tracking stage
    - returns structured detection + tracking placeholders

    No DB writes, no event creation yet.
    """
    cap = None

    try:
        cap, metadata = load_video_capture(video_path)
        release_video_capture(cap)
        cap = None

       # detector = YoloDetector()
        detector = create_detector()
        detector_backend_used = getattr(detector, "backend_name", "unknown")
        fallback_reason = getattr(detector, "fallback_reason", None)
        tracker = VideoTracker() if TRACKING_ENABLED else None

        processed_frames_count = 0
        frames_with_detections_count = 0

        detection_counts = {
            "person": 0,
            "car": 0,
            "motorcycle": 0,
            "truck": 0,
        }

        detections_by_frame = []
        tracked_frames = []
        tracks_summary = {}

        preview_frames = []
        saved_debug_frames = []
        debug_frames_saved_count = 0
        detector_calls_count = 0
        detector_skipped_frames_count = 0
        frames_since_last_detection_run = 0

        ctd_decision_counts = {
            "ctd_disabled": 0,
            "no_tracker": 0,
            "first_frame": 0,
            "no_active_tracks": 0,
            "max_skip_reached": 0,
            "ctd_skipped": 0,
        }

        for processed_frame in iter_processed_frames(video_path):
            processed_frames_count += 1

            should_run_detection, ctd_decision = _decide_detection_run(
                tracker=tracker,
                detector_calls_count=detector_calls_count,
                frames_since_last_detection_run=frames_since_last_detection_run,
                frame_index=processed_frame.processed_frame_index,
            )

            ctd_decision_counts[ctd_decision] += 1

            if should_run_detection:
                detections = detector.detect(processed_frame.frame)
                detector_calls_count += 1
                frames_since_last_detection_run = 0
            else:
                detections = []
                detector_skipped_frames_count += 1
                frames_since_last_detection_run += 1

            normalized_detections = []
            for detection in detections:
                detection_counts[detection.class_name] += 1

                normalized_detections.append(
                    {
                        "class_name": detection.class_name,
                        "confidence": round(detection.confidence, 4),
                        "bbox": {
                            "x1": detection.x1,
                            "y1": detection.y1,
                            "x2": detection.x2,
                            "y2": detection.y2,
                        },
                    }
                )

            if normalized_detections:
                frames_with_detections_count += 1

            frame_result = {
                "raw_frame_index": processed_frame.raw_frame_index,
                "processed_frame_index": processed_frame.processed_frame_index,
                "timestamp_seconds": round(processed_frame.timestamp_seconds, 3),
                "frame_width": processed_frame.frame_width,
                "frame_height": processed_frame.frame_height,
                "detections": normalized_detections,
            }

            detections_by_frame.append(frame_result)

            if tracker is not None:
                tracked_frame_result = tracker.update(
                    frame=processed_frame.frame,
                    frame_detections=normalized_detections,
                    frame_index=processed_frame.processed_frame_index,
                    timestamp_seconds=processed_frame.timestamp_seconds,
                )
                tracked_frame_result["raw_frame_index"] = processed_frame.raw_frame_index
                tracked_frame_result["processed_frame_index"] = processed_frame.processed_frame_index
            else:
                tracked_frame_result = {
                    "frame_index": processed_frame.processed_frame_index,
                    "processed_frame_index": processed_frame.processed_frame_index,
                    "raw_frame_index": processed_frame.raw_frame_index,
                    "timestamp_seconds": round(processed_frame.timestamp_seconds, 3),
                    "tracks": [],
                }

            tracked_frames.append(tracked_frame_result)
            for track in tracked_frame_result["tracks"]:
                track_id = track["track_id"]

                if track_id not in tracks_summary:
                    tracks_summary[track_id] = {
                        "track_id": track_id,
                        "class_name": track["class_name"],
                        "start_frame": tracked_frame_result["frame_index"],
                        "end_frame": tracked_frame_result["frame_index"],
                        "start_time_seconds": tracked_frame_result["timestamp_seconds"],
                        "end_time_seconds": tracked_frame_result["timestamp_seconds"],
                        "bbox_history": [],
                    }

                tracks_summary[track_id]["end_frame"] = tracked_frame_result["frame_index"]
                tracks_summary[track_id]["end_time_seconds"] = tracked_frame_result["timestamp_seconds"]

                tracks_summary[track_id]["bbox_history"].append(
                    {
                        "processed_frame_index": tracked_frame_result["processed_frame_index"],
                        "raw_frame_index": tracked_frame_result["raw_frame_index"],
                        "timestamp_seconds": tracked_frame_result["timestamp_seconds"],
                        "bbox": track["bbox"],
                        "confidence": track["confidence"],
                        "processed_frame_width": processed_frame.frame_width,
                        "processed_frame_height": processed_frame.frame_height,
                        "raw_frame_width": metadata.frame_width,
                        "raw_frame_height": metadata.frame_height,
                    }
                )


            if (
                tracked_frame_result["tracks"]
                and DEBUG_ANNOTATED_FRAMES_ENABLED
            ):
                # Annotate using tracked boxes (priority) and save with track ids in filename
                annotated = annotate_frame(
                    frame=processed_frame.frame,
                    tracks=tracked_frame_result["tracks"],
                )

                track_ids = [t["track_id"] for t in tracked_frame_result["tracks"]]

                filename = (
                    f"frame_{processed_frame.processed_frame_index}"
                    f"_raw_{processed_frame.raw_frame_index}"
                    f"_tracks_{'_'.join(map(str, track_ids))}.jpg"
                )

                debug_dir = ensure_debug_video_dir(metadata.video_path)
                output_path = debug_dir / filename

                cv2.imwrite(str(output_path), annotated)
                saved_debug_frames.append(str(output_path))
                debug_frames_saved_count += 1

            if tracked_frame_result["tracks"] and len(preview_frames) < preview_limit:
                preview_frames.append(frame_result)

        total_detections = sum(detection_counts.values())
        tracks_summary_list = sorted(
            tracks_summary.values(),
            key=lambda item: item["track_id"],
        )
        faces_output = extract_faces_from_tracks(
            video_path,
            tracks_summary_list,
            face_templates or [],
        )
        return {
            "video_path": metadata.video_path,
            "detector_backend_used": detector_backend_used,
            "detector_fallback_reason": fallback_reason,
            "fps": metadata.fps,
            "total_frames": metadata.total_frames,
            "duration_seconds": round(metadata.duration_seconds, 3),
            "original_frame_width": metadata.frame_width,
            "original_frame_height": metadata.frame_height,
            "processed_frames_count": processed_frames_count,
            "frames_with_detections_count": frames_with_detections_count,
            "total_detections": total_detections,
            "detection_counts": detection_counts,
            "detections_by_frame": detections_by_frame,
            "tracked_frames": tracked_frames,
            "tracks_summary": tracks_summary_list,
            "preview_frames": preview_frames,
            "debug_frames_saved_count": debug_frames_saved_count,
            "saved_debug_frames": saved_debug_frames,
            "ctd_enabled": CTD_ENABLED,
            "ctd_max_frames_without_detection": CTD_MAX_FRAMES_WITHOUT_DETECTION,
            "detector_calls_count": detector_calls_count,
            "detector_skipped_frames_count": detector_skipped_frames_count,
            "ctd_decision_counts": ctd_decision_counts,
            "event_payloads": build_event_payloads(
                video_id=0,
                tracks_summary=tracks_summary_list,
            ),
            "snapshot_payloads": build_snapshot_payloads(
                video_id=0,
                tracks_summary=tracks_summary_list,
            ),
            "faces_output": faces_output,
            "status": "success",
        }

    except VideoLoaderError as e:
        return {
            "video_path": video_path,
            "status": "failed",
            "error": str(e),
        }

    except Exception as e:
        return {
            "video_path": video_path,
            "status": "failed",
            "error": f"Unexpected processing error: {str(e)}",
        }

    finally:
        release_video_capture(cap)