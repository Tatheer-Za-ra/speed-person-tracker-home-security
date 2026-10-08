# backend/app/reports_routes.py

from flask import Blueprint, request, Response, jsonify, session
from app.auth.service import login_required
from app.db import get_db_session
from app.repositories import EventRepository, SnapshotRepository, VideoRepository, UploadBatchRepository, KnownPersonRepository
from app.events_routes import _format_event
from app.report_service import generate_pdf_report, generate_csv_report

reports_bp = Blueprint("reports_bp", __name__, url_prefix="/api/reports")


def _get_events_for_request(request_args):
    """
    Helper to fetch and format events matching request filter parameters.
    Supports:
    - scope="single": generates report strictly for video_id.
    - scope="batch" (or explicit batch_id): generates report for all videos in that batch (using batch_id or looking up video.batch_id).
    - If neither video_id nor batch_id is specified, defaults to the user's latest upload batch or activity.
    """
    def _safe_int(val):
        if val is None:
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    user_id = session.get("user_id")
    video_id = _safe_int(request_args.get("video_id"))
    batch_id = _safe_int(request_args.get("batch_id"))
    scope = request_args.get("scope")
    if scope:
        scope = str(scope).lower().strip()
    event_type = request_args.get("event_type")
    label = request_args.get("label")
    is_alert_raw = request_args.get("is_alert")

    is_alert = None
    if is_alert_raw is not None:
        is_alert = is_alert_raw.lower() in {"true", "1", "yes"}

    db = get_db_session()
    event_repo = EventRepository(db)
    snapshot_repo = SnapshotRepository(db)
    video_repo = VideoRepository(db)
    batch_repo = UploadBatchRepository(db)
    person_repo = KnownPersonRepository(db)

    events = []
    scope_desc = "Latest Activity"

    # Determine if this request targets batch scope
    if scope == "single":
        is_batch_scope = False
    elif scope == "batch":
        is_batch_scope = True
    else:
        is_batch_scope = (batch_id is not None and not video_id)

    if is_batch_scope:
        # Resolve batch_id if not explicitly provided
        target_batch_id = batch_id
        if not target_batch_id and video_id:
            v_ref = video_repo.get_video_by_id(video_id, user_id=user_id)
            if v_ref:
                target_batch_id = v_ref.batch_id

        if not target_batch_id and not video_id and user_id:
            latest_batch = batch_repo.get_latest_batch_for_user(user_id)
            if latest_batch:
                target_batch_id = latest_batch.id

        target_videos = []
        if target_batch_id:
            target_videos = video_repo.get_videos_by_batch_id(target_batch_id)

        if target_videos:
            for v in target_videos:
                events.extend(
                    event_repo.get_filtered_events(
                        user_id=user_id,
                        video_id=v.id,
                        event_type=event_type,
                        label=label,
                        is_alert=is_alert,
                        limit=500,
                        offset=0,
                    )
                )
            if len(target_videos) == 1:
                scope_desc = f'Entire Upload Session ("{target_videos[0].original_filename}")'
            else:
                names_summary = ", ".join([f'"{v.original_filename}"' for v in target_videos[:3]])
                if len(target_videos) > 3:
                    names_summary += f", +{len(target_videos) - 3} more"
                scope_desc = f"Entire Upload Session ({len(target_videos)} Videos: {names_summary})"
        else:
            # Fallback if no batch found
            events = event_repo.get_filtered_events(
                user_id=user_id,
                event_type=event_type,
                label=label,
                is_alert=is_alert,
                limit=500,
                offset=0,
            )
            scope_desc = "Entire Upload Session"

    elif video_id:
        # Single video scope
        v = video_repo.get_video_by_id(video_id, user_id=user_id)
        if v:
            events = event_repo.get_filtered_events(
                user_id=user_id,
                video_id=video_id,
                event_type=event_type,
                label=label,
                is_alert=is_alert,
                limit=500,
                offset=0,
            )
            scope_desc = f'Video: "{v.original_filename}"'
        else:
            scope_desc = "Single Video Run"

    else:
        # Fallback when neither video_id nor batch_id is given: latest upload batch for user
        latest_batch = batch_repo.get_latest_batch_for_user(user_id) if user_id else None
        target_videos = []
        if latest_batch:
            target_videos = video_repo.get_videos_by_batch_id(latest_batch.id)

        if not target_videos and user_id:
            all_v = video_repo.get_all_videos(user_id=user_id)
            if all_v:
                target_videos = [all_v[-1]]

        if target_videos:
            for v in target_videos:
                events.extend(
                    event_repo.get_filtered_events(
                        user_id=user_id,
                        video_id=v.id,
                        event_type=event_type,
                        label=label,
                        is_alert=is_alert,
                        limit=300,
                        offset=0,
                    )
                )
            if len(target_videos) == 1:
                scope_desc = f'Entire Upload Session ("{target_videos[0].original_filename}")'
            else:
                names_summary = ", ".join([f'"{v.original_filename}"' for v in target_videos[:3]])
                if len(target_videos) > 3:
                    names_summary += f", +{len(target_videos) - 3} more"
                scope_desc = f"Entire Upload Session ({len(target_videos)} Videos: {names_summary})"
        else:
            events = event_repo.get_filtered_events(
                user_id=user_id,
                event_type=event_type,
                label=label,
                is_alert=is_alert,
                limit=500,
                offset=0,
            )
            scope_desc = "Entire Upload Session"

    video_cache = {}
    person_cache = {}
    formatted_events = [
        _format_event(ev, snapshot_repo, video_repo, video_cache=video_cache, person_repo=person_repo, person_cache=person_cache)
        for ev in events
    ]
    return formatted_events, scope_desc


