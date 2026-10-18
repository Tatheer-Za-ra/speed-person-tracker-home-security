from retinaface import RetinaFace


def detect_faces_in_image(image):
    """
    Detects faces in an image using RetinaFace and extracts both bounding boxes
    and 5-point facial landmarks (eyes, nose, mouth corners) for geometric alignment.
    """
    faces = RetinaFace.detect_faces(image)

    results = []

    if isinstance(faces, dict):
        for face in faces.values():
            x1, y1, x2, y2 = face["facial_area"]
            raw_landmarks = face.get("landmarks")

            formatted_landmarks = None
            if raw_landmarks and all(k in raw_landmarks for k in ("right_eye", "left_eye", "nose", "mouth_right", "mouth_left")):
                formatted_landmarks = {
                    "right_eye": [float(raw_landmarks["right_eye"][0]), float(raw_landmarks["right_eye"][1])],
                    "left_eye": [float(raw_landmarks["left_eye"][0]), float(raw_landmarks["left_eye"][1])],
                    "nose": [float(raw_landmarks["nose"][0]), float(raw_landmarks["nose"][1])],
                    "mouth_right": [float(raw_landmarks["mouth_right"][0]), float(raw_landmarks["mouth_right"][1])],
                    "mouth_left": [float(raw_landmarks["mouth_left"][0]), float(raw_landmarks["mouth_left"][1])],
                }

            results.append({
                "x1": int(x1),
                "y1": int(y1),
                "x2": int(x2),
                "y2": int(y2),
                "score": float(face.get("score", 1.0)),
                "landmarks": formatted_landmarks,
            })

    return results