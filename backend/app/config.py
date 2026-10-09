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

# --- WebSocket limits. Read as config.X at use time (not copied), so tests can shrink them. ---

# A new socket must send {"type":"auth"} within this long, or it is closed with code 4408.
WS_AUTH_TIMEOUT_S = 5.0

# No frame at all for this long = the connection is dead (laptop lid shut, wifi dropped).
# Clients ping every 25 s, so this tolerates two missed pings. Without it a dead tab would keep
# its user "online" and make "delivered" receipts lie.
WS_IDLE_TIMEOUT_S = 70.0

# A push that cannot be written within this long counts as failed for that socket.
WS_SEND_TIMEOUT_S = 5.0

# A repeated "typing: true" for the same chat inside this window is dropped (Signal clients
# refresh every 10 s, so a well-behaved client never hits this).
TYPING_MIN_INTERVAL_S = 1.0

# A ping rewrites last_seen_at at most this often, so heartbeats are not a write per 25 s per tab.
LAST_SEEN_TOUCH_INTERVAL_MS = 60_000
