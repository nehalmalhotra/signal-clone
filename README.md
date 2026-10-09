# Signal Clone

A functional clone of Signal Desktop (phone/OTP onboarding, 1:1 and group chat over WebSockets,
contacts, typing/read receipts, dark mode) built with Next.js + FastAPI + SQLite, for an SDE
Fullstack assignment (`docs/assignment.pdf`). `CLAUDE.md` has the full project rules and phase
plan, `DECISIONS.md` logs every non-trivial technical decision, and `WALKTHROUGH.md` explains how
the code works, phase by phase.

## Live demo

- **App**: https://signal-clone-blush.vercel.app
- **API**: https://signal-clone-sn0r.onrender.com (`/health` for a liveness check)
- **Code**: https://github.com/nehalmalhotra/signal-clone

### Demo logins

Pick country code **+1**, enter one of these numbers, and use OTP **`123456`** (fixed/mocked —
see "Assumptions" below). Full seeded cast in `backend/app/db/seed_data.py`.

| Name   | Number       |
|--------|--------------|
| Alice  | 2025550100   |
| Bob    | 2025550101   |
| Carmen | 2025550102   |

### How to test

1. Open two browser windows side by side — one normal, one incognito/private (so each gets its
   own session) — and point both at the live app link above.
2. Log in as **Alice** in one window and **Bob** in the other (phone + `123456`).
3. Open the Alice↔Bob chat in both windows and send messages back and forth. Watch the ticks on
   Alice's outgoing bubbles move from sent → delivered → read (a single faint checkmark → two
   checkmarks → two **filled** checkmarks — Signal shows "read" with filled circles, never a
   color change), and watch the typing indicator appear in the other window while one side types.
4. As Alice, open the **Dev Team** group chat to see group messaging and member list.
5. Go to **Settings → Appearance** and switch the theme to Dark to see dark mode applied
   app-wide, in both windows independently.

## Known limitation: data does not persist between restarts

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

## Tech stack

