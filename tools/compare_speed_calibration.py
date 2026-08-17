#!/usr/bin/env python3
"""
HavenTrack - Before vs. After Speed Calibration Benchmark Tool
================================================================
Compares vehicle speed estimation telemetry BEFORE site training (using default
uncalibrated parameters) vs. AFTER site training (using learned camera geometry
and vanishing point perspective calibration).

Usage:
------
python tools/compare_speed_calibration.py --video path/to/cctv_video.mp4
"""

import sys
import os
import json
import argparse
from typing import Dict, Any, List

# Ensure backend directory is in Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai_pipeline.pipeline_service import analyze_video_frames
from app.ai_pipeline.speed_calculator import DEFAULT_CAMERA_CALIBRATION
from tools.site_calibration_trainer import SiteCalibrationTrainer


def run_speed_calibration_comparison(
    video_path: str,
    save_to_db: bool = False,
    user_id: int = 1,
    output_diag: str = "storage/site_calibration_diagnostic.jpg"
):
    if not os.path.exists(video_path):
        print(f"[!] Error: Video file not found: {video_path}")
        return

    print("=" * 80)
    print("HAVENTRACK - BEFORE VS. AFTER SITE SPEED CALIBRATION BENCHMARK")
    print("=" * 80)
    print(f"[*] Target Video: {video_path}\n")

    default_speed_limits = {"car": 30.0, "motorcycle": 40.0, "truck": 25.0}

    # -------------------------------------------------------------------------
    # PHASE 1: Run Speed Pipeline BEFORE Training (Uncalibrated Default Settings)
    # -------------------------------------------------------------------------
    print("[1/3] Running speed estimation BEFORE site training (Default Uncalibrated Setup)...")
    res_before = analyze_video_frames(
        video_path=video_path,
        speed_limits=default_speed_limits,
        camera_params=DEFAULT_CAMERA_CALIBRATION,
    )

    before_tracks: Dict[int, Dict[str, Any]] = {}
    for ev in res_before.get("event_payloads", []):
        tid = ev.get("track_id")
        lbl = ev.get("label")
        if lbl in ("car", "motorcycle", "truck") and tid is not None:
            meta = json.loads(ev.get("metadata_json") or "{}")
            spd = meta.get("estimated_speed_kmh", 0.0)
            is_alert = ev.get("is_alert", False)
            if tid not in before_tracks or spd > before_tracks[tid]["speed"]:
                before_tracks[tid] = {
                    "label": lbl,
                    "speed": spd,
                    "is_alert": is_alert
                }

    # -------------------------------------------------------------------------
    # PHASE 2: Run Site Calibration Trainer (Learn Site Geometry & VP)
    # -------------------------------------------------------------------------
    print("\n[2/3] Training software on site details (Vanishing Point & Camera Perspective Solver)...")
    trainer = SiteCalibrationTrainer(video_path)
    trained_params = trainer.train_and_calibrate(
        save_to_db=save_to_db,
        user_id=user_id,
        output_diag=output_diag
    )

    # -------------------------------------------------------------------------
    # PHASE 3: Run Speed Pipeline AFTER Training (Site-Calibrated Settings)
    # -------------------------------------------------------------------------
    print("\n[3/3] Running speed estimation AFTER site training (Trained Site Parameters)...")
    res_after = analyze_video_frames(
        video_path=video_path,
        speed_limits=default_speed_limits,
        camera_params=trained_params,
    )

    after_tracks: Dict[int, Dict[str, Any]] = {}
    for ev in res_after.get("event_payloads", []):
        tid = ev.get("track_id")
        lbl = ev.get("label")
        if lbl in ("car", "motorcycle", "truck") and tid is not None:
            meta = json.loads(ev.get("metadata_json") or "{}")
            spd = meta.get("estimated_speed_kmh", 0.0)
            is_alert = ev.get("is_alert", False)
            if tid not in after_tracks or spd > after_tracks[tid]["speed"]:
                after_tracks[tid] = {
                    "label": lbl,
                    "speed": spd,
                    "is_alert": is_alert
                }

    # -------------------------------------------------------------------------
    # PHASE 4: Render Comparative Benchmark Telemetry Report
    # -------------------------------------------------------------------------
    print("\n" + "=" * 90)
    print("SPEED ESTIMATION COMPARISON BENCHMARK REPORT")
    print("=" * 90)
    print(f"Learned Site Profile : {trained_params.get('preset', 'N/A').upper()}")
    print(f"Camera Height        : {trained_params.get('camera_height_m')} meters")
    print(f"Tilt Angle           : {trained_params.get('camera_tilt_deg')} degrees")
    print(f"Vanishing Point (Y)  : {trained_params.get('vanishing_point_y')} px")
    print("-" * 90)
    print(f"{'TRACK ID':<10} {'CLASS':<12} {'BEFORE SPEED':<16} {'AFTER SPEED':<16} {'DELTA (Δ)':<14} {'ALERT STATUS SHIFT'}")
    print("-" * 90)

    all_tids = sorted(list(set(before_tracks.keys()) | set(after_tracks.keys())))
    deltas = []

    for tid in all_tids:
        b_info = before_tracks.get(tid, {"label": "N/A", "speed": 0.0, "is_alert": False})
        a_info = after_tracks.get(tid, {"label": b_info["label"], "speed": 0.0, "is_alert": False})

        cls_name = a_info["label"] if a_info["label"] != "N/A" else b_info["label"]
        b_spd = b_info["speed"]
        a_spd = a_info["speed"]
        delta = a_spd - b_spd
        deltas.append(abs(delta))

        b_alert = "ALERT" if b_info["is_alert"] else "NORMAL"
        a_alert = "ALERT" if a_info["is_alert"] else "NORMAL"

        if b_alert != a_alert:
            shift = f"{b_alert} -> {a_alert} [SHIFT]"
        else:
            shift = f"{a_alert}"

        print(f"Track #{tid:<4} {cls_name:<12} {b_spd:>6.1f} km/h       {a_spd:>6.1f} km/h       {delta:>+6.1f} km/h       {shift}")

    print("-" * 90)
    avg_delta = sum(deltas) / len(deltas) if deltas else 0.0
    print(f"[+] Average Speed Precision Refinement Delta (Δ): {avg_delta:.1f} km/h")
    print(f"[+] Diagnostic visual output saved to: {output_diag}")
    if save_to_db:
        print(f"[+] Trained site profile persisted to database for active user (user_id={user_id})")
    print("=" * 90)


def main():
    parser = argparse.ArgumentParser(description="HavenTrack - Speed Calibration Comparison Benchmark Tool")
    parser.add_argument("--video", type=str, required=True, help="Path to CCTV video file")
    parser.add_argument("--save-to-db", action="store_true", help="Automatically persist trained settings to DB")
    parser.add_argument("--user-id", type=int, default=1, help="User ID associated with DB settings")
    parser.add_argument("--output-diag", type=str, default="storage/site_calibration_diagnostic.jpg", help="Path for visual diagnostic overlay image")

    args = parser.parse_args()
    run_speed_calibration_comparison(
        args.video,
        save_to_db=args.save_to_db,
        user_id=args.user_id,
        output_diag=args.output_diag
    )


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()
