# scratch/debug_highway_video.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Video, Event, ProcessingLog

def inspect_highway_events():
    db = get_db_session()
    videos = db.query(Video).order_by(Video.id.desc()).all()
    print(f"Total videos in DB: {len(videos)}")

    for video in videos:
        events = db.query(Event).filter(Event.video_id == video.id).all()
        if not events:
            continue
        print(f"\n=== Video ID {video.id}: '{video.original_filename}' (Stored: {video.stored_path}) ===")
        print(f"Total events: {len(events)}")

        for ev in events:
            meta = json.loads(ev.metadata_json or "{}")
            bbox_history = meta.get("bbox_history", [])
            spd = meta.get("estimated_speed_kmh", 0.0)
            max_spd = meta.get("max_speed_kmh", 0.0)

            print(f"  Event ID: {ev.id} | Track ID: {ev.track_id} | Time: {ev.timestamp_seconds:.1f}s | Label: {ev.label}")
            print(f"  Speed: {spd} km/h (Max: {max_spd} km/h) | BBox History Length: {len(bbox_history)}")

            if bbox_history:
                print("  Sample Trajectory Points:")
                for item in bbox_history[:4]:
                    print(f"    t={item.get('timestamp_seconds'):.3f}s: {item.get('bbox')}")
                for item in bbox_history[-2:]:
                    print(f"    t={item.get('timestamp_seconds'):.3f}s: {item.get('bbox')}")

if __name__ == "__main__":
    inspect_highway_events()
