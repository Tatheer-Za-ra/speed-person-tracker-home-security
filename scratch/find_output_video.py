# scratch/find_output_video.py

import os
from pathlib import Path

root = Path(r"c:\Users\PMLS\Desktop\FYP imlp\speed-person-tracker-home-security")
for p in root.rglob("output.mp4"):
    print("Found video:", p)
