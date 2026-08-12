# scratch/debug_speed_comparison.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Event, Video
from app.ai_pipeline.speed_calculator import (
    calculate_track_speed,
    DEFAULT_METERS_PER_PIXEL,
    DEFAULT_CAMERA_CALIBRATION,
)

def compare_speeds_for_latest_video():
    db = get_db_session()
    video = db.query(Video).order_by(Video.id.desc()).first()
    if not video:
        print("No video found.")
        return

    print(f"--- Speed Calculation Comparison for Video ID {video.id} ({video.original_filename}) ---")
    events = db.query(Event).filter(Event.video_id == video.id).all()

    for ev in events:
        if not ev.metadata_json:
            continue
        meta = json.loads(ev.metadata_json)
        est_stored = meta.get("estimated_speed_kmh", 0.0)
        max_stored = meta.get("max_speed_kmh", 0.0)

        print(f"\nEvent ID: {ev.id} | Track ID: {ev.track_id} | Label: {ev.label}")
        print(f"Stored DB Speed: {est_stored} km/h (Max: {max_stored} km/h)")

if __name__ == "__main__":
    compare_speeds_for_latest_video()
