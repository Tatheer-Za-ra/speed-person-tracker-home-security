# backend/app/config_routes.py

from flask import Blueprint, jsonify, request, session
from app.auth.service import login_required
from app.db import get_db_session
from app.repositories import SpeedThresholdRepository

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
