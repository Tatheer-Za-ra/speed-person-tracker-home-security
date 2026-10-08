

from pathlib import Path
import cv2

from app.ai_pipeline.config import DEBUG_FACES_DIR
from app.ai_pipeline.face_detector import detect_faces_in_image
from app.ai_pipeline.face_matcher import classify_face_crop, preprocess_face_templates


# the whole bbox region without expansion, to avoid cropping out faces near the edges of the bbox
def crop_expanded_person_region(frame, bbox, padding_ratio=0.0):
    frame_h, frame_w = frame.shape[:2]

    x1 = max(0, int(bbox["x1"]))
    y1 = max(0, int(bbox["y1"]))
    x2 = min(frame_w, int(bbox["x2"]))
    y2 = min(frame_h, int(bbox["y2"]))

    if x2 <= x1 or y2 <= y1:
        return None, None

    crop = frame[y1:y2, x1:x2]

    offset = {
        "x": x1,
        "y": y1,
    }

    return crop, offset






# def crop_expanded_person_region(frame, bbox, padding_ratio=0.15):
#     frame_h, frame_w = frame.shape[:2]

#     x1 = int(bbox["x1"])
#     y1 = int(bbox["y1"])
#     x2 = int(bbox["x2"])
#     y2 = int(bbox["y2"])

#     box_w = x2 - x1
#     box_h = y2 - y1

#     pad_x = int(box_w * padding_ratio)
#     pad_y = int(box_h * padding_ratio)

#     crop_x1 = max(0, x1 - pad_x)
#     crop_y1 = max(0, y1 - pad_y)
#     crop_x2 = min(frame_w, x2 + pad_x)
#     crop_y2 = min(frame_h, y2 + pad_y)

#     if crop_x2 <= crop_x1 or crop_y2 <= crop_y1:
#         return None, None

#     crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]

#     offset = {
#         "x": crop_x1,
#         "y": crop_y1,
#     }

#     return crop, offset

def crop_head_region(frame, bbox):
    # x1 = max(0, int(bbox["x1"]))
    # y1 = max(0, int(bbox["y1"]))
    # x2 = max(0, int(bbox["x2"]))
    # y2 = max(0, int(bbox["y2"]))

    # if x2 <= x1 or y2 <= y1:
    #     return None

    # person_height = y2 - y1
    # head_y2 = y1 + int(person_height * 0.9)

    # if head_y2 <= y1:
    #     return None

    # return frame[y1:head_y2, x1:x2]
    return frame
    
def scale_bbox_to_raw_frame(
    bbox,
    processed_width,
    processed_height,
    raw_width,
    raw_height,
):
    scale_x = raw_width / processed_width
    scale_y = raw_height / processed_height

    return {
        "x1": int(bbox["x1"] * scale_x),
        "y1": int(bbox["y1"] * scale_y),
        "x2": int(bbox["x2"] * scale_x),
        "y2": int(bbox["y2"] * scale_y),
    }
    
def extract_faces_from_tracks(video_path, tracks_summary, face_templates):
    cap = None
    faces_output = []

    DEBUG_FACES_DIR.mkdir(parents=True, exist_ok=True)
    video_stem = Path(video_path).stem
    cached_face_templates = preprocess_face_templates(face_templates)

    try:
        cap = cv2.VideoCapture(video_path)
        if cap is None or not cap.isOpened():
            return faces_output

        for track in tracks_summary:
            if track["class_name"] != "person":
                continue

            bbox_history = track.get("bbox_history", [])
            if not bbox_history:
                continue

            sample = bbox_history[len(bbox_history) // 2]

            raw_frame_index = sample["raw_frame_index"]
            processed_frame_index = sample["processed_frame_index"]
            bbox = scale_bbox_to_raw_frame(
                bbox=sample["bbox"],
                processed_width=sample["processed_frame_width"],
                processed_height=sample["processed_frame_height"],
                raw_width=sample["raw_frame_width"],
                raw_height=sample["raw_frame_height"],
            )

            cap.set(cv2.CAP_PROP_POS_FRAMES, raw_frame_index)
            success, frame = cap.read()

            if not success or frame is None:
                continue

            # person_crop = crop_head_region(frame, bbox)
            # if person_crop is None or person_crop.size == 0:
            #     continue

            person_crop, crop_offset = crop_expanded_person_region(frame, bbox)

            if person_crop is None or person_crop.size == 0:
                continue

            cv2.imwrite(
                str(DEBUG_FACES_DIR / f"{video_stem}_track_{track['track_id']}_rawframe_{raw_frame_index}.jpg"),
                person_crop,
            )

            faces = detect_faces_in_image(person_crop)

            classified_faces = []

            for face in faces:
                fx1 = max(0, int(face["x1"]))
                fy1 = max(0, int(face["y1"]))
                fx2 = min(person_crop.shape[1], int(face["x2"]))
                fy2 = min(person_crop.shape[0], int(face["y2"]))

                if fx2 <= fx1 or fy2 <= fy1:
                    continue

                face_crop = person_crop[fy1:fy2, fx1:fx2]

                identity_result = classify_face_crop(
                    face_crop=face_crop,
                    face_templates=cached_face_templates,
                )

                classified_faces.append({
                    "bbox": {
                        "x1": face["x1"] + crop_offset["x"],
                        "y1": face["y1"] + crop_offset["y"],
                        "x2": face["x2"] + crop_offset["x"],
                        "y2": face["y2"] + crop_offset["y"],
                    },
                    "match_status": identity_result["match_status"],
                    "known_person_id": identity_result["known_person_id"],
                    "known_person_name": identity_result.get("known_person_name"),
                    "known_person_category": identity_result.get("known_person_category"),
                    "known_person_display": identity_result.get("known_person_display"),
                    "similarity": identity_result["similarity"],
                })

            faces_output.append({
                "track_id": track["track_id"],
                "faces": classified_faces,
                "processed_frame_index": processed_frame_index,
                "raw_frame_index": raw_frame_index,
            })

    finally:
        if cap is not None:
            cap.release()

    return faces_output