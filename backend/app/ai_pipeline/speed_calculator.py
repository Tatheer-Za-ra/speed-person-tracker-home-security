# backend/app/ai_pipeline/speed_calculator.py

import math
from typing import List, Dict, Any

# Default camera scale calibration factor (meters per pixel for standard 3-4m residential CCTV height)
DEFAULT_METERS_PER_PIXEL = 0.045


def _compute_centroid(bbox: Dict[str, float]) -> tuple[float, float]:
    """Computes (x, y) center point of a bounding box."""
    cx = (bbox["x1"] + bbox["x2"]) / 2.0
    cy = (bbox["y1"] + bbox["y2"]) / 2.0
    return cx, cy


def calculate_track_speed(
    bbox_history: List[Dict[str, Any]],
    fps: float,
    meters_per_pixel: float = DEFAULT_METERS_PER_PIXEL
) -> Dict[str, Any]:
    """
    Calculates estimated velocity (km/h) across a vehicle's DeepSORT bounding box trajectory.
    Uses sliding window moving average to eliminate detection box jitter.
    """
    if not bbox_history or len(bbox_history) < 2 or fps <= 0:
        return {
            "estimated_speed_kmh": 0.0,
            "max_speed_kmh": 0.0,
            "speed_status": "NORMAL",
            "valid": False,
        }

    speeds_kmh = []

    # Iterate through consecutive trajectory frame observations
    for i in range(1, len(bbox_history)):
        prev = bbox_history[i - 1]
        curr = bbox_history[i]

        dt = curr["timestamp_seconds"] - prev["timestamp_seconds"]
        if dt <= 0:
            continue

        # Extract centroids in raw frame coordinates
        cx_prev, cy_prev = _compute_centroid(prev["bbox"])
        cx_curr, cy_curr = _compute_centroid(curr["bbox"])

        # Euclidean distance in pixels
        pixel_distance = math.sqrt((cx_curr - cx_prev) ** 2 + (cy_curr - cy_prev) ** 2)

        # Real-world distance in meters
        distance_meters = pixel_distance * meters_per_pixel

        # Speed in meters/second -> convert to km/h
        speed_mps = distance_meters / dt
        speed_kmh = speed_mps * 3.6

        # Filter out extreme noise spikes (> 150 km/h in residential zones)
        if 0.5 <= speed_kmh <= 150.0:
            speeds_kmh.append(speed_kmh)

    if not speeds_kmh:
        return {
            "estimated_speed_kmh": 0.0,
            "max_speed_kmh": 0.0,
            "speed_status": "NORMAL",
            "valid": False,
        }

    # Trim top/bottom outliers for robust velocity estimation
    speeds_kmh.sort()
    if len(speeds_kmh) >= 4:
        trimmed = speeds_kmh[int(len(speeds_kmh) * 0.1) : max(1, int(len(speeds_kmh) * 0.9))]
    else:
        trimmed = speeds_kmh

    avg_speed = sum(trimmed) / len(trimmed)
    max_speed = max(speeds_kmh)

    return {
        "estimated_speed_kmh": round(avg_speed, 1),
        "max_speed_kmh": round(max_speed, 1),
        "valid": True,
    }
