# Ask for a visit — the family visit calendar (2026-09-30)

## The brief (captain, 2026-09-30)

> “Ask for a visit page should be in calendar so that visually it’s so easy to
> understand, you can select date and see the details what is that day for.”

The family’s “Ask for a visit” screen (`/client/appointments`) stops being a list
and becomes a **calendar**: the month at a glance, every day that already holds
something marked, and one tap on a day to see what that day is for. It has to read
instantly for someone who is grieving and on a phone.

## The shape (the household that landed 2026-09-30)

The page reads the same provisional records it always did — the office’s own
times in `lib/fixtures/family/workspace.json` through `lib/api-client/family.ts`
— now keyed per loved one. `getFamilyHousehold()` merges each person’s
plan/workspace/case, and the page follows the dashboard’s own household grammar:

- **no `?person=` on a multi-person account → “Everyone”**: the whole household’s
  month, every event naming the loved one it belongs to;
- **`?person=<id>` → one loved one’s days**;
- a **one-person household renders no switcher** and reads exactly as before.

The scope switcher is the same `PersonSwitcher` every family page carries, with
its “Everyone” link pointed back at `/client/appointments`.

## What the calendar does

- **A month grid.** `lib/family/family-calendar.ts` lays the month out **Monday
  first** (the Philippines’ own week), marks **today**, and puts a coloured dot
  on every day that holds a recorded visit. The colour is the state’s role
  (confirmed · waiting · happened), never decoration; the legend names the three
  roles, and the day detail says the state in words.
- **Selecting a day** shows its detail **beside the grid on a wide screen and
  under it on a phone**: who the visit is for, what it is, the time, the place,
  what to bring, the state, and **the office’s own words** (`next` / `discussed`),
  with the record’s own one action.
- **Asking for a visit from a day.** The day detail carries a collapsed “Ask for
  a visit on this day” block. The day comes from the selection; the person and
  their lot come from the household’s records (never typed); and the block prints
  **exactly what the office will receive** before the printed request is opened.
- **The printed request.** The existing request slip
  (`lib/contracts/family-request-slip.ts`) gains an optional chosen day; the slip
  the office receives now carries the person · their lot · the park · **the visit
  kind** · **the day asked for**, and still says “a request, not a ticket”.
- **The household month.** With several loved ones, the grid marks every person’s
  days and the detail names the person; the switcher narrows to one person at a
  time. The two-person case is visible in one month (e.g. September 2026: Ernesto
  12/22/29, Aurora 19).

## The phone choice (390 × 844)

**A compact month grid with the day detail under it** — not a modal sheet and not
an agenda-only list. Reasons: the brief’s whole point is the *month at a glance*;
an agenda list loses that, and a sheet hides the grid behind a trap while the
calendar is a page region a keyboard and a screen reader can simply reach. The
grid stays small (2.5rem cells, dots instead of labels), the detail sits directly
beneath it, and the request block is one disclosure below that. Evidence:
`after-calendar-phone-390.png`, `after-request-phone-390.png`.

## The keyboard path (stated)

The month is a real `<table>` (weekday column headers, day cells). Each marked
day is a `<button>` with a full text summary behind its mark (the day, then every
visit with who/what/time/state), and the grid carries the standard movement:

- **Tab** reaches the toolbar (previous / next / this month), then the **one**
  day button in the grid’s roving tab stop, then the day detail’s action, then
  the request disclosure.
- **← / →** move a day, **↑ / ↓** a week, **Home / End** the ends of the week,
  **PageUp / PageDown** the previous/next month (keeping the day of the month).
- **Enter / Space** selects the focused day; the detail region announces the
  selection.

Verified live at 1440 against the production build: `22 Sep → ArrowRight → 23
Sep → ArrowDown → 30 Sep → Home → Mon 28 Sep → PageUp → August 2026`, focus and
selection following each key.

## What is NOT invented

No availability. There is no family-facing scheduling read/write contract, so the
page never shows a free slot: a day with nothing on it is a plain day, and the
request block says **“We can’t check who is free yet. This asks the office for
<the day> and they confirm it — nothing is booked until they call you.”** No
chapel is named (the park’s chapel list is still a PLACEHOLDER in staff
scheduling), and no amount appears on the page (money stays in the snapshot).

## Evidence

Before/after screenshots live beside this file. Before is the captain’s own
running build at `f5…` on :4000; after is this branch’s production build.

| View | Before | After |
|---|---|---|
| 1440 · the page | `before-appointments-1440.png` | `after-calendar-everyone-1440.png` (Everyone, October) |
| 1440 · the household month | — | `after-calendar-household-september-1440.png` (Everyone, September: Ernesto + Aurora) |
| 1440 · a day with details | — | `after-day-detail-1440.png` (22 Sep, confirmed) |
| 1440 · a day with nothing | — | `after-empty-day-1440.png` (16 Sep) |
| 1440 · the request payload | — | `after-request-payload-1440.png` |
| 1440 · the printed request | — | `after-request-slip-1440.png` |
| 1440 · one loved one’s days | — | `after-person-ernesto-1440.png` |
| 390 · the page | `before-appointments-390.png` | `after-calendar-phone-390.png` |
| 390 · the request payload | — | `after-request-phone-390.png` |

Live checks on the production build: **0 console errors**; exactly **one `h1`**
and one `h2`; **0** unlabelled fields; **0** unnamed buttons.

## Gates

```text
npm run lint        → 0 errors (3 pre-existing warnings in gallery-page.test.tsx)
npx tsc --noEmit    → clean
npm test            → 259 files / 2891 tests passed
npm run build       → passes
```

Relevant guards:

- `tests/unit/family-calendar.test.ts` — the Monday grid, the Manila day key, the
  grouping, the default month, the state→tone map and the visit kinds.
- `tests/unit/family-records.test.tsx` — the page’s month marks, the times from
  their instants, the request payload, the booking steps and the honest note.
- `tests/unit/family-request-slip.test.ts` — the visit slip prints the chosen day
  and still says nothing is booked; an unknown visit kind 404s.
- `tests/unit/family-pages.test.tsx`, `family-reading-budget.test.tsx` — the
  shared hero/one-action/gap disclosure and the family word budget.
- `tests/unit/page-backgrounds.test.ts`, `typography-system.test.ts`,
  `broken-pages.test.ts` — the new `.fv-cal*` CSS stays off sky grounds, on ladder
  type, and invents no duplicate class.

## Files

- `app/(family)/client/appointments/page.tsx` — the household scope + hero + panel.
- `components/family/family-visit-calendar.tsx` — the month grid and day detail.
- `components/family/family-visit-request.tsx` — ask from the day, with the payload.
- `lib/family/family-calendar.ts` — pure grid/grouping/defaults/visit-kind logic.
- `lib/family/family-view.ts` — the one new day key (`familyInstantDay`,
  `familyTodayKey`).
- `lib/contracts/family-request-slip.ts` + `app/(family)/client/requests/slip/page.tsx`
  — the optional chosen day on the printed request.
- `styles/components.css` — the appended family-visit-calendar block.

## Open with the office

The family scheduling contract is still open (no read/write API, no availability
service). The calendar reads the office’s recorded times and asks the office for
a day; **nothing here books a slot**. When the contract lands, this page gains the
live branch and the day cells lose the “we can’t check who is free yet” line.
