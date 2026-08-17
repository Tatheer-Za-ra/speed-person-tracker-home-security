# backend/app/config_routes.py

from flask import Blueprint, jsonify, request, session
from app.auth.service import login_required
from app.db import get_db_session
from app.repositories import SpeedThresholdRepository
from app.retention_service import get_retention_settings, update_retention_settings, run_retention_cleanup

config_bp = Blueprint("config_bp", __name__, url_prefix="/api/config")


@config_bp.route("/speed-thresholds", methods=["GET"])
@login_required
def get_speed_thresholds():
    user_id = session.get("user_id") or 1
    db = get_db_session()
    repo = SpeedThresholdRepository(db)

    thresholds = repo.get_threshold_map(user_id)
    return jsonify({
        "status": "success",
        "thresholds": thresholds
    }), 200


@config_bp.route("/speed-thresholds", methods=["PUT"])
@login_required
def update_speed_thresholds():
    """
    SF-02: Validate Speed Threshold Input.
    Expects JSON body: { "car": 30.0, "motorcycle": 40.0, "truck": 25.0 }
    """
    user_id = session.get("user_id") or 1
    data = request.get_json() or {}

    if not data or not isinstance(data, dict):
        return jsonify({"status": "error", "message": "Invalid configuration payload"}), 400

    db = get_db_session()
    repo = SpeedThresholdRepository(db)
    updated = {}

    allowed_categories = {"car", "motorcycle", "truck"}

    for category, val in data.items():
        if category not in allowed_categories:
            continue

        try:
            limit_val = float(val)
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": f"Speed limit for '{category}' must be a valid positive number."
            }), 400

        if limit_val <= 0:
            return jsonify({
                "status": "error",
                "message": f"Speed limit for '{category}' value must be positive."
            }), 400

        record = repo.set_threshold_for_user(user_id, category, limit_val)
        updated[category] = float(record.limit_kmh)

    return jsonify({
        "status": "success",
        "message": "Speed thresholds updated successfully.",
        "thresholds": repo.get_threshold_map(user_id)
    }), 200


def get_camera_calibration_config(db, user_id=None):
    """Retrieves camera position calibration from DB or default configuration."""
    from app.models import Config
    from app.ai_pipeline.speed_calculator import DEFAULT_CAMERA_CALIBRATION
    import json

    key = f"camera_calibration_user_{user_id}" if user_id else "camera_calibration"
    row = db.query(Config).filter(Config.key == key).first()
    if not row and user_id:
        row = db.query(Config).filter(Config.key == "camera_calibration").first()
    if not row or not row.value:
        return DEFAULT_CAMERA_CALIBRATION
    try:
        val = json.loads(row.value)
        return {**DEFAULT_CAMERA_CALIBRATION, **val}
    except Exception:
        return DEFAULT_CAMERA_CALIBRATION


def set_camera_calibration_config(db, data: dict, user_id=None):
    """Updates camera position calibration settings in DB."""
    from app.models import Config
    from app.ai_pipeline.speed_calculator import DEFAULT_CAMERA_CALIBRATION
    import json

    key = f"camera_calibration_user_{user_id}" if user_id else "camera_calibration"
    row = db.query(Config).filter(Config.key == key).first()
    merged = {**DEFAULT_CAMERA_CALIBRATION, **data}
    if not row:
        row = Config(key=key, value=json.dumps(merged))
        db.add(row)
    else:
        row.value = json.dumps(merged)
    db.commit()
    return merged


