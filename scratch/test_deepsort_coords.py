# scratch/test_deepsort_coords.py

import sys
from pathlib import Path
import numpy as np

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from deep_sort_realtime.deepsort_tracker import DeepSort

def test_deepsort():
    tracker = DeepSort(max_age=20, n_init=1)
    
    # Fake frame 960x540
    frame = np.zeros((540, 960, 3), dtype=np.uint8)
    
    # Suppose a car is at x1=400, y1=300, x2=600, y2=450
    # ltwh = [400, 300, 200, 150]
    raw_dets = [
        ([400, 300, 200, 150], 0.9, "car")
    ]
    
    tracks = tracker.update_tracks(raw_dets, frame=frame, others=[{"class_name": "car", "confidence": 0.9}])
    
    for t in tracks:
        print("Track ID:", t.track_id)
        print("to_ltrb(orig=True):", t.to_ltrb(orig=True))
        print("to_ltrb(orig=False):", t.to_ltrb(orig=False))
        print("to_ltwh(orig=True):", t.to_ltwh(orig=True))
        print("to_ltwh(orig=False):", t.to_ltwh(orig=False))
        print("to_tlbr():", getattr(t, "to_tlbr", None))

if __name__ == "__main__":
    test_deepsort()
