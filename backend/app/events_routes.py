# backend/app/events_routes.py

import json
from pathlib import Path
from flask import Blueprint, jsonify, request, session
from app.auth.service import login_required
from app.db import get_db_session
from app.repositories import EventRepository, SnapshotRepository, VideoRepository, SpeedThresholdRepository

events_bp = Blueprint("events_bp", __name__, url_prefix="/api/events")


def _format_event(event, snapshot_repo, video_repo=None, video_cache=None, speed_thresholds=None) -> dict:
    """Format event record for JSON response, attaching metadata, snapshot URL, video title & calculated footage timestamp."""
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

    is_alert = event.is_alert
    if speed_thresholds and event.label in speed_thresholds:
        limit_kmh = float(speed_thresholds[event.label])
        metadata["speed_limit_kmh"] = limit_kmh
        spd = float(metadata.get("estimated_speed_kmh") or 0.0)
        if spd > 0:
            is_overspeed = spd > limit_kmh
            metadata["speed_status"] = "OVERSPEED" if is_overspeed else "NORMAL"
            if event.label != "person":
                is_alert = is_overspeed

    video_title = None
    recording_start_time = None
    duration_seconds = None
    calculated_timestamp = None

    if video_repo and event.video_id:
        v = None
        if video_cache is not None and event.video_id in video_cache:
            v = video_cache[event.video_id]
        else:
            v = video_repo.get_video_by_id(event.video_id)
            if video_cache is not None:
                video_cache[event.video_id] = v

        if v:
            video_title = v.original_filename
            ref_start = v.recording_start_time
            if ref_start:
                from datetime import timedelta
                recording_start_time = ref_start.isoformat()
                calc_dt = ref_start + timedelta(seconds=float(event.timestamp_seconds or 0.0))
                calculated_timestamp = calc_dt.isoformat()
            if v.duration_seconds is not None:
                duration_seconds = round(v.duration_seconds, 2)

    return {
        "id": event.id,
        "video_id": event.video_id,
        "video_title": video_title or f"Video #{event.video_id}",
        "track_id": event.track_id,
        "event_type": event.event_type,
        "label": event.label,
        "timestamp_seconds": round(event.timestamp_seconds, 2),
        "recording_start_time": recording_start_time,
        "calculated_timestamp": calculated_timestamp,
        "duration_seconds": duration_seconds,
        "confidence": round(event.confidence, 4) if event.confidence is not None else None,
        "is_alert": is_alert,
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
    try:
        event_repo = EventRepository(db)
        snapshot_repo = SnapshotRepository(db)
        video_repo = VideoRepository(db)
        speed_repo = SpeedThresholdRepository(db)
        speed_thresholds = speed_repo.get_threshold_map(user_id) if user_id else speed_repo.get_threshold_map(1)

        events = event_repo.get_filtered_events(
            user_id=user_id,
            video_id=video_id_param,
            event_type=event_type,
            label=label,
            is_alert=is_alert,
            limit=limit,
            offset=offset,
        )

        video_cache = {}
        formatted = [_format_event(ev, snapshot_repo, video_repo, video_cache=video_cache, speed_thresholds=speed_thresholds) for ev in events]

        return jsonify({
            "status": "success",
            "count": len(formatted),
            "events": formatted,
        }), 200
    finally:
        db.close()


@events_bp.route("/alerts", methods=["GET"])
@login_required
def list_alerts():
    """
    UC-10 / SF-11: Priority security alerts feed.
    """
    user_id = session.get("user_id")
    limit = request.args.get("limit", default=50, type=int)

    db = get_db_session()
    try:
        event_repo = EventRepository(db)
        snapshot_repo = SnapshotRepository(db)
        video_repo = VideoRepository(db)
        speed_repo = SpeedThresholdRepository(db)
        speed_thresholds = speed_repo.get_threshold_map(user_id) if user_id else speed_repo.get_threshold_map(1)

        alerts = event_repo.get_alert_events(user_id=user_id, limit=limit)
        video_cache = {}
        formatted = [_format_event(ev, snapshot_repo, video_repo, video_cache=video_cache, speed_thresholds=speed_thresholds) for ev in alerts]

        return jsonify({
            "status": "success",
            "count": len(formatted),
            "alerts": formatted,
        }), 200
    finally:
        db.close()


@events_bp.route("/summary", methods=["GET"])
@login_required
def event_summary():
    """
    UC-11 / SF-12: Aggregated security statistics overview.
    """
    user_id = session.get("user_id")
    db = get_db_session()
    try:
        event_repo = EventRepository(db)
        snapshot_repo = SnapshotRepository(db)
        speed_repo = SpeedThresholdRepository(db)
        speed_thresholds = speed_repo.get_threshold_map(user_id) if user_id else speed_repo.get_threshold_map(1)

        stats = event_repo.get_summary_stats(user_id=user_id)

        # Fetch top 5 recent alerts for quick dashboard highlight
        recent_alerts = event_repo.get_alert_events(user_id=user_id, limit=5)
        stats["recent_alerts"] = [_format_event(ev, snapshot_repo, speed_thresholds=speed_thresholds) for ev in recent_alerts]

        return jsonify({
            "status": "success",
            "summary": stats,
        }), 200
    finally:
        db.close()


@events_bp.route("/analytics", methods=["GET"])
@login_required
def event_analytics():
    """
    Expanded security analytics: peak rush hours, speed violations matrix,
    hourly distribution, day of week patterns, and identity threat metrics.
    """
    from datetime import datetime, timedelta, date

    user_id = session.get("user_id")
    video_id = request.args.get("video_id", type=int)
    start_date = request.args.get("start_date", type=str)
    end_date = request.args.get("end_date", type=str)
    preset = request.args.get("preset", type=str)

    today = date.today()
    if preset == "7d":
        start_date = (today - timedelta(days=7)).isoformat()
    elif preset == "30d":
        start_date = (today - timedelta(days=30)).isoformat()
    elif preset == "this_month":
        start_date = date(today.year, today.month, 1).isoformat()

    db = get_db_session()
    try:
        event_repo = EventRepository(db)
        analytics = event_repo.get_analytics_stats(
            user_id=user_id,
            video_id=video_id,
            start_date=start_date,
            end_date=end_date,
        )

        video_meta = None
        if video_id:
            video_repo = VideoRepository(db)
            v = video_repo.get_video_by_id(video_id, user_id=user_id)
            if v:
                video_meta = {
                    "id": v.id,
                    "original_filename": v.original_filename,
                    "recording_start_time": v.recording_start_time.isoformat() if v.recording_start_time else None,
                    "duration_seconds": v.duration_seconds,
                }

        analytics["video_meta"] = video_meta
        analytics["filters"] = {
            "video_id": video_id,
            "start_date": start_date,
            "end_date": end_date,
            "preset": preset or "all",
        }

        return jsonify({
            "status": "success",
            "analytics": analytics,
        }), 200
    finally:
        db.close()

