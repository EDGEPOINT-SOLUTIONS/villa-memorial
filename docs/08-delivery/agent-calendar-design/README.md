# Appointments & tasks — the agent calendar (2026-10-02)

## The brief (captain, 2026-10-02)

> “I want the appointment and tasks also has a calendar where you can see what
> is your activity for that day are.”

The agent's **Appointments & tasks** screen (`/agent/appointments`, approved
design page 07) stops being only a list and gains a **calendar**: the month at a
glance, every recorded appointment marked on its day, and one tap on a day to see
what that day holds. It follows the family visit calendar that landed
2026-09-30, so the product has **one calendar pattern**.

## The one calendar grammar

The screen reuses the family visit calendar's shipped **`.fv-cal*`** grammar —
the `.fv-cal` prefix is the original family name for the shared grammar, not a
family-only style:

- a **Monday-first month grid** (the Philippines' own week), every recorded
  appointment marked on its Asia/Manila day;
- a **coloured dot per state** with a **named legend** — the colour is the
  state's role, never decoration, and the day detail says the state in words;
- the **selected day's detail beside the grid on a wide screen and under it on a
  phone**: who it is with, what it is, the time, the place, what to bring and the
  office's own confirmation state;
- **keyboard-selectable days** (a roving tab stop; ←/→ a day, ↑/↓ a week,
  Home/End the week's ends, PageUp/PageDown the month), each with a full text
  summary behind its mark.

The month arithmetic moved to a portal-neutral module,
[`lib/calendar-grid.ts`](../../../lib/calendar-grid.ts) (Monday-first weeks,
UTC-computed cells), which both calendars now read. `lib/family/family-calendar.ts`
re-exports it so no family import changed.

## What the page keeps, and what changed

The page keeps every recorded fact it already showed:

- the **hero** (stops · confirmed · waiting · tasks);
- **Today** — the drive order with what to bring and whether the office
  confirmed (the captain's own allowance: “today's list can sit above/beside the
  grid as it does now”);
- **Small promises** — the tasks, checked off in the same disabled control;
- the **seven appointment reasons** note and the two booking actions (unchanged
  names, still disabled / office-bound).

What changed is the old *rest of the week* list, which is now the calendar's own
marks and day details — the week's recorded appointments (17 · 18 · 19 September
in the demo record) are on the grid and named in each day's summary. No data was
removed; it is read by day instead of as a flat list.

## Where the data comes from

The office's recorded workspace, read through the existing client:
`listAgentAppointments()` and `listAgentProspects()` in
`lib/api-client/agent.ts` → `lib/fixtures/agent/workspace.json`. Nothing is
invented:

- appointments are keyed to their Asia/Manila day (`manilaDayKey`);
- **“who it is with”** is the office's own contact name for an appointment's
  `contact_id` (prospect names), never a typed label;
- a **task appears on the calendar only when the record writes a due day**
  (`due_at`); the demo tasks carry no due day, so none is placed on a cell and the
  neutral “A task due that day” role is declared but not marked. The model
  supports and tests a dated task; the record is not edited to make one.
- the demo workspace is a frozen scenario, so the calendar's **“today”** is the
  day of the appointments the record classifies as today's stops
  (`recordedTodayKey`), falling back to the real Manila day only when the record
  carries no today. This keeps the drive order and the marked day telling the
  same story.

No availability is shown, no slot is implied and no scheduling write exists —
the booking actions keep their exact disabled names.

## Evidence

Before is the running build on `:4000` (main, no agent calendar); after is this
branch's build on `:4100`. Captures at 1440 and 390.

| View | Before | After |
|---|---|---|
| 1440 · the page | `before-appointments-1440.png` | `after-calendar-1440.png` (September 2026 · 16 Sep selected) |
| 390 · the page | `before-appointments-390.png` | `after-calendar-390.png` (grid, then the day detail under it) |

Live checks on the after page: **0 console errors**; exactly **one `h1`**; **0**
unlabelled fields; **0** unnamed buttons; **no sideways scroll at 390**
(`document.scrollWidth === 390`).

## Gates

```text
npm run lint        → 0 errors (4 pre-existing warnings: acquisition.ts unused import, 3 in gallery-page.test.tsx)
npx tsc --noEmit    → clean
npm test            → 269 files / 3000 tests passed
npm run build       → passes
```

Relevant guards:

- `tests/unit/agent-calendar.test.ts` — the shared Monday grid, the Manila day
  key, the grouping, the recorded today, the default month, the state→tone map,
  a dated task placed on its day and an undated one left off it, and the day
  summary.
- `tests/unit/agent-appointments-page.test.tsx` — the month opens on the recorded
  month, a marked day's summary, the selected day's detail (who · what · time ·
  place · bring · state), a plain day reading “nothing recorded”, the named
  legend, the kept drive order / small promises / note, and the disabled controls
  keeping their names.
- `tests/unit/family-calendar.test.ts` — the shared grid re-export still holds.
- `tests/unit/typography-system.test.ts`, `page-backgrounds.test.ts`,
  `broken-pages.test.ts`, `accessibility-craft.test.tsx` — the calendar reuses
  the shipped ladder type, paints no new sky ground, declares no duplicate class
  and keeps one `h1`.

## Files

- `app/(agent)/agent/appointments/page.tsx` — hero + Today + Small promises +
  the calendar section (actions and the reasons note kept).
- `components/agent/agent-calendar.tsx` — the month grid and day detail.
- `lib/agent/agent-calendar.ts` — the pure grouping/tone/default-month/summary
  logic.
- `lib/agent/agent-view.ts` — the Manila day key (`manilaDayKey`,
  `manilaTodayKey`).
- `lib/calendar-grid.ts` — the portal-neutral month arithmetic (shared).
- `lib/family/family-calendar.ts` — now re-exports the shared grid; family
  behaviour unchanged.
- `lib/api-client/agent.ts` — `AgentTask` gains the optional recorded `due_at`.

## Open with the office

The agent scheduling contract is still open (no read/write API, no availability
service). The calendar reads the office's recorded appointments and shows no
free slot; when the contract lands, this page gains the live branch and the day
cells lose the “we can’t check who is free” limitation stated on the page.
