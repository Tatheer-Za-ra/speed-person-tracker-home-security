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
        return {"matrix": None, "person_ids": [], "persons_meta": [], "norms": None}

    embeddings = []
    person_ids = []
    persons_meta = []

    for template in face_templates:
        try:
            if hasattr(template, "embedding_data"):
                emb = json.loads(template.embedding_data)
                pid = template.known_person_id
                kp = getattr(template, "known_person", None)
                p_name = getattr(kp, "name", None) if kp else None
                p_cat = getattr(kp, "category", None) if kp else None
            elif isinstance(template, dict):
                emb = template.get("embedding") or json.loads(template.get("embedding_data", "[]"))
                pid = template.get("known_person_id")
                p_name = template.get("name") or template.get("known_person_name")
                p_cat = template.get("category") or template.get("known_person_category")
            else:
                continue

            if emb:
                embeddings.append(emb)
                person_ids.append(pid)
                p_disp = f"{p_name}({p_cat})" if (p_name and p_cat) else (p_name or None)
                persons_meta.append({
                    "id": pid,
                    "name": p_name,
                    "category": p_cat,
                    "display": p_disp,
                })
        except Exception:
            continue

    if not embeddings:
        return {"matrix": None, "person_ids": [], "persons_meta": [], "norms": None}

    matrix = np.array(embeddings, dtype=np.float32)  # shape (N, D)
    norms = np.linalg.norm(matrix, axis=1)  # shape (N,)
    # Avoid zero division
    norms[norms == 0] = 1.0

    return {
        "matrix": matrix,
        "person_ids": person_ids,
        "persons_meta": persons_meta,
        "norms": norms,
    }


def cosine_similarity_vectorized(candidate_vec, cached_templates):
    """
    Calculates cosine similarity of 1D candidate vector against all preprocessed templates in parallel.
    """
    matrix = cached_templates.get("matrix")
    person_ids = cached_templates.get("person_ids")
    persons_meta = cached_templates.get("persons_meta", [])
    norms = cached_templates.get("norms")

    if matrix is None or len(person_ids) == 0:
        return None, 0.0, None

    vec = np.array(candidate_vec, dtype=np.float32).flatten()
    vec_norm = np.linalg.norm(vec)

    if vec_norm == 0:
        return None, 0.0, None

    # Matrix (N, D) dot Candidate (D,) -> Dot products (N,)
    dot_products = np.dot(matrix, vec)
    similarities = dot_products / (norms * vec_norm)

    best_idx = int(np.argmax(similarities))
    best_score = float(similarities[best_idx])
    best_person_id = person_ids[best_idx]
    best_meta = persons_meta[best_idx] if best_idx < len(persons_meta) else None

    return best_person_id, best_score, best_meta


def match_embedding_to_templates(face_embedding, face_templates):
    if face_embedding is None:
        return {
            "match_status": "unknown",
            "known_person_id": None,
            "known_person_name": None,
            "known_person_category": None,
            "known_person_display": None,
            "similarity": None,
        }

    # If already preprocessed cache dict
    if isinstance(face_templates, dict) and "matrix" in face_templates:
        cached = face_templates
    else:
        cached = preprocess_face_templates(face_templates)

    res = cosine_similarity_vectorized(face_embedding, cached)
    if len(res) == 3:
        best_person_id, best_score, best_meta = res
    else:
        best_person_id, best_score = res
        best_meta = None

    if best_person_id is not None and best_score >= FACE_MATCH_THRESHOLD:
        p_name = best_meta.get("name") if best_meta else None
        p_cat = best_meta.get("category") if best_meta else None
        p_disp = best_meta.get("display") if best_meta else (f"{p_name}({p_cat})" if p_name and p_cat else p_name)
        return {
            "match_status": "known",
            "known_person_id": best_person_id,
            "known_person_name": p_name,
            "known_person_category": p_cat,
            "known_person_display": p_disp,
            "similarity": round(best_score, 4),
        }

    return {
        "match_status": "unknown",
        "known_person_id": None,
        "known_person_name": None,
        "known_person_category": None,
        "known_person_display": None,
        "similarity": round(best_score, 4) if best_score > 0 else None,
    }


def classify_face_crop(face_crop, face_templates):
    embedding = create_simple_face_embedding(face_crop)

    if embedding is None:
        return {
            "match_status": "unknown",
            "known_person_id": None,
            "known_person_name": None,
            "known_person_category": None,
            "known_person_display": None,
            "similarity": None,
        }

    return match_embedding_to_templates(embedding, face_templates)

