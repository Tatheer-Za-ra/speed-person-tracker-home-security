# scratch/test_speed_debug.py

import math

def test_112kmh_math():
    fps = 25.0
    dt = 5.0 / fps # 0.20s for FRAME_SKIP=5
    ref_w = 1.85 # Car reference width in meters
    frame_h = 540.0
    y_horizon = 0.15 * frame_h # 81px

    # Scenario 1: 112 km/h vehicle moving VERTICALLY (down depth axis)
    y1 = 280.0
    y2 = 337.0
    w1 = 40.0
    w2 = 48.0

    w_avg = (w1 + w2) / 2.0 # 44.0 px
    y_avg = (y1 + y2) / 2.0 # 308.5 px

    scale_base = ref_w / w_avg # 1.85 / 44 = 0.042045 m/px
    depth_multiplier = frame_h / max(20.0, y_avg - y_horizon) # 540 / 227.5 = 2.3736

    dy_px = y2 - y1 # 57.0 px
    dist_y_m = dy_px * scale_base * depth_multiplier # 57 * 0.042045 * 2.3736 = 5.688m
    speed_y_kmh = (dist_y_m / dt) * 3.6

    # Scenario 2: 112 km/h vehicle moving HORIZONTALLY
    dx_px = 134.5
    dist_x_m = dx_px * scale_base
    speed_x_kmh = (dist_x_m / dt) * 3.6

    print(f"Vertical Motion Speed: {speed_y_kmh:.1f} km/h (Expected ~112.0 km/h)")
    print(f"Horizontal Motion Speed: {speed_x_kmh:.1f} km/h (Expected ~112.0 km/h)")

if __name__ == "__main__":
    test_112kmh_math()
