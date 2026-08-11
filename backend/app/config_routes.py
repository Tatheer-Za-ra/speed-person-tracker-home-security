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


@config_bp.route("/retention", methods=["GET"])
@login_required
def get_retention_config():
    """
    Day 6: Retrieve retention policy configuration & storage stats.
    """
    db = get_db_session()
    try:
        settings = get_retention_settings(db)
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
        updated = update_retention_settings(db, days_val)
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
    Day 6: Trigger an immediate manual storage retention cleanup.
    """
    db = get_db_session()
    try:
        result = run_retention_cleanup(db)
        return jsonify({
            "status": "success",
            "message": result["message"],
            "result": result,
        }), 200
    finally:
        db.close()
