import json
import math
import numpy as np
import cv2


FACE_MATCH_THRESHOLD = 0.82


def create_simple_face_embedding(face_crop):
    """
    Grayscale face crop -> 32x32 -> normalized -> flattened list or np.ndarray.
    """
    if face_crop is None or face_crop.size == 0:
        return None

    if len(face_crop.shape) == 3:
        face_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

    resized = cv2.resize(face_crop, (32, 32))
    normalized = resized.astype("float32") / 255.0
    return normalized.flatten()


def preprocess_face_templates(face_templates):
    """
    Pre-parse JSON embeddings into a pre-allocated normalized NumPy matrix (N, D)
    and list of corresponding known_person_ids for microsecond batch matching.
    """
    if not face_templates:
        return {"matrix": None, "person_ids": [], "norms": None}

    embeddings = []
    person_ids = []

    for template in face_templates:
        try:
            if hasattr(template, "embedding_data"):
                emb = json.loads(template.embedding_data)
                pid = template.known_person_id
            elif isinstance(template, dict):
                emb = template.get("embedding") or json.loads(template.get("embedding_data", "[]"))
                pid = template.get("known_person_id")
            else:
                continue

            if emb:
                embeddings.append(emb)
                person_ids.append(pid)
        except Exception:
            continue

    if not embeddings:
        return {"matrix": None, "person_ids": [], "norms": None}

    matrix = np.array(embeddings, dtype=np.float32)  # shape (N, D)
    norms = np.linalg.norm(matrix, axis=1)  # shape (N,)
    # Avoid zero division
    norms[norms == 0] = 1.0

    return {
        "matrix": matrix,
        "person_ids": person_ids,
        "norms": norms,
    }


def cosine_similarity_vectorized(candidate_vec, cached_templates):
    """
    Calculates cosine similarity of 1D candidate vector against all preprocessed templates in parallel.
    """
    matrix = cached_templates.get("matrix")
    person_ids = cached_templates.get("person_ids")
    norms = cached_templates.get("norms")

    if matrix is None or len(person_ids) == 0:
        return None, 0.0

    vec = np.array(candidate_vec, dtype=np.float32).flatten()
    vec_norm = np.linalg.norm(vec)

    if vec_norm == 0:
        return None, 0.0

    # Matrix (N, D) dot Candidate (D,) -> Dot products (N,)
    dot_products = np.dot(matrix, vec)
    similarities = dot_products / (norms * vec_norm)

    best_idx = np.argmax(similarities)
    best_score = float(similarities[best_idx])
    best_person_id = person_ids[best_idx]

    return best_person_id, best_score


def match_embedding_to_templates(face_embedding, face_templates):
    if face_embedding is None:
        return {
            "match_status": "unknown",
            "known_person_id": None,
            "similarity": None,
        }

    # If already preprocessed cache dict
    if isinstance(face_templates, dict) and "matrix" in face_templates:
        cached = face_templates
    else:
        cached = preprocess_face_templates(face_templates)

    best_person_id, best_score = cosine_similarity_vectorized(face_embedding, cached)

    if best_person_id is not None and best_score >= FACE_MATCH_THRESHOLD:
        return {
            "match_status": "known",
            "known_person_id": best_person_id,
            "similarity": round(best_score, 4),
        }

    return {
        "match_status": "unknown",
        "known_person_id": None,
        "similarity": round(best_score, 4) if best_score > 0 else None,
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

