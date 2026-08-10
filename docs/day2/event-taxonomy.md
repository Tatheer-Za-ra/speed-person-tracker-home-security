# Event Taxonomy

## Common Event Fields
Every event should have:
- event_id
- video_id
- timestamp
- event_type
- snapshot_path
- confidence
- metadata
- is_alert
- created_at

---

## 1. known_person
**Meaning:**  
A detected person matched with a saved known person.

**Required metadata:**  
- known_person_id
- matched_name
- face_match_score
- confidence_score

**Alert:** No

---

## 2. unknown_person
**Meaning:**  
A detected person did not match any saved known person above threshold.

**Required metadata:**  
- recognition_status = unknown
- face_detected = true/false
- confidence_score

**Alert:** Yes

---

## 3. vehicle_detected
**Meaning:**  
A vehicle was detected and tracked, but it is not overspeeding.

**Required metadata:**  
- vehicle_category
- track_id
- confidence_score
- estimated_speed (optional if available)

**Alert:** No

---

## 4. overspeed_vehicle
**Meaning:**  
A tracked vehicle exceeded the configured speed threshold.

**Required metadata:**  
- vehicle_category
- track_id
- estimated_speed
- threshold_value
- speed_difference

**Alert:** Yes

---

## Important Rule
Event types should represent **final useful system outputs**, not raw AI steps.

For example:
- `unknown_person` is a valid event type
- `face_detected` should not be its own event type; it should stay inside metadata