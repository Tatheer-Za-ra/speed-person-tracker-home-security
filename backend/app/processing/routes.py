from flask import Blueprint, jsonify

from app.auth.service import login_required
from app.processing.worker import ProcessingWorker

processing_bp = Blueprint("processing", __name__, url_prefix="/api/processing")


@processing_bp.route("/run-next", methods=["POST"])
@login_required
def run_next_video():
    worker = ProcessingWorker()
    result = worker.process_next_queued_video()
    return jsonify(result), 200