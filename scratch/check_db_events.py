# scratch/check_db_events.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Event, Video, ProcessingLog

def inspect_latest_run_events():
    db = get_db_session()
    ev = db.query(Event).filter(Event.id == 37).first()
    if ev:
        print(f"=== Event #37 Metadata JSON ===")
        print(ev.metadata_json)

if __name__ == "__main__":
    inspect_latest_run_events()
