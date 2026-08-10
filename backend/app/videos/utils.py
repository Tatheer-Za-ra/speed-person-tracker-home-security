import os
import uuid
from werkzeug.utils import secure_filename


def allowed_video(filename: str, allowed_extensions: set[str]) -> bool:
    if not filename or "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()
    return extension in allowed_extensions


def generate_unique_video_filename(filename: str) -> str:
    safe_name = secure_filename(filename)
    name, extension = os.path.splitext(safe_name)

    unique_id = uuid.uuid4().hex[:12]
    return f"{name}_{unique_id}{extension.lower()}"


def save_video_file(file_storage, upload_dir: str, stored_filename: str) -> str:
    os.makedirs(upload_dir, exist_ok=True)

    save_path = os.path.join(upload_dir, stored_filename)
    file_storage.save(save_path)

    return save_path