# scratch/check_db_config.py

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db import get_db_session
from app.models import Config
from app.config_routes import get_camera_calibration_config

def check_config():
    db = get_db_session()
    row = db.query(Config).filter(Config.key == "camera_calibration").first()
    print("Config DB Row value:", row.value if row else "None")

    config = get_camera_calibration_config(db)
    print("Effective Camera Config:", config)

if __name__ == "__main__":
    check_config()
