# backend/app/reports_routes.py

from flask import Blueprint, request, Response, jsonify
from app.auth.service import login_required
from app.db import get_db_session
from app.repositories import EventRepository, SnapshotRepository, VideoRepository
from app.events_routes import _format_event
from app.report_service import generate_pdf_report, generate_csv_report

reports_bp = Blueprint("reports_bp", __name__, url_prefix="/api/reports")


def _get_events_for_request(request_args):
    """Helper to fetch and format events matching request filter parameters."""
    video_id = request_args.get("video_id", type=int)
    event_type = request_args.get("event_type", type=str)
    label = request_args.get("label", type=str)
    is_alert_raw = request_args.get("is_alert", type=str)

    is_alert = None
    if is_alert_raw is not None:
        is_alert = is_alert_raw.lower() in {"true", "1", "yes"}

    db = get_db_session()
    event_repo = EventRepository(db)
    snapshot_repo = SnapshotRepository(db)
    video_repo = VideoRepository(db)

    events = event_repo.get_filtered_events(
        video_id=video_id,
        event_type=event_type,
        label=label,
        is_alert=is_alert,
        limit=500,  # Generous limit for report compilation
        offset=0,
    )

    formatted_events = [_format_event(ev, snapshot_repo, video_repo) for ev in events]

    scope_desc = "All Activity"
    if video_id:
        v = video_repo.get_video_by_id(video_id)
        if v:
            scope_desc = f"Video: {v.original_filename}"
        else:
            scope_desc = f"Video ID #{video_id}"

    return formatted_events, scope_desc


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
