import hashlib
import os
from datetime import datetime

from flask import Blueprint, jsonify, request, session
from werkzeug.utils import secure_filename

from app.auth.service import login_required
from app.config import Config
from app.db import get_db_session
from app.known_persons.face_utils import create_initial_embedding, validate_and_extract_face
from app.repositories import FaceTemplateRepository, KnownPersonRepository

known_persons_bp = Blueprint(
    "known_persons",
    __name__,
    url_prefix="/api/known-persons"
)

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}


def allowed_image(filename: str) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_IMAGE_EXTENSIONS


def compute_image_hash(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()


def save_known_person_image(image_bytes: bytes, original_filename: str):
    originals_dir = os.path.join(Config.KNOWN_PERSONS_DIR, "originals")
    os.makedirs(originals_dir, exist_ok=True)

    safe_name = secure_filename(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    stored_filename = f"kp_{timestamp}_{safe_name}"
    saved_path = os.path.join(originals_dir, stored_filename)

    with open(saved_path, "wb") as f:
        f.write(image_bytes)

    return saved_path


@known_persons_bp.route("", methods=["GET"])
@login_required
def list_known_persons():
    user_id = session.get("user_id")
    db = get_db_session()

    try:
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        repo = KnownPersonRepository(db)
        persons = repo.list_all_for_user(user_id)

        return jsonify([
            {
                "id": person.id,
                "name": person.name,
                "category": person.category,
                "image_url": f"http://localhost:5000/media/known-persons/{os.path.basename(person.image_path)}",
            }
            for person in persons
        ]), 200
    finally:
        db.close()


@known_persons_bp.route("", methods=["POST"])
@login_required
def create_known_person():
    user_id = session.get("user_id")
    name = request.form.get("name", "").strip()
    category_raw = request.form.get("category", "").strip()
    category = category_raw or None
    image = request.files.get("image")

    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    if not name:
        return jsonify({"error": "Name is required"}), 400

    if not image or not image.filename:
        return jsonify({"error": "Image is required"}), 400

    if not allowed_image(image.filename):
        return jsonify({"error": "Only JPG, JPEG, and PNG images are allowed"}), 400

    image_bytes = image.read()
    image_hash = compute_image_hash(image_bytes)

    is_valid, validation_message, face_crop = validate_and_extract_face(image_bytes)
    if not is_valid:
        return jsonify({"error": validation_message}), 400

    normalized_name = name.strip().lower()
    normalized_category = category.strip().lower() if category else None

    db = get_db_session()
    try:
        person_repo = KnownPersonRepository(db)
        template_repo = FaceTemplateRepository(db)

        existing_duplicate = person_repo.find_duplicate(
            image_hash=image_hash,
        )
        if existing_duplicate:
            return jsonify({"error": "This known person already exists"}), 409

        embedding_data = create_initial_embedding(face_crop)
        saved_path = save_known_person_image(image_bytes, image.filename)

        person = person_repo.create_person(
            user_id=user_id,
            name=name,
            category=category,
            image_path=saved_path,
            image_hash=image_hash,
        )

        template_repo.upsert_template(person.id, embedding_data)

        return jsonify({
            "message": "Known person created successfully",
            "person": {
                "id": person.id,
                "name": person.name,
                "category": person.category,
                "image_url": f"http://localhost:5000/media/known-persons/{os.path.basename(person.image_path)}",
            }
        }), 201
    finally:
        db.close()


@known_persons_bp.route("/<int:person_id>", methods=["PUT"])
@login_required
def update_known_person(person_id):
    user_id = session.get("user_id")
    db = get_db_session()

    try:
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        person_repo = KnownPersonRepository(db)
        template_repo = FaceTemplateRepository(db)
        person = person_repo.get_by_id_for_user(person_id, user_id)

        if not person:
            return jsonify({"error": "Known person not found"}), 404

        name = request.form.get("name", "").strip()
        category_raw = request.form.get("category", "").strip()
        category = category_raw or None
        image = request.files.get("image")

        if not name:
            return jsonify({"error": "Name is required"}), 400

        new_image_path = None
        image_hash = person.image_hash

        normalized_name = name.strip().lower()
        normalized_category = category.strip().lower() if category else None

        if image and image.filename:
            if not allowed_image(image.filename):
                return jsonify({"error": "Only JPG, JPEG, and PNG images are allowed"}), 400

            image_bytes = image.read()
            image_hash = compute_image_hash(image_bytes)

            is_valid, validation_message, face_crop = validate_and_extract_face(image_bytes)
            if not is_valid:
                return jsonify({"error": validation_message}), 400

            existing_duplicate = person_repo.find_duplicate(
                image_hash=image_hash,
                exclude_id=person.id
            )
            if existing_duplicate:
                return jsonify({"error": "This known person already exists"}), 409

            embedding_data = create_initial_embedding(face_crop)
            new_image_path = save_known_person_image(image_bytes, image.filename)
            template_repo.upsert_template(person.id, embedding_data)

        else:
            existing_duplicate = person_repo.find_duplicate(
                image_hash=image_hash,
                exclude_id=person.id
            )
            if existing_duplicate:
                return jsonify({"error": "This known person already exists"}), 409

        updated_person = person_repo.update_person(
            person=person,
            name=name,
            category=category,
            image_path=new_image_path,
            image_hash=image_hash
        )

        return jsonify({
            "message": "Known person updated successfully",
            "person": {
                "id": updated_person.id,
                "name": updated_person.name,
                "category": updated_person.category,
                "image_url": f"http://localhost:5000/media/known-persons/{os.path.basename(updated_person.image_path)}",
            }
        }), 200

    finally:
        db.close()


@known_persons_bp.route("/<int:person_id>", methods=["DELETE"])
@login_required
def delete_known_person(person_id):
    user_id = session.get("user_id")
    db = get_db_session()

    try:
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        person_repo = KnownPersonRepository(db)
        template_repo = FaceTemplateRepository(db)
        person = person_repo.get_by_id_for_user(person_id, user_id)

        if not person:
            return jsonify({"error": "Known person not found"}), 404

        template_repo.delete_by_person_id(person.id)
        person_repo.delete_person(person)

        return jsonify({"message": "Known person deleted successfully"}), 200
    finally:
        db.close()