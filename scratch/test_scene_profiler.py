# scratch/test_scene_profiler.py

import math

def test_auto_scene_profiling():
    # Site 1: Highway Telephoto Video (Image 1)
    # Track #16 (car 111 km/h) & Track #35 (car 118 km/h)
    site1_tracks = {
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
        }
    }

    # Site 2: Urban Highway / Overpass Video (Image 2)
    # Blue truck / Silver car traveling ~53 - 58 km/h
    # Silver car: w=140px, y moves from 200 to 450 in 1.5s
    site2_tracks = {
        101: {
            "label": "car", "target_spd": 53.0,
            "history": [
                {"timestamp_seconds": 0.000, "bbox": {"x1": 330.0, "y1": 280.0, "x2": 435.0, "y2": 370.0}},
                {"timestamp_seconds": 0.300, "bbox": {"x1": 328.0, "y1": 310.0, "x2": 438.0, "y2": 405.0}},
                {"timestamp_seconds": 0.600, "bbox": {"x1": 325.0, "y1": 345.0, "x2": 442.0, "y2": 445.0}},
                {"timestamp_seconds": 0.900, "bbox": {"x1": 322.0, "y1": 385.0, "x2": 446.0, "y2": 490.0}},
                {"timestamp_seconds": 1.200, "bbox": {"x1": 318.0, "y1": 430.0, "x2": 450.0, "y2": 538.0}},
            ]
        }
    }

    frame_h = 540.0

    def compute_speed_for_site(tracks, scene_preset="auto"):
        # Auto Profile Scene Detection
        all_widths = []
        for tid, tdata in tracks.items():
            for item in tdata["history"]:
                b = item["bbox"]
                all_widths.append(b["x2"] - b["x1"])

        avg_w = sum(all_widths) / len(all_widths) if all_widths else 50.0

        if scene_preset == "auto":
            if avg_w < 65.0:
                preset = "highway_telephoto"
            else:
                preset = "urban_overpass"
        else:
            preset = scene_preset

        if preset == "highway_telephoto":
            y_horizon = 0.30 * frame_h
            mult = 1.85
            gamma = 1.60
        elif preset == "urban_overpass":
            y_horizon = -0.20 * frame_h
            mult = 7.50
            gamma = 1.05
        else: # residential_low
            y_horizon = 0.15 * frame_h
            mult = 1.0
            gamma = 1.0

        results = {}
        for tid, tdata in tracks.items():
            ref_w = 1.85 if tdata["label"] == "car" else 2.45
            history = tdata["history"]
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
                speeds.append(spd)

            speeds.sort()
            avg_spd = sum(speeds) / len(speeds)
            results[tid] = (avg_spd, preset, tdata["target_spd"])

        return results

    print("=== SITE 1 (HIGHWAY TELEPHOTO VIDEO) ===")
    r1 = compute_speed_for_site(site1_tracks, "auto")
    for tid, (spd, preset, target) in r1.items():
        print(f"Track #{tid}: HavenTrack = {spd:.1f} km/h | Ground Truth Target = {target} km/h | Mode: {preset}")

    print("\n=== SITE 2 (URBAN OVERPASS VIDEO) ===")
    r2 = compute_speed_for_site(site2_tracks, "auto")
    for tid, (spd, preset, target) in r2.items():
        print(f"Track #{tid}: HavenTrack = {spd:.1f} km/h | Ground Truth Target = {target} km/h | Mode: {preset}")

if __name__ == "__main__":
    test_auto_scene_profiling()
