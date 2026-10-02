# Admin chat — durable family/agent ↔ office threads

**Status:** shipped (fixture/local mode) · **Task:** `firstmate/villa-admin-chat` ·
**Board:** `data/villa-admin-plan/report.md` §9.6 ("Chat — durable threads, families and
agents") and the board's mockup at `/staff/inbox → thread`.

The captain asked for a saved message chat between the office and its families and agents,
with file attachments ("docx, images, pdf, excel"). This is that surface, built to the
board's shape and confined to a demo-local store: no messaging/communications service
contract is frozen, so nothing here claims to be live.

## What shipped

| Piece | Where |
|---|---|
| Pure record shape, fold and state vocabulary | `lib/chat.ts` |
| Attachment allow-list + size rules (client-safe) | `lib/chat-attachments.ts` |
| Content-addressed attachment store (server) | `lib/chat-attachment-store.ts` |
| One append-only journal per thread | `lib/api-client/chat-store.ts` + `lib/api-client/journal.ts` |
| Recorded seed threads + committed sample files | `lib/fixtures/chat/threads.json`, `lib/fixtures/chat/files/` |
| BFF routes (Guards + send/serve) | `app/api/chat/**` |
| Conversation component + thread list | `components/chat/chat-view.tsx`, `components/chat/chat-thread-list.tsx` |
| Admin screens | `/staff/inbox`, `/staff/inbox/[id]` |
| Family screen | `/client/messages` |
| Agent screen | `/agent/messages` |
| Nav + Inbox badge | `lib/rbac/nav.ts`, `app/(staff)/staff/layout.tsx`, `components/ui/sidebar-nav.tsx`, `components/portal-nav.ts`, `components/portal-frame.tsx` |

### Storage — the plan's own pattern

- **One append-only journal per conversation** at `CHAT_STORE_DIR` (default
  `.data/chat/<thread>.json`, gitignored), written through the shared
  `lib/api-client/journal.ts` mechanics (atomic temp + fsync + `rename`, one writer chain).
  The recorded seed `lib/fixtures/chat/threads.json` folds under it, exactly like the
  enquiries/billing/orders stores.
- **Per-message state is appended, never overwritten:** `message_posted` carries the first
  state; `message_state` events add `delivered` / `read`. The fold keeps the full trail and
  projects the newest state. This is what makes the board's "sending · sent · delivered ·
  read · failed" a real record rather than an overwrite.
- **Attachments are content-addressed** under `.data/attachments/<sha256>`
  (`CHAT_ATTACHMENTS_DIR`): the message row stores only the hash + name/mime/size, a
  re-upload of the same bytes is a no-op, and the three recorded sample files
  (`application-santos.pdf`, `id-front.jpg`, `schedule.xlsx`) are copied in on first read
  after verifying each file's sha256.
- **Allow-list:** docx · xlsx · pdf · png · jpg/jpeg · webp. **10 MB** per file, **50 MB**
  per thread. A refused type (415) or an oversized file (413) names the file and the rule
  in the same sentence the browser shows.
- **Attachment access is not capability by hash:** `GET /api/chat/attachments/:sha256`
  serves only to a viewer who can open a thread that references the row; a guessed hash is
  a 404.

### Threads, guards and ownership

| Route | Who | Guard |
|---|---|---|
| `GET /api/chat/threads` | office | staff + `cases:read` |
| `GET /api/chat/threads/:id` | office or the thread's participant | session; participant id must match the thread |
| `POST /api/chat/threads/:id` | office or the thread's participant | same, plus the store's message/attachment rules |
| `POST /api/chat/threads/:id/read` | office or the thread's participant | same |
| `GET /api/chat/attachments/:sha256` | a viewer of a referencing thread | referencing-thread check |

The participant's thread id is derived (`chatThreadIdFor(kind, participantId)`), so a family
can only ever address its own conversation and an agent its own. A participant starting a
brand-new conversation writes a `thread_opened` event; the office cannot post into a thread
that does not exist (404).

### Notices and transport — stated honestly

- A new message raises an Inbox row (the thread list, newest activity first) and the office
  **unread count**, which the staff layout renders as the nav "Inbox" badge.
- Transport is **server-rendered plus a short poll** (`ChatView`, 5 s). Delivery/read are
  recorded from the other side's own next request — the app's observation, not a push.
  `CHAT_TRANSPORT_NOTE` says exactly that on the screen. No live push service exists in this
  build; nothing is fabricated to make a bubble look livelier.

## Evidence

- Screenshots (`shots/`, played against the production build on :4000):
  - `inbox-1440.png` · `inbox-390.png` — the admin thread list.
  - `conversation-1440.png` · `conversation-390.png` — the Santos thread (the board's own
    mockup), attachments and per-message states.
  - `family-compose-1440.png` — the family composer with `application-santos.pdf` attached.
  - `agent-compose-1440.png` — the agent composer with `mendoza-application.xlsx` attached.
- Tests:
  - `tests/unit/chat-fold.test.ts` — the pure fold (state trail, unread, ordering, access).
  - `tests/unit/chat-attachments.test.ts` — the allow-list and both size rules.
  - `tests/unit/chat-store.test.ts` — journal durability, content addressing, refusals,
    corrupt-journal 500, read/delivered append.
  - `tests/unit/chat-route.test.ts` — 401/403/404/413/415/422, ownership, attachment serving.
  - `tests/unit/chat-pages.test.tsx` — the three screens render (one `h1`, composer states).
  - `tests/fixture-contract/chat.test.ts` — every seed attachment pinned to its file's sha256.
- Gates: `npm run lint` (0 errors), `npm run typecheck`, the full `npm test` suite,
  `npm run build`, and `npm run smoke` ("All 54 advertised routes render").

## Open items (do not quietly widen)

- **Live needs a messaging/communications service** (the plan §9.6 names it) and a transport
  (SSE/WebSocket or the service's own push). Until it freezes, the store is demo-local and
  no env switch can route a real conversation into a local file.
- **Attachments need object storage + virus scanning + signed URLs** (D7 media / C12). The
  local content-addressed directory is the seam; the message metadata does not change.
- **Notification delivery** is P4: the app raises the Inbox row + badge it can observe; the
  notification service is what would reach a person who is not looking at the portal.
- The staff gate reuses `cases:read` / `cases:write` provisionally, because
  `rbac-scopes-v1` names no messaging code; the ask is recorded here and in the route
  headers, not invented as a token.
