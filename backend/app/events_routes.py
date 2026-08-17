# backend/app/events_routes.py

import json
from pathlib import Path
from flask import Blueprint, jsonify, request, session
from app.auth.service import login_required
from app.db import get_db_session
from app.repositories import EventRepository, SnapshotRepository, VideoRepository

events_bp = Blueprint("events_bp", __name__, url_prefix="/api/events")


def _format_event(event, snapshot_repo, video_repo=None) -> dict:
    """Format event record for JSON response, attaching metadata, snapshot URL & video title."""
    snapshot = snapshot_repo.get_snapshot_by_event_id(event.id)
    snapshot_url = None

    if snapshot and snapshot.file_path:
        # Convert absolute/relative storage file path to web accessible media route
        filename = Path(snapshot.file_path).name
        video_dir_name = Path(snapshot.file_path).parent.name
        snapshot_url = f"/media/snapshots/{video_dir_name}/{filename}"

    metadata = {}
    if event.metadata_json:
        try:
            metadata = json.loads(event.metadata_json)
        except Exception:
            metadata = {}

    video_title = None
    if video_repo and event.video_id:
        v = video_repo.get_video_by_id(event.video_id)
        if v:
            video_title = v.original_filename

    return {
        "id": event.id,
        "video_id": event.video_id,
        "video_title": video_title or f"Video #{event.video_id}",
        "track_id": event.track_id,
        "event_type": event.event_type,
        "label": event.label,
        "timestamp_seconds": round(event.timestamp_seconds, 2),
        "confidence": round(event.confidence, 4) if event.confidence is not None else None,
        "is_alert": event.is_alert,
        "metadata": metadata,
        "snapshot_url": snapshot_url,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


@events_bp.route("", methods=["GET"])
@login_required
def list_events():
    """
    UC-09 / SF-09 / SF-10: List timeline events with dynamic filter parameters.
    """
    user_id = session.get("user_id")
    video_id_param = request.args.get("video_id", type=int)
    event_type = request.args.get("event_type", type=str)
    label = request.args.get("label", type=str)
    is_alert_raw = request.args.get("is_alert", type=str)

    is_alert = None
    if is_alert_raw is not None:
        is_alert = is_alert_raw.lower() in {"true", "1", "yes"}

    limit = request.args.get("limit", default=100, type=int)
    offset = request.args.get("offset", default=0, type=int)

    db = get_db_session()
    event_repo = EventRepository(db)
    snapshot_repo = SnapshotRepository(db)
    video_repo = VideoRepository(db)

    events = event_repo.get_filtered_events(
        user_id=user_id,
        video_id=video_id_param,
        event_type=event_type,
        label=label,
        is_alert=is_alert,
        limit=limit,
        offset=offset,
    )

    formatted = [_format_event(ev, snapshot_repo, video_repo) for ev in events]

    return jsonify({
        "status": "success",
        "count": len(formatted),
        "events": formatted,
    }), 200


@events_bp.route("/alerts", methods=["GET"])
@login_required
def list_alerts():
    """
    UC-10 / SF-11: Priority security alerts feed.
    """
    user_id = session.get("user_id")
    limit = request.args.get("limit", default=50, type=int)

    db = get_db_session()
    event_repo = EventRepository(db)
    snapshot_repo = SnapshotRepository(db)
    video_repo = VideoRepository(db)

    alerts = event_repo.get_alert_events(user_id=user_id, limit=limit)
    formatted = [_format_event(ev, snapshot_repo, video_repo) for ev in alerts]

    return jsonify({
        "status": "success",
        "count": len(formatted),
        "alerts": formatted,
    }), 200


@events_bp.route("/summary", methods=["GET"])
@login_required
def event_summary():
    """
    UC-11 / SF-12: Aggregated security statistics overview.
    """
    user_id = session.get("user_id")
    db = get_db_session()
    event_repo = EventRepository(db)
    snapshot_repo = SnapshotRepository(db)

    stats = event_repo.get_summary_stats(user_id=user_id)

    # Fetch top 5 recent alerts for quick dashboard highlight
    recent_alerts = event_repo.get_alert_events(user_id=user_id, limit=5)
    stats["recent_alerts"] = [_format_event(ev, snapshot_repo) for ev in recent_alerts]

    return jsonify({
        "status": "success",
        "summary": stats,
    }), 200
