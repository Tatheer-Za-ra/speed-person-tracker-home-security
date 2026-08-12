# scratch/check_video28_events.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Event, Video, ProcessingLog

def inspect_video28():
    db = get_db_session()
    videos = db.query(Video).order_by(Video.id.desc()).all()
    print(f"Total videos in DB: {len(videos)}")
    for v in videos[:10]:
        events = db.query(Event).filter(Event.video_id == v.id).all()
        print(f"\n=== Video ID #{v.id}: '{v.original_filename}' (Stored: {v.stored_path}) | Events: {len(events)} ===")
        for ev in events:
            meta = json.loads(ev.metadata_json or "{}")
            spd = meta.get("estimated_speed_kmh", 0.0)
            max_spd = meta.get("max_speed_kmh", 0.0)
            print(f"  Event #{ev.id} | Track #{ev.track_id} | Label: {ev.label} | Time: {ev.timestamp_seconds:.1f}s | Speed: {spd} km/h (Max: {max_spd} km/h)")

if __name__ == "__main__":
    inspect_video28()
