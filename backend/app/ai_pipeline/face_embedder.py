import json
import tempfile
import os

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except Exception:
    DEEPFACE_AVAILABLE = False

import cv2


def _write_temp_image(img):
    fd, path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    cv2.imwrite(path, img)
    return path


def extract_face_embedding(face_image):
    """
    Extract embedding for a face image.

    - `face_image` can be a numpy image array or a filesystem path.
    - Returns a Python list (embedding) or None on failure.
    """
    try:
        if isinstance(face_image, str):
            img_path = face_image
        else:
            img_path = _write_temp_image(face_image)

        if DEEPFACE_AVAILABLE:
            result = DeepFace.represent(
                img_path=img_path,
                model_name="Facenet512",
                enforce_detection=False,
            )

            # clean up temp file if we created one
            if not isinstance(face_image, str) and os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except Exception:
                    pass

            if not result:
                return None

            # DeepFace.represent returns a list of dicts with 'embedding'
            # Some versions use 'embedding' key, others structure differently; handle common shapes
            first = result[0]
            if isinstance(first, dict) and "embedding" in first:
                return first["embedding"]
            if isinstance(first, dict) and "embedding_data" in first:
                return first["embedding_data"]
            # fallback: if first is list-like
            if isinstance(first, (list, tuple)):
                return list(first)

            return None
        else:
            # Fallback simple embedding: resize gray 32x32 and flatten
            img = cv2.imread(img_path) if isinstance(face_image, str) else face_image
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, (32, 32))
            normalized = resized.astype("float32") / 255.0
            embedding = normalized.flatten().tolist()

            if not isinstance(face_image, str) and os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except Exception:
                    pass

            return embedding

    except Exception:
        return None