@reports_bp.route("/scope-info", methods=["GET"])
@login_required
def get_report_scope_info():
    """
    Returns contextual human-friendly metadata about the active video and its upload session (batch)
    so the UI can clearly display sibling video names without exposing internal batch IDs.
    """
    def _safe_int(val):
        if val is None:
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    user_id = session.get("user_id")
    video_id = _safe_int(request.args.get("video_id"))
    batch_id = _safe_int(request.args.get("batch_id"))

    db = get_db_session()
    try:
        video_repo = VideoRepository(db)
        batch_repo = UploadBatchRepository(db)

        current_video = None
        if video_id:
            current_video = video_repo.get_video_by_id(video_id, user_id=user_id)
            if current_video and not batch_id:
                batch_id = current_video.batch_id

        if not batch_id and not video_id and user_id:
            latest_batch = batch_repo.get_latest_batch_for_user(user_id)
            if latest_batch:
                batch_id = latest_batch.id

        batch_videos = []
        if batch_id:
            batch_videos = video_repo.get_videos_by_batch_id(batch_id)
        elif current_video:
            batch_videos = [current_video]

        filenames = [v.original_filename for v in batch_videos]
        count = len(filenames)

        def _fmt_name(fn, max_len=30):
            if not fn:
                return ""
            if len(fn) > max_len:
                return fn[:max_len - 6] + "..." + fn[-4:]
            return fn

        fmt_filenames = [_fmt_name(f) for f in filenames]

        if count > 1:
            if count <= 2:
                files_str = ", ".join([f'"{f}"' for f in fmt_filenames])
                session_label = f"Entire Upload Session ({count} videos: {files_str})"
            else:
                files_str = ", ".join([f'"{f}"' for f in fmt_filenames[:2]]) + f", +{count - 2} more"
                session_label = f"Entire Upload Session ({count} videos: {files_str})"
        elif count == 1:
            session_label = f'Entire Upload Session (Single video: "{fmt_filenames[0]}")'
        else:
            session_label = "Entire Upload Session"

        current_video_label = None
        if current_video:
            current_video_label = f'Current Video Run ("{_fmt_name(current_video.original_filename)}")'

        return jsonify({
            "status": "success",
            "video_id": video_id,
            "batch_id": batch_id,
            "video_filename": current_video.original_filename if current_video else None,
            "current_video_label": current_video_label,
            "batch_video_count": count,
            "batch_filenames": filenames,
            "session_label": session_label,
        }), 200
    finally:
        db.close()


@reports_bp.route("/pdf", methods=["GET"])
@login_required
def download_pdf_report():
    """
    SF-12 / UC-12: Generate & stream downloadable PDF Security Audit Report.
    """
    try:
        events, scope_desc = _get_events_for_request(request.args)
        filter_info = {"scope_description": scope_desc}

        pdf_bytes = generate_pdf_report(events, filter_info)

        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="security_audit_report.pdf"',
                "Content-Type": "application/pdf",
            },
        )
    except Exception as e:
        print("PDF Generation Error:", e)
        return jsonify({"status": "error", "message": f"Could not generate PDF report: {str(e)}"}), 500


@reports_bp.route("/csv", methods=["GET"])
@login_required
def download_csv_report():
    """
    SF-12 / UC-12: Generate & stream downloadable CSV Security Event Log.
    """
    try:
        events, _ = _get_events_for_request(request.args)
        csv_string = generate_csv_report(events)

        return Response(
            csv_string,
            mimetype="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="security_audit_log.csv"',
                "Content-Type": "text/csv; charset=utf-8",
            },
        )
    except Exception as e:
        print("CSV Generation Error:", e)
        return jsonify({"status": "error", "message": f"Could not generate CSV export: {str(e)}"}), 500
