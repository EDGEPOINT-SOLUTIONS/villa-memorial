# Prospects — the office's client lifecycle (2026-10-02)

**Status:** shipped on `fm/villa-admin-prospects` (local-only).
**Captain's intent:** *"when someone inquires then we will email or call them and then when all
is set you can add them in a dedicated page to handle clients or future clients… All labeled as
'Prospects' Fall down to the Prospects Pages and then in that page you can email blast them,
their details should be there, a one click button for calling … you can also assign these with
your agents … and it will automatically notify them. The agents prospects is synced also in the
admin panel, when they add a prospects, the admin sees it real time."*

---

## What this adds

A dedicated **Prospects** screen (`/staff/prospects`, Messages & inquiries) that holds every person in
play and the office's next move on each one:

- **The list leads.** Four figures (Prospects · New · Contacted · Converted) then one row per
  prospect — name · phone · what they asked · source · state · assigned agent — with one-click
  **Call** (`tel:`) and **Email** (`mailto:`) and one **Open**. No prose wall.
- **One detail panel per prospect.** Open renders the person's facts (phone · email ·
  considering · assigned · came in · last contact), what they asked, their notes, the state
  advance (New → Contacted → Converted), the assignment control, and the recorded pipeline /
  assignment / email history.
- **An empty state that starts the flow.** A clean office sees "No prospects yet" and the one
  action that begins it: **Add the first prospect**.
- **Email blast.** Tick several rows, write one subject and message, and **Send** — the message
  is recorded on the office's outbox and handed to the office's own mail client (`mailto:` BCC).
- **Assign to an agent.** A dropdown of the office's recorded agents; assigning folds into the
  agent's `owner` and leaves a **durable notice in the agent's portal**
  (`/agent/prospects` → "Assigned to you by the office").
- **Inquiries connect.** The office moves an enquiry **New → Contacted** and can **convert it
  into a prospect in one step**; a Contacted enquiry lands Contacted, a New one lands New.

## One record, two portals

The feature never grows a second store. Every write appends to the **same durable demo journal**
the agent acquisition already owns (`lib/api-client/agent-store.ts`), and `lib/api-client/agent.ts`
folds it for BOTH portals:

- a prospect the office types is a `prospect_captured` event — the agent portal reads it on the
  next request;
- an office **state move is an ordinary forward stage move** (`new` / `contacted` / `sold`), so
  the office's word *is* the agent's stage and converting a prospect becomes a client in the
  agent's book;
- an assignment is a `prospect_assigned` event, folded last, so the agent reads the owner the
  office set and receives the notice;
- a blast is a `prospect_blast` event.

Because both sides read one fold, they cannot disagree — and the tests pin that: a prospect
created through the office route appears in `listAgentProspects()`, an office advance changes the
agent's `stage`, and an office assignment changes the agent's `owner` and produces
`listAssignmentNotices("Alex Agent")`.

## The office's words vs the agent's line

The agent pipeline has seven PRD rungs (New → Contacted → Qualified → … → Sold). The office asked
for three words. `lib/crm/prospect-view.ts` makes the three a **coarse view of the one line**
(New = `new`, Contacted = every rung between, Converted = `sold`), so the office never picks a
different position than the agent's. The assignment dropdown is validated against the recorded
roster (`lib/api-client/agent-roster.ts` — the agent-portal accounts plus the recorded HR sales
staff), so a typed name can never become an assignment to nobody.

## Honest about the transport

The platform notification service is P4 and the app has **no outward mail path**, so the server
cannot send email. What it does honestly:

- the blast is recorded in the office's outbox (subject · message · recipients · author · time,
  state `queued`);
- the browser then hands the one message to the office's own mail client (`mailto:` with the
  recipients BCC'd);
- the screen prints `PROSPECT_SERVICE_NOTE` — the customer-records service is unbuilt and the
  notification service is not connected — rather than claiming delivery.

## The screens

| Screen | What it shows |
|---|---|
| `/staff/prospects` | the list, the KPI figures, the empty state, Add, and the email-blast control |
| the detail panel | one prospect: facts · what they asked · notes · state advance · assign · history |
| `/agent/prospects` | the durable "Assigned to you by the office" notices + the pipeline that reads the same record |
| `/agent/prospects/[id]` | the agent's record of the same person, its `handled by` now the office's assignment |
| `/staff/inquiries` | the New → Contacted move and the one-step Convert-to-prospect action |

## Evidence

### Commands

```bash
npm run lint          # pass
npm run typecheck     # pass
npm test              # pass (full suite)
npm run build         # pass
```

Focused suites:

