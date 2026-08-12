# scratch/test_highway_fix.py

import math

def grid_search_perspective():
    tracks = {
        16: {
            "label": "car", "target_spd": 111.0,
            "history": [
                {"timestamp_seconds": 7.000, "bbox": {"x1": 317.0, "y1": 245.0, "x2": 353.0, "y2": 269.0}},
                {"timestamp_seconds": 7.200, "bbox": {"x1": 313.0, "y1": 250.0, "x2": 349.0, "y2": 276.0}},
                {"timestamp_seconds": 7.400, "bbox": {"x1": 307.0, "y1": 254.0, "x2": 347.0, "y2": 281.0}},
                {"timestamp_seconds": 7.600, "bbox": {"x1": 303.0, "y1": 262.0, "x2": 342.0, "y2": 288.0}},
                {"timestamp_seconds": 7.800, "bbox": {"x1": 298.0, "y1": 267.0, "x2": 339.0, "y2": 296.0}},
                {"timestamp_seconds": 8.000, "bbox": {"x1": 291.0, "y1": 274.0, "x2": 337.0, "y2": 306.0}},
                {"timestamp_seconds": 8.200, "bbox": {"x1": 284.0, "y1": 284.0, "x2": 333.0, "y2": 317.0}},
                {"timestamp_seconds": 8.400, "bbox": {"x1": 278.0, "y1": 294.0, "x2": 329.0, "y2": 329.0}},
            ]
        },
        35: {
            "label": "car", "target_spd": 115.0,
            "history": [
                {"timestamp_seconds": 19.200, "bbox": {"x1": 275.0, "y1": 287.0, "x2": 329.0, "y2": 327.0}},
                {"timestamp_seconds": 19.600, "bbox": {"x1": 271.0, "y1": 304.0, "x2": 328.0, "y2": 348.0}},
                {"timestamp_seconds": 20.000, "bbox": {"x1": 264.0, "y1": 326.0, "x2": 325.0, "y2": 374.0}},
                {"timestamp_seconds": 20.400, "bbox": {"x1": 255.0, "y1": 351.0, "x2": 326.0, "y2": 408.0}},
                {"timestamp_seconds": 20.800, "bbox": {"x1": 245.0, "y1": 383.0, "x2": 331.0, "y2": 455.0}},
                {"timestamp_seconds": 21.200, "bbox": {"x1": 222.0, "y1": 433.0, "x2": 330.0, "y2": 518.0}},
            ]
        }
    }

    frame_h = 540.0
    ref_w = 1.85

    best_error = 999.0
    best_params = None

    for horizon_ratio in [0.15, 0.20, 0.25, 0.30, 0.35]:
        y_horizon = horizon_ratio * frame_h
        for gamma in [1.0, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8]:
            for mult in [1.0, 1.2, 1.5, 1.8, 2.0]:
                total_error = 0.0
                results = {}

                for tid, tdata in tracks.items():
                    history = tdata["history"]
                    target = tdata["target_spd"]

                    speeds = []
                    for i in range(1, len(history)):
                        prev = history[i-1]
                        curr = history[i]
                        dt = curr["timestamp_seconds"] - prev["timestamp_seconds"]
                        if dt <= 0: continue

                        x1 = (prev["bbox"]["x1"] + prev["bbox"]["x2"]) / 2.0
                        y1 = prev["bbox"]["y2"]
                        w1 = abs(prev["bbox"]["x2"] - prev["bbox"]["x1"])

                        x2 = (curr["bbox"]["x1"] + curr["bbox"]["x2"]) / 2.0
                        y2 = curr["bbox"]["y2"]
                        w2 = abs(curr["bbox"]["x2"] - curr["bbox"]["x1"])

                        dx_px = x2 - x1
                        dy_px = y2 - y1

                        w_avg = (w1 + w2) / 2.0
                        scale_base = (ref_w / max(1.0, w_avg)) * mult

                        y_avg = (y1 + y2) / 2.0
                        y_rel = max(10.0, y_avg - y_horizon)
                        depth_mult = (frame_h / y_rel) ** gamma

                        dist_x = dx_px * scale_base
                        dist_y = dy_px * scale_base * depth_mult

                        d_tot = math.sqrt(dist_x**2 + dist_y**2)
                        spd = (d_tot / dt) * 3.6
                        if 1.0 <= spd <= 250.0:
                            speeds.append(spd)

                    speeds.sort()
                    if len(speeds) >= 4:
                        trimmed = speeds[int(len(speeds)*0.15) : int(len(speeds)*0.85)]
                    else:
                        trimmed = speeds

                    avg_spd = sum(trimmed) / len(trimmed) if trimmed else 0.0
                    err = abs(avg_spd - target)
                    total_error += err
                    results[tid] = avg_spd

                if total_error < best_error:
                    best_error = total_error
                    best_params = (horizon_ratio, gamma, mult, results)

    print(f"Optimal Horizon Ratio: {best_params[0]}, Gamma: {best_params[1]}, Multiplier: {best_params[2]}")
    print(f"Total Absolute Error: {best_error:.2f} km/h")
    for tid, spd in best_params[3].items():
        print(f"  Track #{tid}: {spd:.1f} km/h (Target: {tracks[tid]['target_spd']} km/h)")

if __name__ == "__main__":
    grid_search_perspective()
