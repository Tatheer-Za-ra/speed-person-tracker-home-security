# scratch/check_speeds.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Event, Video, ProcessingLog

def check_video_speeds():
    db = get_db_session()
    
    # Fetch latest processed video
    video = db.query(Video).order_by(Video.id.desc()).first()
    if not video:
        print("No videos found in database.")
        return

    print(f"--- Speed & Event Telemetry Report for Video ID {video.id}: '{video.original_filename}' ---")
    
    events = db.query(Event).filter(Event.video_id == video.id).order_by(Event.timestamp_seconds.asc()).all()
    
    if not events:
        print("No events found for this video.")
        return

    print(f"Total Security Events Recorded: {len(events)}\n")
    print(f"{'Track ID':<10} | {'Type':<18} | {'Label':<10} | {'Time (s)':<10} | {'Est. Speed':<12} | {'Max Speed':<12} | {'Alert?':<8}")
    print("-" * 90)

    for ev in events:
        meta = {}
        if ev.metadata_json:
            try:
                meta = json.loads(ev.metadata_json)
            except Exception:
                pass

        est_spd = f"{meta.get('estimated_speed_kmh', 0.0)} km/h" if "estimated_speed_kmh" in meta else "N/A"
        max_spd = f"{meta.get('max_speed_kmh', 0.0)} km/h" if "max_speed_kmh" in meta else "N/A"
        alert_str = "ALERT!" if ev.is_alert else "Normal"

        print(f"{ev.track_id or 'N/A':<10} | {ev.event_type:<18} | {ev.label or 'N/A':<10} | {ev.timestamp_seconds:<10.1f} | {est_spd:<12} | {max_spd:<12} | {alert_str:<8}")

if __name__ == "__main__":
    check_video_speeds()