```bash
npx vitest run tests/unit/staff-prospects-store.test.ts \
  tests/unit/staff-prospects-route.test.ts \
  tests/unit/staff-prospects-page.test.tsx \
  tests/unit/inquiry-board-lines.test.tsx tests/unit/nav.test.ts
```

### Screenshots — `shots/`

Captured against the fixture-mode dev server (`DEMO_QUICK_FILL=1`, port 4100) with a seeded
journal, signed in as `staff@vm.demo` and then `agent@vm.demo`, at 1440×900 and 390×844.

| File | What it shows |
|---|---|
| `list-1440.png` · `list-390.png` | The Prospects list at both widths: the four figures leading, one row per person with Call · Email · Open, and the honest transport line. The 390 view has no sideways page scroll (`scrollWidth === innerWidth`); the table pans inside its own frame. |
| `list-390-table.png` | The list on a phone, scrolled to the rows (the table's own focusable pan frame). |
| `detail-1440.png` · `detail-390.png` | The ONE detail panel for Nena Bautista: facts · what she asked · notes · the state advance · the assignment control · pipeline history. |
| `assigned-1440.png` | The assignment flow after assigning Nena to **Alex Agent**: the panel reads "Assigned to Alex Agent" and the Assignment history records Oct 2 · by Sam Staff · the note. |
| `blast-1440.png` | The email-blast composer: two selected prospects with their addresses, and the honest line that the message is recorded and handed to the office's own mail app. |
| `inquiry-convert-1440.png` | The one-step enquiry → prospect dialog, opened from a row's **Convert to prospect** action. |
| `agent-view-1440.png` · `agent-view-390.png` | The agent portal reading the SAME journal: the "Assigned to you by the office" notices for both hand-offs, above the pipeline list. |
| `agent-record-1440.png` · `agent-record-390.png` | The agent's record of Nena, its lead line now "handled by Alex Agent" — the office's assignment folded in. |

### Tests added / changed

- `tests/unit/staff-prospects-store.test.ts` — the four pure readings (intake, state move,
  assignment, blast) + the shared fold: an office capture reaches the agent, the last assignment
  wins and leaves a notice, the office state moves the agent's stage and converts to a client, and
  a blast is journalled.
- `tests/unit/staff-prospects-route.test.ts` — 401/403 on the staff gate, 422 on an incomplete
  prospect / a backward state / a non-agent assignee / an empty blast, 201 on every legal write,
  and the enquiry status + one-step convert routes.
- `tests/unit/staff-prospects-page.test.tsx` — the real page: the `cases:read` gate, one `h1`,
  the figures + empty state, the list reading the shared record, the detail panel and the blast
  dialog.
- `tests/unit/inquiry-board-lines.test.tsx` — the board's new `agents` prop.
- `tests/unit/nav.test.ts` — the board's group list now carries Prospects.
- `tests/fixture-contract/agent.test.ts` unchanged: a captured lead's `email` is optional.

## Files

| File | What it is |
|---|---|
| `lib/crm/prospect-view.ts` | The office's three lifecycle words, the derivation from the one stage, the contact/`mailto` builders and the honest service note. |
| `lib/crm/prospect-actions.ts` | Pure readings: create · state move · assign · blast, and the KPI counts. |
| `lib/agent/acquisition.ts` | `ProspectAssignment` / `ProspectBlast` shapes, `applyAssignments`, `assignmentNotices`; the capture gains an optional email. |
| `lib/api-client/agent-store.ts` | The journal rows: `prospect_assigned` and `prospect_blast` beside the existing capture / stage-move events. |
| `lib/api-client/agent.ts` | Folds the assignments; exposes `listProspectAssignments`, `listProspectBlasts`, `listAssignmentNotices`. |
| `lib/api-client/agent-roster.ts` | The recorded agent roster the dropdown assigns from. |
| `lib/api-client/inquiry-store.ts` · `lib/inquiry-intake.ts` | The enquiry status journal + its one pure move reading. |
| `app/api/staff/_guard.ts` · `app/api/staff/prospects/**` · `app/api/staff/inquiries/[id]/route.ts` | The thin BFF writes. |
| `app/(staff)/staff/prospects/page.tsx` · `prospects-board.tsx` | The screen and its browser half. |
| `app/(staff)/staff/inquiries/inquiry-board.tsx` · `page.tsx` | The status move and the one-step convert. |
| `app/(agent)/agent/prospects/page.tsx` | The durable assignment notices. |
| `lib/rbac/nav.ts` | The Messages & inquiries entry. |
| `styles/components.css` | The appended "staff: the Prospects workspace" block. |

## Out of scope

Real mail delivery and a frozen customer-records contract (both open asks, recorded in
[`../open-items.md`](../open-items.md) §10). The enquiry board keeps its own status vocabulary;
`closed` is not offered on this screen.
