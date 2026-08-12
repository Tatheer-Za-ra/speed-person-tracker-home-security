# scratch/check_logs.py

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Video, ProcessingLog

def check_logs():
    db = get_db_session()
    logs = db.query(ProcessingLog).order_by(ProcessingLog.id.desc()).all()
    print(f"Total processing logs: {len(logs)}")
    for l in logs[:10]:
        v = db.query(Video).filter(Video.id == l.video_id).first()
        name = v.original_filename if v else "Unknown"
        print(f"Log #{l.id} | Video #{l.video_id} '{name}' | Status: {l.status} | Msg: {l.message}")

if __name__ == "__main__":
    check_logs()