def recalculate_all_event_speeds(db, user_id=None):
    """Re-runs speed calculation across vehicle events using active camera calibration."""
    from app.models import Event, Video, UploadBatch
    from app.ai_pipeline.speed_calculator import calculate_track_speed
    from app.repositories import SpeedThresholdRepository
    import json

    camera_params = get_camera_calibration_config(db, user_id=user_id)
    speed_repo = SpeedThresholdRepository(db)

    query = db.query(Event).filter(Event.label.in_(["car", "motorcycle", "truck"]))
    if user_id is not None:
        query = query.join(Video, Event.video_id == Video.id).join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
        speed_limits = speed_repo.get_threshold_map(user_id)
    else:
        speed_limits = speed_repo.get_threshold_map(1)

    events = query.all()
    recalculated_count = 0

    for ev in events:
        if not ev.metadata_json:
            continue
        try:
            meta = json.loads(ev.metadata_json)
            bbox_history = meta.get("bbox_history", [])
            if not bbox_history or len(bbox_history) < 2:
                continue

            calculated = calculate_track_speed(bbox_history, fps=25.0, camera_params=camera_params, class_name=ev.label)
            limit_kmh = float(speed_limits.get(ev.label, 30.0))

            speed_status = "OVERSPEED" if (calculated["valid"] and calculated["estimated_speed_kmh"] > limit_kmh) else "NORMAL"
            ev.is_alert = (speed_status == "OVERSPEED")

            meta["estimated_speed_kmh"] = calculated["estimated_speed_kmh"]
            meta["max_speed_kmh"] = calculated["max_speed_kmh"]
            meta["speed_status"] = speed_status

            ev.metadata_json = json.dumps(meta)
            recalculated_count += 1
        except Exception:
            continue

    db.commit()
    return recalculated_count


@config_bp.route("/camera-calibration", methods=["GET"])
@login_required
def get_camera_calibration():
    """Retrieve camera position calibration geometry settings."""
    user_id = session.get("user_id")
    db = get_db_session()
    try:
        calibration = get_camera_calibration_config(db, user_id=user_id)
        return jsonify({
            "status": "success",
            "calibration": calibration
        }), 200
    finally:
        db.close()


@config_bp.route("/camera-calibration", methods=["PUT"])
@login_required
def update_camera_calibration():
    """Update camera position calibration parameters (height, tilt angle, FOV, scale correction)."""
    user_id = session.get("user_id")
    data = request.get_json() or {}
    if not isinstance(data, dict):
        return jsonify({"status": "error", "message": "Invalid configuration payload"}), 400

    db = get_db_session()
    try:
        updated = set_camera_calibration_config(db, data, user_id=user_id)
        recalculated_count = recalculate_all_event_speeds(db, user_id=user_id)
        return jsonify({
            "status": "success",
            "message": f"Camera calibration saved. Recalculated speed for {recalculated_count} recorded events.",
            "calibration": updated,
            "recalculated_events_count": recalculated_count
        }), 200
    finally:
        db.close()




@config_bp.route("/retention", methods=["GET"])
@login_required
def get_retention_config():
    """
    Day 6: Retrieve retention policy configuration & storage stats for user.
    """
    user_id = session.get("user_id")
    db = get_db_session()
    try:
        settings = get_retention_settings(db, user_id=user_id)
        return jsonify({"status": "success", "retention": settings}), 200
    finally:
        db.close()


@config_bp.route("/retention", methods=["PUT"])
@login_required
def update_retention_config():
    """
    Day 6: Update retention days threshold (0 = disabled, 7, 14, 30, 90).
    Expects JSON: { "retention_days": 14 }
    """
    user_id = session.get("user_id")
    data = request.get_json() or {}
    retention_days = data.get("retention_days")

    if retention_days is None:
        return jsonify({"status": "error", "message": "Field 'retention_days' is required."}), 400

    try:
        days_val = int(retention_days)
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Retention days must be an integer."}), 400

    if days_val < 0:
        return jsonify({"status": "error", "message": "Retention days must be non-negative (0 to disable)."}), 400

    db = get_db_session()
    try:
        updated = update_retention_settings(db, days_val, user_id=user_id)
        return jsonify({
            "status": "success",
            "message": "Retention policy updated successfully.",
            "retention": updated,
        }), 200
    finally:
        db.close()


@config_bp.route("/retention/run", methods=["POST"])
@login_required
def trigger_retention_cleanup_now():
    """
    Day 6: Trigger an immediate manual storage retention cleanup for active user.
    """
    user_id = session.get("user_id")
    db = get_db_session()
    try:
        result = run_retention_cleanup(db, user_id=user_id)
        return jsonify({
            "status": "success",
            "message": result["message"],
            "result": result,
        }), 200
    finally:
        db.close()
