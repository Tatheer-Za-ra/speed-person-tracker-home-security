from retinaface import RetinaFace


def detect_faces_in_image(image):
    faces = RetinaFace.detect_faces(image)

    results = []

    if isinstance(faces, dict):
        for face in faces.values():
            x1, y1, x2, y2 = face["facial_area"]

            results.append({
                "x1": int(x1),
                "y1": int(y1),
                "x2": int(x2),
                "y2": int(y2),
            })

    return results