import json

import cv2
import numpy as np


FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


def validate_and_extract_face(image_bytes: bytes):
    np_buffer = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

    if image is None:
        return False, "Image is unreadable or corrupted", None

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    if blur_score < 80:
        return False, "Image is too blurry or low quality", None

    faces = FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
    )

    if len(faces) == 0:
        return False, "No face detected in image", None

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    face_crop = gray[y:y + h, x:x + w]

    return True, "Valid face image", face_crop


def create_initial_embedding(face_crop):
    resized = cv2.resize(face_crop, (32, 32))
    normalized = resized.astype("float32") / 255.0
    embedding = normalized.flatten().tolist()
    return json.dumps(embedding)