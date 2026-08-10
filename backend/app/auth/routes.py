from flask import Blueprint, jsonify, request, session

from app.auth.service import hash_password, verify_password
from app.db import get_db_session
from app.repositories import UserRepository

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    db = get_db_session()
    try:
        user_repo = UserRepository(db)

        existing_user = user_repo.get_by_email(email)
        if existing_user:
            return jsonify({"error": "Email already registered"}), 409

        user = user_repo.create_user(
            name=name,
            email=email,
            password_hash=hash_password(password),
        )

        session["user_id"] = user.id

        return jsonify({
            "message": "User created successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            }
        }), 201
    finally:
        db.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db = get_db_session()
    try:
        user_repo = UserRepository(db)
        user = user_repo.get_by_email(email)

        if not user or not verify_password(password, user.password_hash):
            return jsonify({"error": "Invalid email or password"}), 401

        session["user_id"] = user.id

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            }
        }), 200
    finally:
        db.close()


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logout successful"}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    db = get_db_session()
    try:
        user = db.get(__import__("app.models", fromlist=["User"]).User, user_id)
        if not user:
            session.pop("user_id", None)
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            }
        }), 200
    finally:
        db.close()