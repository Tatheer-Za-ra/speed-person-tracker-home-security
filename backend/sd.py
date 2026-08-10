from app.db import get_db_session
from app.ai_pipeline.pipeline_service import analyze_video_frames
from app.repositories import EventRepository, SnapshotRepository
from app.ai_pipeline.event_snapshot import save_event_snapshot
import cv2

video_id = 1
video_path = r"C:\Users\PMLS\Videos\20 reels project\X6.mp4"

db = get_db_session()
event_repo = EventRepository(db)
snapshot_repo = SnapshotRepository(db)

result = analyze_video_frames(video_path, preview_limit=2)

created_event_ids = []
created_snapshot_ids = []

snapshot_payloads_by_track_id = {
    p["track_id"]: p for p in result.get("snapshot_payloads", [])
}

if result.get("status") == "success":
    # save events
    for payload in result.get("event_payloads", []):
        event = event_repo.create_event(
            video_id=video_id,
            track_id=payload.get("track_id"),
            event_type=payload.get("event_type"),
            label=payload.get("label"),
            timestamp_seconds=payload.get("timestamp_seconds"),
            confidence=payload.get("confidence"),
            metadata_json=payload.get("metadata_json"),
            is_alert=payload.get("is_alert", False),
        )
        created_event_ids.append(event.id)

    # only use the newly created events, not all old events for the video
    new_events = [event_repo.get_event_by_id(event_id) for event_id in created_event_ids]

    cap = cv2.VideoCapture(video_path)

    try:
        for event in new_events:
            if event is None:
                continue

            snapshot_payload = snapshot_payloads_by_track_id.get(event.track_id)
            if not snapshot_payload:
                continue

            frame_index = snapshot_payload["frame_index"]
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)

            ok, frame = cap.read()
            if not ok or frame is None:
                print(f"Could not read frame for event_id={event.id}, frame_index={frame_index}")
                continue

            snapshot_path = save_event_snapshot(
                video_id=video_id,
                event_id=event.id,
                frame=frame,
                bbox=snapshot_payload["bbox"],
                label=snapshot_payload["label"],
                track_id=event.track_id,
                timestamp_seconds=snapshot_payload["timestamp_seconds"],
            )

            snapshot = snapshot_repo.create_snapshot(
                event_id=event.id,
                file_path=snapshot_path,
            )
            created_snapshot_ids.append(snapshot.id)

    finally:
        cap.release()

print("status =", result.get("status"))
print("events_saved_count =", len(created_event_ids))
print("snapshots_saved_count =", len(created_snapshot_ids))
print("event_ids =", created_event_ids)
print("snapshot_ids =", created_snapshot_ids)
print("error =", result.get("error"))

db.close()