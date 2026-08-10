import json
import math

import cv2


FACE_MATCH_THRESHOLD = 0.82


def create_simple_face_embedding(face_crop):
    """
    Temporary Day 12 embedding method.
    Must match the known_persons.face_utils.create_initial_embedding style:
    grayscale face crop -> 32x32 -> normalized -> flattened list.
    """
    if face_crop is None or face_crop.size == 0:
        return None

    if len(face_crop.shape) == 3:
        face_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

    resized = cv2.resize(face_crop, (32, 32))
    normalized = resized.astype("float32") / 255.0
    return normalized.flatten().tolist()


def cosine_similarity(a, b):
    if not a or not b or len(a) != len(b):
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


def match_embedding_to_templates(face_embedding, face_templates):
    best_template = None
    best_score = -1.0

    for template in face_templates:
        try:
            known_embedding = json.loads(template.embedding_data)
        except Exception:
            continue

        score = cosine_similarity(face_embedding, known_embedding)

        if score > best_score:
            best_score = score
            best_template = template

    if best_template is not None and best_score >= FACE_MATCH_THRESHOLD:
        return {
            "match_status": "known",
            "known_person_id": best_template.known_person_id,
            "similarity": round(best_score, 4),
        }

    return {
        "match_status": "unknown",
        "known_person_id": None,
        "similarity": round(best_score, 4) if best_score >= 0 else None,
    }


def classify_face_crop(face_crop, face_templates):
    embedding = create_simple_face_embedding(face_crop)

    if embedding is None:
        return {
            "match_status": "unknown",
            "known_person_id": None,
            "similarity": None,
        }

    return match_embedding_to_templates(embedding, face_templates)
