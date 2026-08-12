# scratch/find_all_videos.py

from pathlib import Path

root = Path(r"c:\Users\PMLS\Desktop\FYP imlp\speed-person-tracker-home-security")
for ext in ["*.mp4", "*.avi", "*.mkv", "*.mov"]:
    for p in root.rglob(ext):
        if "venv" not in str(p) and "node_modules" not in str(p):
            print(f"Video file: {p} ({p.stat().st_size / 1024 / 1024:.2f} MB)")
