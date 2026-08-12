# scratch/analyze_output_mp4.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.ai_pipeline.pipeline_service import analyze_video_frames

def main():
    video_path = "storage/uploads/videos/output_ed753b520405.mp4"
    if not Path(video_path).exists():
        # Fallback to any output_*.mp4 file
        output_files = list(Path("storage/uploads/videos").glob("output_*.mp4"))
        if output_files:
            video_path = str(output_files[-1])

    print(f"--- Analyzing Output Video: {video_path} ---")
    res = analyze_video_frames(video_path)

    print(f"Processed frames: {res.get('processed_frames_count')}, total tracks: {len(res.get('tracks_summary', []))}\n")

    for track in res.get("tracks_summary", []):
        class_name = track.get("class_name")
        tid = track.get("track_id")
        history = track.get("bbox_history", [])

        # Find speed info from event payload if available
        spd_info = "N/A"
        for payload in res.get("event_payloads", []):
            if payload.get("track_id") == tid:
                meta = json.loads(payload.get("metadata_json") or "{}")
                spd = meta.get("estimated_speed_kmh", 0.0)
                max_spd = meta.get("max_speed_kmh", 0.0)
                spd_info = f"Speed = {spd} km/h (Max = {max_spd} km/h)"

        print(f"Track #{tid} ({class_name}) | Length: {len(history)} frames | {spd_info}")
        for item in history[:8]:
            t = item.get("timestamp_seconds")
            b = item.get("bbox")
            w = abs(b["x2"] - b["x1"])
            h = abs(b["y2"] - b["y1"])
            print(f"    t={t:.3f}s: x=[{b['x1']:.1f}, {b['x2']:.1f}], y=[{b['y1']:.1f}, {b['y2']:.1f}] (w={w:.1f}, h={h:.1f})")
        print()

if __name__ == "__main__":
    main()
