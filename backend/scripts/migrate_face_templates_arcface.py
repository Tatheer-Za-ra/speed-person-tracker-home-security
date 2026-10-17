"""
Migration script to convert existing 32x32 grayscale face templates to 512-d ArcFace embeddings.
Scans all known persons in both app.db (root) and backend/app.db (if present).
"""

import os
import sys
import json
import sqlite3
from pathlib import Path
import cv2

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.known_persons.face_utils import FACE_CASCADE
from app.ai_pipeline.face_embedder import extract_face_embedding


def reembed_database(db_path: Path):
    if not db_path.exists():
        print(f"Database not found at {db_path}, skipping.")
        return

    print(f"\nProcessing database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, image_path FROM known_persons")
    persons = cursor.fetchall()

    if not persons:
        print("  No known persons found in database.")
        conn.close()
        return

    updated_count = 0
    for pid, name, img_path in persons:
        print(f"  Person ID={pid}, Name={name}, Path={img_path}")
        if not img_path or not os.path.exists(img_path):
            print(f"    WARNING: Image not found at {img_path}")
            continue

        img = cv2.imread(img_path)
        if img is None:
            print(f"    WARNING: Failed to read image from {img_path}")
            continue

        # Extract face crop via Haar cascade
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            face_crop = img[y:y+h, x:x+w]
        else:
            face_crop = img

        embedding = extract_face_embedding(face_crop)
        if not embedding or len(embedding) != 512:
            print(f"    ERROR: Failed to extract 512-d ArcFace embedding for {name} (got {len(embedding) if embedding else 0})")
            continue

        emb_json = json.dumps(embedding)

        # Check if template exists
        cursor.execute("SELECT id FROM face_templates WHERE known_person_id = ?", (pid,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                "UPDATE face_templates SET embedding_data = ? WHERE known_person_id = ?",
                (emb_json, pid),
            )
            print(f"    Updated existing face template for ID={pid} with 512-d ArcFace embedding.")
        else:
            cursor.execute(
                "INSERT INTO face_templates (known_person_id, embedding_data) VALUES (?, ?)",
                (pid, emb_json),
            )
            print(f"    Inserted new face template for ID={pid} with 512-d ArcFace embedding.")

        updated_count += 1

    conn.commit()
    conn.close()
    print(f"  Successfully updated {updated_count} face templates in {db_path.name}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent.parent
    root_db = repo_root / "app.db"
    backend_db = repo_root / "backend" / "app.db"

    reembed_database(root_db)
    if backend_db.exists():
        reembed_database(backend_db)
