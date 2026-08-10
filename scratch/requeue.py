# scratch/requeue.py

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import ProcessingLog

def requeue_failed():
    db = get_db_session()
    logs = db.query(ProcessingLog).filter(ProcessingLog.status == "failed").all()
    for log in logs:
        log.status = "queued"
        log.message = "Requeued for processing"
    db.commit()
    print(f"Successfully requeued {len(logs)} failed video(s).")

if __name__ == "__main__":
    requeue_failed()
