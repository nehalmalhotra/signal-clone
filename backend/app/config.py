import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

# In production this points at a file on the persistent volume (e.g. /data/signal.db).
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", BACKEND_DIR / "data" / "signal.db"))
