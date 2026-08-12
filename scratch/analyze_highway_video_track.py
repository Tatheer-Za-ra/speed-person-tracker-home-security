# scratch/analyze_highway_video_track.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.ai_pipeline.pipeline_service import analyze_video_frames

def debug_highway_run():
    video_path = "storage/uploads/videos/Labeled_test_video_26d2b9eefff4.mp4"
    if not Path(video_path).exists():
        # try find any Labeled_test_video
        files = list(Path("storage/uploads/videos").glob("Labeled_test_video_*.mp4"))
        if files:
            video_path = str(files[0])
        else:
            print("No video file found.")
            return

    print(f"--- Analyzing Highway Video: {video_path} ---")
    result = analyze_video_frames(video_path)

    if result["status"] != "success":
        print(f"Error analyzing video: {result.get('error')}")
        return

    print(f"Processed frames: {result['processed_frames_count']}, total tracks: {len(result['tracks_summary'])}")

    for track in result["tracks_summary"]:
        tid = track["track_id"]
        cname = track["class_name"]
        start_t = track["start_time_seconds"]
        end_t = track["end_time_seconds"]
        history = track["bbox_history"]

        print(f"\nTrack #{tid} ({cname}) | Active: {start_t:.2f}s to {end_t:.2f}s | Length: {len(history)} frames")

        # Find matching payload
        event_match = None
        for payload in result["event_payloads"]:
            if payload["track_id"] == tid:
                event_match = payload
                break

        if event_match:
            meta = json.loads(event_match["metadata_json"])
            est_spd = meta.get("estimated_speed_kmh", 0.0)
            max_spd = meta.get("max_speed_kmh", 0.0)
            print(f"  --> HavenTrack Calculated Speed: {est_spd} km/h (Max: {max_spd} km/h)")

        print("  Trajectory Sample BBoxes:")
        for idx in range(0, len(history), max(1, len(history) // 5)):
            item = history[idx]
            b = item["bbox"]
            w = b["x2"] - b["x1"]
            h = b["y2"] - b["y1"]
            print(f"    t={item['timestamp_seconds']:.3f}s: x=[{b['x1']:.1f}, {b['x2']:.1f}], y=[{b['y1']:.1f}, {b['y2']:.1f}] (w={w:.1f}, h={h:.1f})")

if __name__ == "__main__":
    debug_highway_run()
