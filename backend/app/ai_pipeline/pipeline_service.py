
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
import json
from app.ai_pipeline import detector
from app.ai_pipeline.speed_calculator import (
    calculate_track_speed,
    detect_vanishing_point_and_horizon,
    auto_detect_camera_scene,
)
from app.ai_pipeline.face_pipeline import extract_faces_from_tracks


def _determine_event_type(class_name: str, speed_status: str = "NORMAL", face_status: str = None) -> str:
    if class_name == "person":
        if face_status == "unknown":
            return "unknown_person"
        elif face_status == "known":
            return "known_person"
        return "person_detected"

    if class_name in {"car", "motorcycle", "truck"}:
        if speed_status == "OVERSPEED":
            return "overspeed_vehicle"
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


def _build_event_metadata(track_summary: dict, speed_info: dict = None, face_info: dict = None) -> str:
    metadata = {
        "start_frame": track_summary.get("start_frame"),
        "end_frame": track_summary.get("end_frame"),
        "start_time_seconds": track_summary.get("start_time_seconds"),
        "end_time_seconds": track_summary.get("end_time_seconds"),
        "bbox_history_length": len(track_summary.get("bbox_history", [])),
        "bbox_history": track_summary.get("bbox_history", []),
    }

    if speed_info:
        metadata["estimated_speed_kmh"] = speed_info.get("estimated_speed_kmh", 0.0)
        metadata["max_speed_kmh"] = speed_info.get("max_speed_kmh", 0.0)
        metadata["speed_limit_kmh"] = speed_info.get("limit_kmh", 30.0)
        metadata["speed_status"] = speed_info.get("speed_status", "NORMAL")

    if face_info:
        metadata["face_match_status"] = face_info.get("match_status")
        metadata["known_person_id"] = face_info.get("known_person_id")
        metadata["face_similarity"] = face_info.get("similarity")

    return json.dumps(metadata)


def build_event_payloads(
    video_id: int,
    tracks_summary: list[dict],
    fps: float = 25.0,
    speed_limits: dict = None,
    faces_output: list[dict] = None,
    camera_params: dict = None,
    y_horizon_custom: float = None,
) -> list[dict]:
    if speed_limits is None:
        speed_limits = {"car": 30.0, "motorcycle": 40.0, "truck": 25.0}

    # Map face recognition results by track_id
    face_map_by_track = {}
    if faces_output:
        for item in faces_output:
            tid = item.get("track_id")
            faces = item.get("faces", [])
            if faces:
                face_map_by_track[tid] = faces[0]

    detected_scene = auto_detect_camera_scene(tracks_summary, frame_height=540.0)
    print(f"=== AUTO-DETECTED SCENE PRESET FOR VIDEO: {detected_scene} ===")
    event_payloads = []

    for track_summary in tracks_summary:
        class_name = track_summary.get("class_name")
        if not class_name:
            continue

        track_id = track_summary.get("track_id")
        bbox_history = track_summary.get("bbox_history", [])
        is_vehicle = class_name in {"car", "motorcycle", "truck"}
        is_person = class_name == "person"

        speed_info = None
        is_alert = False
        speed_status = "NORMAL"

        # Vehicle Speed Evaluation with Method 1 AI Self-Calibration
        if is_vehicle:
            calculated = calculate_track_speed(
                bbox_history,
                fps=fps,
                camera_params=camera_params,
                class_name=class_name,
                y_horizon_custom=y_horizon_custom,
                scene_preset=detected_scene,
            )
            limit_kmh = float(speed_limits.get(class_name, 30.0))

            if calculated["valid"] and calculated["estimated_speed_kmh"] > limit_kmh:
                speed_status = "OVERSPEED"
                is_alert = True
            else:
                speed_status = "NORMAL"

            speed_info = {
                "estimated_speed_kmh": calculated["estimated_speed_kmh"],
                "max_speed_kmh": calculated["max_speed_kmh"],
                "limit_kmh": limit_kmh,
                "speed_status": speed_status,
            }

        # Person Identity Evaluation
        face_info = face_map_by_track.get(track_id)
        face_status = face_info.get("match_status") if face_info else None
        if is_person and face_status != "known":
            is_alert = True

        event_type = _determine_event_type(
            class_name=class_name,
            speed_status=speed_status,
            face_status=face_status,
        )

        event_payloads.append(
            {
                "video_id": video_id,
                "track_id": track_id,
                "event_type": event_type,
                "label": class_name,
                "timestamp_seconds": track_summary.get("start_time_seconds"),
                "confidence": _extract_event_confidence(track_summary),
                "metadata_json": _build_event_metadata(
                    track_summary=track_summary,
                    speed_info=speed_info,
                    face_info=face_info,
                ),
                "is_alert": is_alert,
            }
        )

    return event_payloads
def build_snapshot_payloads(
    video_id: int,
    tracks_summary: list[dict],
    processed_width: int = 960,
    processed_height: int = 540,
) -> list[dict]:
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
                "processed_frame_index": first_entry.get("processed_frame_index"),
                "bbox": first_entry.get("bbox"),
                "processed_width": first_entry.get("processed_frame_width", processed_width),
                "processed_height": first_entry.get("processed_frame_height", processed_height),
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


def analyze_video_frames(
    video_path: str,
    preview_limit: int = 5,
    face_templates=None,
    speed_limits: dict = None,
    camera_params: dict = None,
    progress_callback: callable = None,
):
    """
    Day 10 pipeline runner (Chunk 1 foundation).
    """
    cap = None

    try:
        cap, metadata = load_video_capture(video_path)
        release_video_capture(cap)
        cap = None

        total_frames = getattr(metadata, "total_frames", 1) or 1

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

        auto_y_horizon = None

        for processed_frame in iter_processed_frames(video_path):
            processed_frames_count += 1

            if progress_callback:
                current_raw_frame = min(total_frames, processed_frame.raw_frame_index + 1)
                pct = min(99, int((current_raw_frame / max(1, total_frames)) * 100))
                try:
                    progress_callback(pct, current_raw_frame, total_frames)
                except Exception:
                    pass

            if auto_y_horizon is None and processed_frame.frame is not None:
                auto_y_horizon = detect_vanishing_point_and_horizon(processed_frame.frame)

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
                fps=metadata.fps,
                speed_limits=speed_limits,
                faces_output=faces_output,
                camera_params=camera_params,
                y_horizon_custom=auto_y_horizon,
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