from pathlib import Path

import cv2

from app.ai_pipeline.config import DEBUG_OUTPUT_DIR


def ensure_debug_video_dir(video_path: str) -> Path:
    """
    Create and return a per-video debug frame output directory.
    """
    video_name = Path(video_path).stem
    output_dir = DEBUG_OUTPUT_DIR / video_name
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def annotate_frame(frame, detections=None, tracks=None):
    """
    Draw detection boxes or tracking boxes on a frame and return the annotated copy.

    Priority:
    - if tracks are provided, draw tracked boxes with class + track id
    - otherwise draw detections with class + confidence
    """
    annotated = frame.copy()

    tracks = tracks or []
    detections = detections or []

    if tracks:
        for track in tracks:
            x1 = int(track["bbox"]["x1"])
            y1 = int(track["bbox"]["y1"])
            x2 = int(track["bbox"]["x2"])
            y2 = int(track["bbox"]["y2"])

            label = f"{track['class_name']} #{track['track_id']}"

            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                annotated,
                label,
                (x1, max(y1 - 10, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

        return annotated

    for detection in detections:
        x1 = int(detection["bbox"]["x1"])
        y1 = int(detection["bbox"]["y1"])
        x2 = int(detection["bbox"]["x2"])
        y2 = int(detection["bbox"]["y2"])

        confidence = detection.get("confidence")
        if confidence is not None:
            label = f"{detection['class_name']} {confidence:.2f}"
        else:
            label = detection["class_name"]

        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            annotated,
            label,
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )

    return annotated


def save_annotated_frame(
    video_path: str,
    processed_frame_index: int,
    raw_frame_index: int,
    timestamp_seconds: float,
    frame,
    detections=None,
    tracks=None,
):
    """
    Save one annotated debug frame for inspection.
    """
    output_dir = ensure_debug_video_dir(video_path)

    annotated = annotate_frame(
        frame=frame,
        detections=detections,
        tracks=tracks,
    )

    filename = (
        f"pf_{processed_frame_index:04d}"
        f"_rf_{raw_frame_index:06d}"
        f"_t_{timestamp_seconds:.3f}.jpg"
    )

    output_path = output_dir / filename

    cv2.imwrite(str(output_path), annotated)

    return str(output_path)