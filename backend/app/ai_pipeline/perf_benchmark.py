import importlib
import time

import app.ai_pipeline.config as pipeline_config


def run_pipeline_benchmark(
    video_path: str,
    frame_skip: int,
    detector_imgsz: int,
    ctd_enabled: bool | None = None,
    ctd_max_frames_without_detection: int | None = None,
):
    """
    Run one benchmark trial by temporarily overriding config values,
    reloading dependent modules, and executing the pipeline.
    """
    pipeline_config.FRAME_SKIP = frame_skip
    pipeline_config.DETECTOR_IMGSZ = detector_imgsz

    if ctd_enabled is not None:
        pipeline_config.CTD_ENABLED = ctd_enabled

    if ctd_max_frames_without_detection is not None:
        pipeline_config.CTD_MAX_FRAMES_WITHOUT_DETECTION = (
            ctd_max_frames_without_detection
        )

    import app.ai_pipeline.frame_processor as frame_processor
    import app.ai_pipeline.detector as detector
    import app.ai_pipeline.tracker as tracker
    import app.ai_pipeline.pipeline_service as pipeline_service

    importlib.reload(frame_processor)
    importlib.reload(detector)
    importlib.reload(tracker)
    importlib.reload(pipeline_service)

    t0 = time.perf_counter()
    result = pipeline_service.analyze_video_frames(video_path, preview_limit=2)
    elapsed = time.perf_counter() - t0

    return {
        "status": result.get("status"),
        "error": result.get("error"),
        "detector_backend_used": result.get("detector_backend_used"),
        "frame_skip": frame_skip,
        "detector_imgsz": detector_imgsz,
        "ctd_enabled": result.get("ctd_enabled"),
        "ctd_max_frames_without_detection": result.get(
            "ctd_max_frames_without_detection"
        ),
        "elapsed_seconds": round(elapsed, 3),
        "video_duration_seconds": result.get("duration_seconds"),
        "x_realtime": (
            round(result["duration_seconds"] / elapsed, 3)
            if result.get("duration_seconds") and elapsed > 0
            else None
        ),
        "processed_frames_count": result.get("processed_frames_count"),
        "detector_calls_count": result.get("detector_calls_count"),
        "detector_skipped_frames_count": result.get(
            "detector_skipped_frames_count"
        ),
        "ctd_decision_counts": result.get("ctd_decision_counts"),
        "total_detections": result.get("total_detections"),
        "track_count": len(result.get("tracks_summary", [])),
    }