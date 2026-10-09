import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

# In production this points at a file on the persistent volume (e.g. /data/signal.db).
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", BACKEND_DIR / "data" / "signal.db"))

# Uploaded avatars. Must also sit on the persistent volume in production.
MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", BACKEND_DIR / "data" / "media"))

# Mocked phone verification: every number "receives" this same code (D-15).
OTP_CODE = "123456"

# A session dies after this long without being used.
SESSION_TTL_DAYS = 30

# Browser origins allowed to call the API (comma separated). Vercel URL goes here in production.
CORS_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()
]