- **Frontend**: Next.js 15 (App Router) + TypeScript, Zustand for client state, plain CSS Modules
  (no UI framework — every component is hand-built to match Signal's own look).
- **Backend**: Python 3.13 + FastAPI, routers/services/models separated by concern.
- **Database**: SQLite, hand-written schema (`backend/app/db/schema.sql`) — no ORM.
- **Real-time**: a single `/ws` WebSocket endpoint per connection (see `docs/websocket-protocol.md`).
- **Deploy**: frontend on Vercel, backend on Render (Vercel can't host a long-lived WebSocket
  server), per the assignment's deployment constraints.

## Architecture overview

```
┌──────────────────┐        REST (bearer token)        ┌──────────────────────┐
│  frontend/        │ ─────────────────────────────────▶ │  backend/app/          │
│  Next.js App      │                                    │  FastAPI               │
│  Router           │ ◀───────────── WS /ws ───────────▶ │                        │
│                    │   (first-frame `auth`, then        │  routers/  → HTTP      │
│  Zustand stores:   │    typed JSON event frames)         │  ws.py     → sockets   │
│  session, chats,   │                                    │  services/ → business  │
│  messages, theme   │                                    │  logic (receipts,      │
└──────────────────┘                                    │  group membership…)    │
                                                           │  models/   → Pydantic  │
                                                           │  db/       → schema.sql│
                                                           │  + seed_data.py        │
                                                           └──────────┬────────────┘
                                                                      ▼
                                                            SQLite (backend/data/)
```

- **HTTP** handles everything that isn't "happening live right now": auth, fetching the chat
  list and message history, creating conversations/groups, editing a profile. Auth is a bearer
  token in the `Authorization` header — not a cross-site cookie, so there's no CORS-credentials
  dance and the same token works for the WebSocket handshake.
- **WebSockets** handle everything that must feel instant: new messages arriving, delivery/read
  receipts flipping, typing dots, and online/offline presence. The socket authenticates with a
  first-message `auth` frame carrying the same bearer token (never a token in the URL, which
  would leak into server logs) — see `docs/websocket-protocol.md` for the full frame reference
  and reconnect rules.
- A message write always goes through the same path regardless of transport: insert into
  `messages`, fan out a `message.new` WS event to the other party/parties, update
  `message_receipts`. REST and WS are two doors into the same backend logic, not two different
  sources of truth.
- The frontend never derives chat state from raw WS frames alone — after any (re)connect it
  re-fetches the conversation list over REST so a dropped connection can't silently miss updates;
  the socket is a live tap, not the system of record.

## Database schema

SQLite, hand-designed (not an ORM default). Full DDL with comments explaining every non-obvious
choice lives in `backend/app/db/schema.sql`; summary:

| Table | Purpose |
|---|---|
| `users` | One row per account: phone number, optional username, display name, avatar, mocked presence (`last_seen_at`). |
| `sessions` | Bearer tokens, stored as a hash only (`token_hash` PK) so a leaked DB can't be replayed. |
| `contacts` | Directed `owner_id → contact_id` pairs — one user adding another doesn't imply the reverse. |
| `conversations` | One table for both 1:1 and group chats (`type` discriminator). Direct chats get a deterministic `direct_key` (`"<smaller id>:<larger id>"`) that's `UNIQUE`, so a second direct chat between the same pair is impossible at the DB level, not just in app code. |
| `conversation_members` | Who is currently in a conversation and their role (`admin`/`member`). Holds no timestamps on purpose. |
| `membership_periods` | Source of truth for *when* someone was in a chat — one row per join/leave "stint". This is what makes "a new member can't read history from before they joined" and "a removed-then-re-added member has a gap in what they can see" work correctly, and keeps removal a soft delete (history stays readable) instead of destroying rows. |
| `messages` | Text and `group_update` system messages (e.g. "Alice added Bob") share one table; `client_id` + a `UNIQUE(sender_id, client_id)` constraint make a retried send idempotent instead of double-posting. |
| `message_receipts` | One row per (message, recipient) with a status (`sent`/`delivered`/`read`) — this is what the ticks and the message Info view read from; a group message naturally gets N receipt rows, one per recipient. |

Design choices worth noting for the schema-design grading criterion: ids are `AUTOINCREMENT` so
they're never reused and `messages.id` doubles as the timeline ordering key; all timestamps are
integer Unix milliseconds (UTC); foreign keys are enforced via `PRAGMA foreign_keys = ON`. See
DECISIONS.md D-5 through D-12 and D-25 for the reasoning behind each of these.

## API overview

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`. Full request
bodies and typed WS frames are documented in each router's Pydantic models and in
`docs/websocket-protocol.md`.

| Method & path | What it does |
|---|---|
| `POST /auth/request-code` | Request a (mocked) OTP for a phone number |
| `POST /auth/verify` | Verify the OTP; tells the client whether to register or log in |
| `POST /auth/register` | Create an account (phone, username, display name, avatar) |
| `POST /auth/logout` | Invalidate the current session token |
| `GET/PATCH /me` | Read or update the signed-in user's profile |
| `PUT/DELETE /me/avatar` | Upload or remove the signed-in user's avatar |
| `GET /users/lookup` | Look up a user by phone number (add-contact flow) |
| `GET/POST /contacts` | List contacts / add a new contact |
| `GET /conversations` | List the signed-in user's conversations, most recent activity first |
| `POST /conversations/direct` | Get-or-create the 1:1 conversation with another user |
| `GET /conversations/{id}` | Conversation detail (members, roles) |
| `POST /groups` | Create a group (name + initial members) |
| `POST /groups/{id}/members` | Add members (admin only) |
| `DELETE /groups/{id}/members/{user_id}` | Remove a member (admin only) |
| `PATCH /groups/{id}/members/{user_id}` | Change a member's role (admin only) |
| `GET /conversations/{id}/messages` | Paginated message history |
| `POST /conversations/{id}/messages` | Send a message over REST (fallback path; WS is primary) |
| `POST /conversations/{id}/read` | Mark messages read up to a given id |
| `GET /messages/{id}/receipts` | Per-recipient delivery/read status, for the message Info view |
| `WS /ws` | Single socket per connection: send/ack, receipts, typing, presence — see `docs/websocket-protocol.md` |

## Assumptions

- "Phone verification" is fully mocked: any seeded or newly-registered number accepts the fixed
  OTP `123456`, no SMS is ever sent. Real cryptographic key exchange / E2E encryption is likewise
  not implemented — the assignment explicitly allows both to be mocked.
- A session is a single bearer token with no expiry/refresh flow, stored client-side; good enough
  for a demo, not meant to be production auth.
- "Online / last seen" is derived live from open WebSocket connections, not stored as a polled
  presence system — closing every tab is what makes a user "offline."
- Country codes are limited to the ones with seed data (+1, +91); phone validation enforces a
  fixed 10-digit national number for those two codes only (see DECISIONS.md D-66).
- Avatars and the SQLite file are local disk writes, which is why they're wiped on every Render
  free-tier restart (see "Known limitation" above) — acceptable for a graded demo, not a
  production storage design.

## Known deviations from Signal's real UI

- **Group details is a centered modal**, not Signal's persistent right-hand sliding panel —
  the panel's *content* (member list, Admin labels, add/remove) matches Signal, only the
  container differs. Chosen to ship correct admin/leave functionality inside a tight time budget
  rather than build a new layout primitive from scratch. See DECISIONS.md D-62.
- **Settings is scoped to Profile + Appearance (Theme only)**, with Privacy/Notifications/
  Calls/Stories/Linked devices present as "Coming Soon" rather than Signal's full settings
  sidebar (Account, General, Chats, Data usage, Backups, Language, Chat color, Zoom level, etc.).
  Every section that exists is fully functional, not a visual stub. See DECISIONS.md D-68.
- **Voice/video calls, Stories, and linked devices** are placeholder "Coming Soon" screens, as
  explicitly permitted by the assignment brief.

## Notifications / toasts, filters, and placeholders (spec cross-check)

- **Toasts**: a Signal-style dark toast (reference/toast.png), top-left, auto-dismissing after
  4s, fires for the real events the spec calls out — contact added, group created, profile
  saved, message failed to send, and a member added to/removed from a group.
- **Chat list filter**: the filter button next to the search box toggles an "Unread chats only"
  view of the chat list, with Signal's wording ("Filter by unread") and an empty state ("No
  unread chats.") when nothing matches.
- **Linked devices**: a Settings sub-nav entry showing the same "Coming Soon" placeholder used
  for Calls/Stories, since real multi-device linking is out of scope for this assignment.

## Core features not working on the deployed app

Checked against `docs/assignment.pdf`'s Core Features list. Everything in section 5 and the
required parts of 1–4 works; the gaps are:

- **Bonus features are not implemented**: attachments/images, message reactions, reply-to/quoted
  messages, and disappearing messages are all listed as optional in the brief and were not built.
- **Keyboard shortcuts** (listed under "Signal polish") were not implemented beyond standard
  browser/form behavior (Enter-to-submit on onboarding forms).
- **Responsive design** was tuned for desktop/tablet widths; phone-width layout has not been
  specifically verified against the deployed app.
- Everything else in the Core Features list (auth/onboarding, contacts & conversation list, 1:1
  messaging with receipts/typing/status, group messaging with admin controls, and the required
  Signal-experience items) is implemented and working on the deployed app, subject to the data
  persistence caveat above.

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
