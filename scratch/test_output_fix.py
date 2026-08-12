# scratch/test_output_fix.py

import sys
import json
from pathlib import Path
from importlib import reload

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

import app.ai_pipeline.speed_calculator as sc
reload(sc)
import app.ai_pipeline.pipeline_service as ps
reload(ps)

from app.ai_pipeline.pipeline_service import analyze_video_frames

def test_fix():
    site1_path = "storage/uploads/videos/Labeled_test_video_26d2b9eefff4.mp4"
    site2_path = "storage/uploads/videos/output_ed753b520405.mp4"

    print(f"=== SITE 1 (HIGHWAY BRIDGE): {site1_path} ===")
    res1 = analyze_video_frames(site1_path)
    for payload in res1.get("event_payloads", []):
        tid = payload.get("track_id")
        label = payload.get("label")
        t = payload.get("timestamp_seconds")
        meta = json.loads(payload.get("metadata_json") or "{}")
        spd = meta.get("estimated_speed_kmh", 0.0)
        print(f"  Track #{tid} ({label}) @ {t:.1f}s --> Speed: {spd} km/h")

    print(f"\n=== SITE 2 (URBAN OVERPASS): {site2_path} ===")
    res2 = analyze_video_frames(site2_path)
    for payload in res2.get("event_payloads", []):
        tid = payload.get("track_id")
        label = payload.get("label")
        t = payload.get("timestamp_seconds")
        meta = json.loads(payload.get("metadata_json") or "{}")
        spd = meta.get("estimated_speed_kmh", 0.0)
        print(f"  Track #{tid} ({label}) @ {t:.1f}s --> Speed: {spd} km/h")

if __name__ == "__main__":
    test_fix()
