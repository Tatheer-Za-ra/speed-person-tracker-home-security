# backend/app/frame_processor.py

from dataclasses import dataclass
from pathlib import Path

import cv2

from app.ai_pipeline.config import (
    DEFAULT_FPS_FALLBACK,
    ENABLE_RESIZE,
    FRAME_SKIP,
    MIN_FRAME_SKIP,
    RESIZE_HEIGHT,
    RESIZE_WIDTH,
)


@dataclass
class VideoMetadata:
    video_path: str
    fps: float
    total_frames: int
    frame_width: int
    frame_height: int
    duration_seconds: float


@dataclass
class ProcessedFrame:
    raw_frame_index: int
    processed_frame_index: int
    timestamp_seconds: float
    frame_width: int
    frame_height: int
    frame: any


class VideoLoaderError(Exception):
    pass


def load_video_capture(video_path: str):
    """
    Open a video file with OpenCV and return:
    - capture object
    - extracted metadata
    """
    path = Path(video_path)

    if not path.exists():
        raise VideoLoaderError(f"Video file does not exist: {video_path}")

    cap = cv2.VideoCapture(str(path))

    if not cap.isOpened():
        raise VideoLoaderError(f"Could not open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = DEFAULT_FPS_FALLBACK

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    duration_seconds = total_frames / fps if fps > 0 else 0.0

    metadata = VideoMetadata(
        video_path=str(path),
        fps=float(fps),
        total_frames=total_frames,
        frame_width=frame_width,
        frame_height=frame_height,
        duration_seconds=float(duration_seconds),
    )

    return cap, metadata


def release_video_capture(cap):
    """
    Safely release an OpenCV video capture object.
    """
    if cap is not None:
        cap.release()


def resize_frame_if_enabled(
    frame,
    enable_resize: bool,
    resize_width: int,
    resize_height: int,
):
    """
    Resize frame only if enabled and dimensions are valid.
    """
    if not enable_resize:
        return frame

    if resize_width <= 0 or resize_height <= 0:
        return frame

    return cv2.resize(frame, (resize_width, resize_height))


def iter_processed_frames(
    video_path: str,
    frame_skip: int | None = None,
    enable_resize: bool | None = None,
    resize_width: int | None = None,
    resize_height: int | None = None,
):
    """
    Yield processed frames one-by-one from a video.

    Features:
    - configurable frame skip
    - timestamp calculation
    - optional resize/downscale
    """
    effective_frame_skip = frame_skip if frame_skip is not None else FRAME_SKIP
    effective_frame_skip = max(MIN_FRAME_SKIP, int(effective_frame_skip))

    effective_enable_resize = (
        enable_resize if enable_resize is not None else ENABLE_RESIZE
    )
    effective_resize_width = resize_width if resize_width is not None else RESIZE_WIDTH
    effective_resize_height = (
        resize_height if resize_height is not None else RESIZE_HEIGHT
    )

    cap = None

    try:
        cap, metadata = load_video_capture(video_path)

        raw_frame_index = 0
        processed_frame_index = 0

        while True:
            success, frame = cap.read()

            if not success:
                break

            if raw_frame_index % effective_frame_skip != 0:
                raw_frame_index += 1
                continue

            frame = resize_frame_if_enabled(
                frame=frame,
                enable_resize=effective_enable_resize,
                resize_width=effective_resize_width,
                resize_height=effective_resize_height,
            )

            frame_height, frame_width = frame.shape[:2]
            timestamp_seconds = raw_frame_index / metadata.fps

            yield ProcessedFrame(
                raw_frame_index=raw_frame_index,
                processed_frame_index=processed_frame_index,
                timestamp_seconds=float(timestamp_seconds),
                frame_width=frame_width,
                frame_height=frame_height,
                frame=frame,
            )

            raw_frame_index += 1
            processed_frame_index += 1

    finally:
        release_video_capture(cap)