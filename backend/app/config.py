import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}")

    UPLOAD_DIR = os.getenv(
        "UPLOAD_DIR",
        os.path.join(BASE_DIR, "storage", "uploads", "videos"),
    )
    SNAPSHOT_DIR = os.getenv(
        "SNAPSHOT_DIR",
        os.path.join(BASE_DIR, "storage", "event_snapshots"),
    )
    REPORT_DIR = os.getenv(
        "REPORT_DIR",
        os.path.join(BASE_DIR, "storage", "reports"),
    )
    KNOWN_PERSONS_DIR = os.getenv(
        "KNOWN_PERSONS_DIR",
        os.path.join(BASE_DIR, "storage", "known_persons"),
    )
    TEMP_DIR = os.getenv(
        "TEMP_DIR",
        os.path.join(BASE_DIR, "storage", "temp"),
    )

    ALLOWED_VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "mkv"}
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB