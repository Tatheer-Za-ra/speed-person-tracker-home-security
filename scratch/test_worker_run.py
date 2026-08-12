# scratch/test_worker_run.py

import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Video, ProcessingLog, Event
from app.videos.service import VideoService
from app.processing.worker import ProcessingWorker

def test_full_pipeline():
    db = get_db_session()

    # Create a fresh video entry for Site 1 video
    test_video_path = "storage/uploads/videos/Labeled_test_video_26d2b9eefff4.mp4"
    if not Path(test_video_path).exists():
        print(f"File {test_video_path} does not exist.")
        return

    v = Video(
        batch_id=1,
        original_filename="Labeled_test_video_26d2b9eefff4.mp4",
        stored_path=test_video_path
    )
    db.add(v)
    db.commit()
    db.refresh(v)

    l = ProcessingLog(
        video_id=v.id,
        status="queued",
        message="Queued for automated AI test run"
    )
    db.add(l)
    db.commit()

    print(f"=== Running ProcessingWorker for Video #{v.id} '{v.original_filename}' ===")
    worker = ProcessingWorker()
    res = worker.process_next_queued_video()
    print("Worker result message:", res.get("message"))

    # Inspect events generated for this video
    events = db.query(Event).filter(Event.video_id == v.id).all()
    print(f"\n=== Events Generated in DB for Video #{v.id}: {len(events)} ===")
    for ev in events:
        meta = json.loads(ev.metadata_json or "{}")
        spd = meta.get("estimated_speed_kmh", 0.0)
        max_spd = meta.get("max_speed_kmh", 0.0)
        st = meta.get("speed_status", "")
        print(f"  Event #{ev.id} | Track #{ev.track_id} | Label: {ev.label} | Time: {ev.timestamp_seconds:.1f}s | Speed: {spd} km/h (Max: {max_spd} km/h) | Status: {st}")

if __name__ == "__main__":
    test_full_pipeline()
