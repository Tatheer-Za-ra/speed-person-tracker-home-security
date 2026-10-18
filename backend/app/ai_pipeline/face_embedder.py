import os
import logging
from pathlib import Path
from typing import Optional, Union, List

import cv2
import numpy as np
import onnxruntime as ort

from app.ai_pipeline.config import ARCFACE_MODEL_PATH

logger = logging.getLogger(__name__)


class ArcFaceEmbedder:
    _instance: Optional["ArcFaceEmbedder"] = None

    def __init__(self, model_path: Optional[Union[str, Path]] = None):
        if model_path is None:
            model_path = ARCFACE_MODEL_PATH

        model_path = Path(model_path).resolve()
        if not model_path.exists():
            # Check fallback locations
            root_fallback = Path(__file__).resolve().parents[3] / "models" / "w600k_mbf.onnx"
            if root_fallback.exists():
                model_path = root_fallback
            else:
                raise FileNotFoundError(f"ArcFace model not found at {model_path} or {root_fallback}")

        self.model_path = str(model_path)
        logger.info(f"Loading ArcFace ONNX model from: {self.model_path}")

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.session = ort.InferenceSession(
            self.model_path,
            sess_options=opts,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    @classmethod
    def get_instance(cls, model_path: Optional[Union[str, Path]] = None) -> "ArcFaceEmbedder":
        if cls._instance is None:
            cls._instance = ArcFaceEmbedder(model_path)
        return cls._instance

    def preprocess(self, face_image: Union[np.ndarray, str, Path]) -> Optional[np.ndarray]:
        """
        Loads and prepares an image for ArcFace inference:
        - Accepts BGR image array or image file path
        - Converts BGR to RGB
        - Resizes to (112, 112)
        - Normalizes to [-1.0, 1.0]: (x - 127.5) / 127.5
        - Transposes to NCHW: (1, 3, 112, 112) float32
        """
        try:
            if isinstance(face_image, (str, Path)):
                img_path = str(face_image)
                if not os.path.exists(img_path):
                    logger.warning(f"Image path does not exist: {img_path}")
                    return None
                img = cv2.imread(img_path)
            elif isinstance(face_image, np.ndarray):
                img = face_image
            else:
                return None

            if img is None or img.size == 0:
                return None

            # Handle grayscale images if passed
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            elif img.shape[2] == 1:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            elif img.shape[2] == 4:
                img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

            # ArcFace expects RGB input
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Resize to ArcFace standard (112, 112)
            resized = cv2.resize(img_rgb, (112, 112), interpolation=cv2.INTER_AREA)

            # Normalize to [-1.0, 1.0]
            normalized = (resized.astype(np.float32) - 127.5) / 127.5

            # Transpose (H, W, C) -> (C, H, W)
            transposed = np.transpose(normalized, (2, 0, 1))

            # Add batch dimension -> (1, C, H, W)
            blob = np.expand_dims(transposed, axis=0)
            return blob

        except Exception as e:
            logger.error(f"Error preprocessing face image: {e}")
            return None

    def extract_embedding_array(self, face_image: Union[np.ndarray, str, Path]) -> Optional[np.ndarray]:
        """
        Extracts 512-d L2-normalized biometric embedding as a 1D NumPy float32 array.
        """
        blob = self.preprocess(face_image)
        if blob is None:
            return None

        try:
            raw_output = self.session.run([self.output_name], {self.input_name: blob})[0]
            vector = raw_output[0].astype(np.float32)

            # L2 normalize
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm
            return vector

        except Exception as e:
            logger.error(f"ArcFace inference failed: {e}")
            return None

    def extract_embedding(self, face_image: Union[np.ndarray, str, Path]) -> Optional[List[float]]:
        """
        Extracts 512-d L2-normalized biometric embedding as a Python list of floats.
        """
        vec = self.extract_embedding_array(face_image)
        if vec is not None:
            return vec.tolist()
        return None


# Module-level convenience functions
def get_embedder() -> ArcFaceEmbedder:
    return ArcFaceEmbedder.get_instance()


def extract_face_embedding(face_image: Union[np.ndarray, str, Path]) -> Optional[List[float]]:
    """
    Extracts a 512-dimensional deep biometric embedding from a face image.
    Returns a Python list of floats (L2 normalized) or None on failure.
    """
    embedder = get_embedder()
    return embedder.extract_embedding(face_image)


def get_face_embedding_array(face_image: Union[np.ndarray, str, Path]) -> Optional[np.ndarray]:
    """
    Extracts a 512-dimensional deep biometric embedding as a NumPy array.
    """
    embedder = get_embedder()
    return embedder.extract_embedding_array(face_image)


def compute_cosine_similarity(emb1: Union[np.ndarray, List[float]], emb2: Union[np.ndarray, List[float]]) -> float:
    """
    Computes cosine similarity between two 512-d embeddings.
    Since ArcFace embeddings are L2-normalized, cosine similarity is the dot product.
    """
    v1 = np.asarray(emb1, dtype=np.float32).flatten()
    v2 = np.asarray(emb2, dtype=np.float32).flatten()
    n1 = np.linalg.norm(v1)
    n2 = np.linalg.norm(v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (n1 * n2))


# Canonical 5 facial landmarks for ArcFace (112, 112)
ARCFACE_REFERENCE_PTS = np.array([
    [38.2946, 51.6963],  # subject's right eye (viewer's left)
    [73.5318, 51.6963],  # subject's left eye (viewer's right)
    [56.0252, 71.7366],  # nose tip
    [41.5493, 92.3655],  # subject's right mouth corner (viewer's left)
    [70.7299, 92.3655],  # subject's left mouth corner (viewer's right)
], dtype=np.float32)


def align_face_5points(image: np.ndarray, landmarks: Optional[dict]) -> Optional[np.ndarray]:
    """
    Warps a face image using 5-point facial landmarks to canonical ArcFace template (112, 112).
    landmarks dict format: {'right_eye': [x, y], 'left_eye': [x, y], 'nose': [x, y], 'mouth_right': [x, y], 'mouth_left': [x, y]}
    """
    if image is None or image.size == 0 or not landmarks:
        return None

    required_keys = ("right_eye", "left_eye", "nose", "mouth_right", "mouth_left")
    if not all(k in landmarks for k in required_keys):
        return None

    try:
        src_pts = np.array([
            landmarks["right_eye"],
            landmarks["left_eye"],
            landmarks["nose"],
            landmarks["mouth_right"],
            landmarks["mouth_left"],
        ], dtype=np.float32)

        M, _ = cv2.estimateAffinePartial2D(src_pts, ARCFACE_REFERENCE_PTS)
        if M is None:
            return None

        aligned = cv2.warpAffine(image, M, (112, 112), borderValue=0.0)
        return aligned
    except Exception as e:
        logger.warning(f"Error during 5-point face alignment: {e}")
        return None

