# Signal Clone

A functional clone of Signal Desktop (phone/OTP onboarding, 1:1 chat over WebSockets, contacts)
built with Next.js + FastAPI + SQLite, for an SDE Fullstack assignment. See `CLAUDE.md` for the
full project rules and phase plan, `DECISIONS.md` for every non-trivial technical decision, and
`WALKTHROUGH.md` for a phase-by-phase explanation of how the code works.

## Live deployment

- **App**: https://signal-clone-blush.vercel.app
- **API**: https://signal-clone-sn0r.onrender.com (`/health` for a liveness check)

Log in with any seeded phone number (e.g. `+12025550100` for Alice, `+12025550101` for Bob) and the
mocked OTP `123456` (see `backend/app/db/seed_data.py` for the full cast).

### Known limitation: data does not persist between restarts

The backend runs on Render's **free** tier, which has no persistent disk (that's a paid-only
feature there). The SQLite database and uploaded avatars live on the container's local,
ephemeral filesystem, so **every restart — an idle spin-down, a redeploy, or a restart Render
triggers on its own — wipes them and the app reseeds itself from scratch** (`seed_if_empty` in
`backend/app/db/seed.py` runs automatically on startup). The app doesn't break when this happens;
it just forgets anything created since the last restart (new accounts, messages sent beyond the
seed data, avatar uploads). See DECISIONS.md D-59 for the full reasoning and the alternatives
that were ruled out.

To reduce how often the free instance idles out and resets (Render spins a free service down
after 15 minutes with no HTTP/WebSocket traffic), a free [UptimeRobot](https://uptimerobot.com)
monitor pings `https://signal-clone-sn0r.onrender.com/health` every 5 minutes. This doesn't
eliminate the reset risk — Render can still restart a free service on its own — but it keeps the
instance from idling out on its own between demos.

## Running locally

**Backend** (Python 3.13):
```
cd backend
python -m venv .venv && .venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
The DB seeds itself on first run (`backend/data/`). `python -m app.db.seed --reset` wipes and
reseeds by hand.

**Frontend** (Node 20+):
```
cd frontend
npm install
npm run dev
```
Set `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`) if the backend runs elsewhere.

**Tests**:
```
cd frontend && npm test              # vitest unit tests
cd backend && pytest                 # backend tests
cd frontend && npx playwright test   # e2e (needs both servers running; see DECISIONS.md D-53)
```
