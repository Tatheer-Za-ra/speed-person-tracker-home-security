from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

MODELS_DIR = BASE_DIR / "models"
DEBUG_OUTPUT_DIR = BASE_DIR / "storage" / "debug_frames"
EVENT_SNAPSHOTS_DIR = BASE_DIR / "storage" / "event_snapshots"
DEBUG_FACES_DIR = BASE_DIR / "storage" / "debug_faces"

YOLO_MODEL_PATH = MODELS_DIR / "yolov8n.pt"
DETECTOR_BACKEND = "auto"   # auto | torch | onnx | openvino
DETECTOR_MODEL_PATH = YOLO_MODEL_PATH
DETECTOR_IMGSZ = 640
DETECTOR_DEVICE = "auto"    # auto | cpu | 0 | intel:cpu | intel:gpu | intel:npu
ALLOW_BACKEND_FALLBACK = True

ONNX_MODEL_PATH = MODELS_DIR / "yolov8n.onnx"
OPENVINO_MODEL_PATH = MODELS_DIR / "yolov8n_openvino_model"

#CTD parameters
CTD_ENABLED = False
CTD_MAX_FRAMES_WITHOUT_DETECTION = 4
CTD_ACTIVE_TRACK_GRACE_FRAMES = 4



FRAME_SKIP = 5
MIN_FRAME_SKIP = 1
DEFAULT_FPS_FALLBACK = 25.0

ENABLE_RESIZE = True
RESIZE_WIDTH = 960
RESIZE_HEIGHT = 540

PERSON_CONFIDENCE_THRESHOLD = 0.4
VEHICLE_CONFIDENCE_THRESHOLD = 0.4

DEBUG_ANNOTATED_FRAMES_ENABLED = True
DEBUG_MAX_FRAMES_PER_VIDEO = 20

TARGET_DETECTION_CLASSES = {
    "person",
    "car",
    "motorcycle",
    "truck",
}

# tracking parameters
TRACKING_ENABLED = True
TRACKING_MAX_AGE = 20
TRACKING_N_INIT = 3
TRACKING_MIN_TRACK_LENGTH = 3