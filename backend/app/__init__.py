import os
from flask import Flask, send_from_directory
from flask_cors import CORS

from app.auth.service import login_required
from app.config import Config
from app.auth.routes import auth_bp
from app.known_persons.routes import known_persons_bp
from app.videos.routes import videos_bp
from app.processing.routes import processing_bp
from app.config_routes import config_bp
from app.events_routes import events_bp
from app.reports_routes import reports_bp
from app.processing.scheduler import ProcessingScheduler

scheduler = ProcessingScheduler(interval_seconds=5)

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["UPLOAD_DIR"] = Config.UPLOAD_DIR
    app.config["SNAPSHOT_DIR"] = Config.SNAPSHOT_DIR
    app.config["REPORT_DIR"] = Config.REPORT_DIR
    app.config["KNOWN_PERSONS_DIR"] = Config.KNOWN_PERSONS_DIR
    app.config["TEMP_DIR"] = Config.TEMP_DIR
    app.config["ALLOWED_VIDEO_EXTENSIONS"] = Config.ALLOWED_VIDEO_EXTENSIONS
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH

    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)
    os.makedirs(app.config["SNAPSHOT_DIR"], exist_ok=True)
    os.makedirs(app.config["REPORT_DIR"], exist_ok=True)
    os.makedirs(app.config["KNOWN_PERSONS_DIR"], exist_ok=True)
    os.makedirs(app.config["TEMP_DIR"], exist_ok=True)

    CORS(
        app,
        supports_credentials=True,
        origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(known_persons_bp)

    @app.route("/media/known-persons/<path:filename>")
    def serve_known_person_image(filename):
        originals_dir = os.path.join(app.config["KNOWN_PERSONS_DIR"], "originals")
        return send_from_directory(originals_dir, filename)

    @app.route("/media/snapshots/<path:filename>")
    def serve_event_snapshot_image(filename):
        return send_from_directory(app.config["SNAPSHOT_DIR"], filename)

    @app.route("/")
    def health_check():
        return {"message": "Backend is running"}

    @app.route("/api/dashboard")
    @login_required
    def dashboard_shell():
        return {"message": "Welcome to dashboard"}

    app.register_blueprint(videos_bp)
    app.register_blueprint(processing_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(reports_bp)
    
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        scheduler.start()
        
    return app