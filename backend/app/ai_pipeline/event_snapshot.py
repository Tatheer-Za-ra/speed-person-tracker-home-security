from pathlib import Path

import cv2

from app.ai_pipeline.config import EVENT_SNAPSHOTS_DIR


def ensure_event_snapshot_dir(video_id: int) -> Path:
    output_dir = EVENT_SNAPSHOTS_DIR / f"video_{video_id}"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def save_event_snapshot(
    video_id: int,
    event_id: int,
    frame,
    bbox: dict,
    label: str,
    track_id: int | None,
    timestamp_seconds: float,
    extra_info: str = None,
    processed_size: tuple[int, int] | None = None,
) -> str:
    output_dir = ensure_event_snapshot_dir(video_id)

    annotated = frame.copy()
    frame_h, frame_w = annotated.shape[:2]

    x1 = float(bbox["x1"])
    y1 = float(bbox["y1"])
    x2 = float(bbox["x2"])
    y2 = float(bbox["y2"])

    if processed_size and processed_size[0] and processed_size[1]:
        proc_w, proc_h = processed_size
        scale_x = frame_w / proc_w
        scale_y = frame_h / proc_h
        x1 *= scale_x
        y1 *= scale_y
        x2 *= scale_x
        y2 *= scale_y

    x1_int = max(0, min(frame_w - 1, int(round(x1))))
    y1_int = max(0, min(frame_h - 1, int(round(y1))))
    x2_int = max(0, min(frame_w - 1, int(round(x2))))
    y2_int = max(0, min(frame_h - 1, int(round(y2))))

    color = (0, 0, 255) if extra_info and "OVERSPEED" in extra_info else (0, 255, 255)

    cv2.rectangle(annotated, (x1_int, y1_int), (x2_int, y2_int), color, 2)

    track_text = f"#{track_id}" if track_id is not None else ""
    extra_text = f" | {extra_info}" if extra_info else ""
    text = f"{label}{track_text} @ {timestamp_seconds:.1f}s{extra_text}"

    cv2.putText(
        annotated,
        text,
        (x1_int, max(y1_int - 10, 20)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        color,
        2,
        cv2.LINE_AA,
    )

    filename = f"event_{event_id:04d}.jpg"
    output_path = output_dir / filename

    cv2.imwrite(str(output_path), annotated)

    return str(output_path)