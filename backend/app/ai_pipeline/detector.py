from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import List

import torch
from ultralytics import YOLO

from app.ai_pipeline.config import (
    ALLOW_BACKEND_FALLBACK,
    DETECTOR_BACKEND,
    DETECTOR_DEVICE,
    DETECTOR_IMGSZ,
    DETECTOR_MODEL_PATH,
    ONNX_MODEL_PATH,
    OPENVINO_MODEL_PATH,
    PERSON_CONFIDENCE_THRESHOLD,
    VEHICLE_CONFIDENCE_THRESHOLD,
    TARGET_DETECTION_CLASSES,
)


@dataclass
class DetectionResult:
    class_name: str
    confidence: float
    x1: int
    y1: int
    x2: int
    y2: int


class BaseDetector(ABC):
    backend_name: str = "unknown"

    @abstractmethod
    def detect(self, frame) -> List[DetectionResult]:
        pass


class BaseYoloDetector(BaseDetector):
    def __init__(self, model_path, backend_name: str):
        self.backend_name = backend_name
        self.model_path = Path(model_path)
        self.imgsz = DETECTOR_IMGSZ
        self.device = self._resolve_device()
        self.model = YOLO(str(self.model_path), task="detect")
    def _resolve_device(self):
        if DETECTOR_DEVICE != "auto":
            return DETECTOR_DEVICE

        if self.backend_name == "openvino":
            return "intel:cpu"

        if self.backend_name == "torch":
            return 0 if torch.cuda.is_available() else "cpu"

        return "cpu"

    def _passes_threshold(self, class_name: str, confidence: float) -> bool:
        if class_name == "person":
            return confidence >= PERSON_CONFIDENCE_THRESHOLD

        if class_name in {"car", "motorcycle", "truck"}:
            return confidence >= VEHICLE_CONFIDENCE_THRESHOLD

        return False

    def detect(self, frame) -> List[DetectionResult]:
        results = self.model(
            frame,
            verbose=False,
            imgsz=self.imgsz,
            device=self.device,
        )

        detections: List[DetectionResult] = []

        if not results:
            return detections

        result = results[0]
        boxes = result.boxes

        if boxes is None:
            return detections

        for box in boxes:
            cls_id = int(box.cls[0].item())
            class_name = self.model.names[cls_id]

            if class_name not in TARGET_DETECTION_CLASSES:
                continue

            confidence = float(box.conf[0].item())

            if not self._passes_threshold(class_name, confidence):
                continue

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append(
                DetectionResult(
                    class_name=class_name,
                    confidence=confidence,
                    x1=int(round(x1)),
                    y1=int(round(y1)),
                    x2=int(round(x2)),
                    y2=int(round(y2)),
                )
            )

        return detections


class TorchYoloDetector(BaseYoloDetector):
    def __init__(self):
        model_path = Path(DETECTOR_MODEL_PATH)
        if not model_path.exists():
            raise FileNotFoundError(f"Torch model not found at: {model_path}")
        super().__init__(model_path=model_path, backend_name="torch")


class OnnxYoloDetector(BaseYoloDetector):
    def __init__(self):
        model_path = Path(ONNX_MODEL_PATH)
        if not model_path.exists():
            raise FileNotFoundError(f"ONNX model not found at: {model_path}")
        super().__init__(model_path=model_path, backend_name="onnx")


class OpenVinoYoloDetector(BaseYoloDetector):
    def __init__(self):
        model_path = Path(OPENVINO_MODEL_PATH)
        if not model_path.exists():
            raise FileNotFoundError(f"OpenVINO model directory not found at: {model_path}")
        super().__init__(model_path=model_path, backend_name="openvino")


def _create_backend_detector(backend_name: str) -> BaseDetector:
    if backend_name == "torch":
        return TorchYoloDetector()

    if backend_name == "onnx":
        return OnnxYoloDetector()

    if backend_name == "openvino":
        return OpenVinoYoloDetector()

    raise ValueError(f"Unsupported detector backend: {backend_name}")


def _auto_backend_candidates() -> list[str]:
    # CUDA systems: torch first for now, later TensorRT can be added ahead of it.
    if torch.cuda.is_available():
        return ["torch", "onnx", "openvino"]

    # CPU-only systems: based on your current benchmarks,
    # OpenVINO is best, Torch is second, ONNX is third.
    return ["openvino", "torch", "onnx"]


def create_detector() -> BaseDetector:
    errors = []

    if DETECTOR_BACKEND != "auto":
        try:
            return _create_backend_detector(DETECTOR_BACKEND)
        except Exception as e:
            if not ALLOW_BACKEND_FALLBACK or DETECTOR_BACKEND == "torch":
                raise
            errors.append(f"{DETECTOR_BACKEND}: {e}")

            fallback_detector = _create_backend_detector("torch")
            fallback_detector.fallback_reason = "; ".join(errors)
            return fallback_detector

    for backend_name in _auto_backend_candidates():
        try:
            detector = _create_backend_detector(backend_name)
            if errors:
                detector.fallback_reason = "; ".join(errors)
            return detector
        except Exception as e:
            errors.append(f"{backend_name}: {e}")

    raise RuntimeError(
        "Could not initialize any detector backend. "
        + " | ".join(errors)
    )