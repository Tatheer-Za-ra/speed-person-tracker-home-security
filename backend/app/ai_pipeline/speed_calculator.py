# backend/app/ai_pipeline/speed_calculator.py

import math
from typing import List, Dict, Any, Optional

# Standard ISO real-world physical vehicle dimensions (meters)
VEHICLE_DIMENSIONS = {
    "car": {"width": 1.85, "length": 4.50},
    "motorcycle": {"width": 0.85, "length": 2.10},
    "truck": {"width": 2.45, "length": 6.50},
}

# Default fallback meters per pixel scale
DEFAULT_METERS_PER_PIXEL = 0.045

DEFAULT_CAMERA_CALIBRATION = {
    "camera_height_m": 3.5,
    "camera_tilt_deg": 30.0,
    "fov_deg": 55.0,
    "scale_correction": 1.0,
    "preset": "residential",
}


def project_image_to_ground(
    x_px: float,
    y_px: float,
    frame_width: float = 960.0,
    frame_height: float = 540.0,
    camera_params: Optional[Dict[str, Any]] = None
) -> tuple[float, float]:
    """
    Projects pixel coordinates (x_px, y_px) on the image plane to (X_ground, Y_ground) 
    in real-world meters on the road surface using camera mounting geometry.
    """
    if camera_params is None:
        camera_params = DEFAULT_CAMERA_CALIBRATION

    h_m = float(camera_params.get("camera_height_m", 3.5))
    tilt_deg = float(camera_params.get("camera_tilt_deg", 30.0))
    fov_y_deg = float(camera_params.get("fov_deg", 55.0))

    cx = frame_width / 2.0
    cy = frame_height / 2.0

    # Vertical ray angle offset relative to optical center (positive downwards)
    rel_y = (y_px - cy) / (frame_height if frame_height > 0 else 540.0)
    theta_y = rel_y * fov_y_deg

    # Total angle relative to horizontal ground plane
    ray_angle_deg = max(2.0, min(88.0, tilt_deg + theta_y))
    ray_angle_rad = math.radians(ray_angle_deg)

    # Real-world distance along depth (Y_ground) in meters
    y_ground = h_m / math.tan(ray_angle_rad)

    # Horizontal FOV derived from aspect ratio
    aspect_ratio = (frame_width / frame_height) if frame_height > 0 else (16.0 / 9.0)
    fov_x_deg = fov_y_deg * aspect_ratio
    fov_x_rad = math.radians(fov_x_deg)

    # Real-world horizontal distance (X_ground) in meters
    x_ground = y_ground * ((x_px - cx) / cx) * math.tan(fov_x_rad / 2.0)

    return x_ground, y_ground


def _compute_bottom_contact(bbox: Dict[str, float]) -> tuple[float, float]:
    """Computes (x_center, y_bottom) contact point of vehicle tires on the road plane."""
    cx = (bbox["x1"] + bbox["x2"]) / 2.0
    cy_bottom = bbox["y2"]
    return cx, cy_bottom


def calculate_track_speed(
    bbox_history: List[Dict[str, Any]],
    fps: float,
    meters_per_pixel: Optional[float] = None,
    camera_params: Optional[Dict[str, Any]] = None,
    class_name: str = "car"
) -> Dict[str, Any]:
    """
    Calculates estimated velocity (km/h) across a vehicle's DeepSORT bounding box trajectory.
    By default uses Method 1 AI Object Self-Calibration with perspective depth scaling.
    """
    if not bbox_history or len(bbox_history) < 2 or fps <= 0:
        return {
            "estimated_speed_kmh": 0.0,
            "max_speed_kmh": 0.0,
            "speed_status": "NORMAL",
            "valid": False,
        }

    dims = VEHICLE_DIMENSIONS.get(class_name, VEHICLE_DIMENSIONS["car"])
    ref_w = dims["width"]

    speeds_kmh = []

    # Iterate through consecutive trajectory frame observations
    for i in range(1, len(bbox_history)):
        prev = bbox_history[i - 1]
        curr = bbox_history[i]

        dt = curr["timestamp_seconds"] - prev["timestamp_seconds"]
        if dt <= 0:
            continue

        frame_w = float(prev.get("processed_frame_width") or curr.get("processed_frame_width") or 960.0)
        frame_h = float(prev.get("processed_frame_height") or curr.get("processed_frame_height") or 540.0)

        # Bottom contact points (road plane contact)
        x1, y1 = _compute_bottom_contact(prev["bbox"])
        x2, y2 = _compute_bottom_contact(curr["bbox"])

        dx_px = x2 - x1
        dy_px = y2 - y1

        if meters_per_pixel is not None:
            # Legacy manual fixed 2D mode if explicitly requested
            pixel_distance = math.sqrt(dx_px ** 2 + dy_px ** 2)
            distance_meters = pixel_distance * meters_per_pixel
        elif camera_params is not None and camera_params.get("use_camera_params"):
            # Geometric Camera Pose Mode
            scale_corr = float(camera_params.get("scale_correction", 1.0))
            gx1, gy1 = project_image_to_ground(x1, y1, frame_w, frame_h, camera_params)
            gx2, gy2 = project_image_to_ground(x2, y2, frame_w, frame_h, camera_params)
            distance_meters = math.sqrt((gx2 - gx1) ** 2 + (gy2 - gy1) ** 2) * scale_corr
        else:
            # Method 1: AI Object Self-Calibration with Perspective Depth Multiplier (DEFAULT)
            w1 = abs(prev["bbox"]["x2"] - prev["bbox"]["x1"])
            w2 = abs(curr["bbox"]["x2"] - curr["bbox"]["x1"])
            w_avg = (w1 + w2) / 2.0

            if w_avg <= 1.0:
                scale_base = DEFAULT_METERS_PER_PIXEL
            else:
                scale_base = ref_w / w_avg

            # Horizontal displacement in meters
            dist_x_m = dx_px * scale_base

            # Vertical depth perspective scaling (accounts for distance from horizon)
            y_avg = (y1 + y2) / 2.0
            y_horizon = 0.15 * frame_h
            depth_multiplier = frame_h / max(20.0, y_avg - y_horizon)

            dist_y_m = dy_px * scale_base * depth_multiplier

            # Total 3D real-world displacement on ground surface
            distance_meters = math.sqrt(dist_x_m ** 2 + dist_y_m ** 2)

        # Speed in meters/second -> convert to km/h
        speed_mps = distance_meters / dt
        speed_kmh = speed_mps * 3.6

        # Filter out noise spikes (> 180 km/h)
        if 0.5 <= speed_kmh <= 180.0:
            speeds_kmh.append(speed_kmh)

    if not speeds_kmh:
        return {
            "estimated_speed_kmh": 0.0,
            "max_speed_kmh": 0.0,
            "speed_status": "NORMAL",
            "valid": False,
        }

    # Trim outliers for robust velocity estimation
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



