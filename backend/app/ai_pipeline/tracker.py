from deep_sort_realtime.deepsort_tracker import DeepSort

from app.ai_pipeline.config import (
    CTD_ACTIVE_TRACK_GRACE_FRAMES,
    TRACKING_MAX_AGE,
    TRACKING_N_INIT,
    TRACKING_MIN_TRACK_LENGTH,
)


class VideoTracker:
    def __init__(self, config=None):
        self.config = config
        self.tracker = DeepSort(
            max_age=TRACKING_MAX_AGE,
            n_init=TRACKING_N_INIT,
        )
        self.track_observation_counts = {}
        self.track_last_seen_frame = {}

    @staticmethod
    def _xyxy_to_ltwh(bbox: dict) -> list[int]:
        x1 = int(round(bbox["x1"]))
        y1 = int(round(bbox["y1"]))
        x2 = int(round(bbox["x2"]))
        y2 = int(round(bbox["y2"]))

        width = max(0, x2 - x1)
        height = max(0, y2 - y1)

        return [x1, y1, width, height]

    def _build_raw_detections(self, frame_detections: list[dict]):
        raw_detections = []
        supplementary = []

        for detection in frame_detections:
            raw_detections.append(
                (
                    self._xyxy_to_ltwh(detection["bbox"]),
                    float(detection["confidence"]),
                    detection["class_name"],
                )
            )
            supplementary.append(detection)

        return raw_detections, supplementary

    def _cleanup_recent_track_cache(self, current_frame_index: int):
        stale_ids = [
            track_id
            for track_id, last_seen_frame in self.track_last_seen_frame.items()
            if current_frame_index - last_seen_frame > CTD_ACTIVE_TRACK_GRACE_FRAMES
        ]

        for track_id in stale_ids:
            self.track_last_seen_frame.pop(track_id, None)

    def has_active_tracks(self, current_frame_index: int) -> bool:
        self._cleanup_recent_track_cache(current_frame_index)
        return bool(self.track_last_seen_frame)

    def update(
        self,
        frame,
        frame_detections: list[dict],
        frame_index: int,
        timestamp_seconds: float,
    ) -> dict:
        raw_detections, supplementary = self._build_raw_detections(frame_detections)

        tracks = self.tracker.update_tracks(
            raw_detections,
            frame=frame,
            others=supplementary,
        )

        normalized_tracks = []

        for track in tracks:
            if not track.is_confirmed():
                continue

            det_info = None
            if hasattr(track, "get_det_supplementary"):
                det_info = track.get_det_supplementary()

            # For output we ignore predicted-only / unmatched tracks,
            # but for CTD we still keep a recent active-track cache
            # only when a real matched detection exists.
            if det_info is None:
                continue

            track_id = int(track.track_id)
            self.track_last_seen_frame[track_id] = frame_index

            self.track_observation_counts[track_id] = (
                self.track_observation_counts.get(track_id, 0) + 1
            )

            if self.track_observation_counts[track_id] < TRACKING_MIN_TRACK_LENGTH:
                continue

            ltrb = track.to_ltrb(orig=True)
            if ltrb is None:
                continue

            x1, y1, x2, y2 = ltrb

            normalized_tracks.append(
                {
                    "track_id": track_id,
                    "class_name": det_info["class_name"],
                    "bbox": {
                        "x1": int(round(x1)),
                        "y1": int(round(y1)),
                        "x2": int(round(x2)),
                        "y2": int(round(y2)),
                    },
                    "confidence": (
                        round(float(det_info["confidence"]), 4)
                        if det_info.get("confidence") is not None
                        else None
                    ),
                    "is_confirmed": True,
                    "observed_frames_count": self.track_observation_counts[track_id],
                }
            )

        self._cleanup_recent_track_cache(frame_index)

        return {
            "frame_index": frame_index,
            "timestamp_seconds": round(timestamp_seconds, 3),
            "tracks": normalized_tracks,
        }