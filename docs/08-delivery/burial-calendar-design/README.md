# Burial calendar — burial schedules and their light pickups

> **Update 2026-09-28 — the write path has landed.** This record describes the READ surface as it
> shipped. The audit of the 2026-09-21 minutes found item 2's verb missing (no way to *record* a
> burial, and no surface to move the light pickup's `scheduled → in_progress → done` lifecycle);
> that write path is now built — `lib/api-client/burials-store.ts`, `lib/burial-admin.ts`,
> `app/api/schedule/burials/**`, `app/(staff)/staff/schedule/burial-admin.tsx`. The paragraph below
> saying "it is read-only" is therefore superseded for a `scheduling:write` session; a
> `scheduling:read` session still sees it read-only. Record: `docs/08-delivery/phase6-design/`.

**Task:** `villa-burial-light-calendar` · **Client minutes of meeting (Villa Memorial,
2026-09-21), item 2 — Calendar Integration for Light Pickup and Burial Schedule:**

> "Integrate a calendar into the system to record and manage burial schedules. The calendar
> shall include the pickup schedule of lights, corresponding to the date of burial."

The staff Schedule surface (`/staff/schedule`) now carries a **burial calendar**: a month and a
week view of the office's recorded burial dates, with each burial's **light pickup printed on
its own record**, a preparation list of what is next, and a strip of the conflicts the recorded
times collide on. It is read-only and fixture-driven — no platform service owns a burial
schedule, so the screen reads the office's own recorded sheet and says so.

## What shipped

- **Month and week views.** A Monday-first month grid padded to whole weeks, and the seven days
  (Monday–Sunday) around an anchor. The view is a URL selection (`?cal=month|week`) and the
  anchor is `?calDate=yyyy-mm-dd`, kept separate from the day board's own `?date=` so moving the
  calendar never moves the day board.
- **One burial = one record, pickup included.** A burial's light pickup is a field on the burial
  entry (`time · state · crew · note`); the calendar prints it under that burial. There is no
  second calendar event for the pickup — the minutes ask for the pickup "corresponding to the
  date of burial", so the model is one record with two times.
- **A preparation/coordination presentation.** The preparation list leads on the next six
  burials with their date · service time · deceased · lot/section · coordinator and the pickup's
  state, crew and time — the view a coordinator reads to plan the day. Flagged days carry the
  conflict mark in the cell (and in its accessible label).
- **Conflict surfacing from recorded times only.** Three rules, all read from the sheet:
  two burials sharing one service slot; one crew set for two pickups at the same time; a pickup
  set before its own burial. Nothing is recomputed against a service and no conflict is invented.
- **An honest live state.** With `SCHEDULING_BASE_URL` set, the burial calendar answers 503 with
  the named missing service and the rest of the Schedule surface stays usable; it is never dressed
  up as service data.
- **The same gate as the schedule it sits on.** The calendar renders under the existing
  `scheduling:read` gate (the nav entry's own scope), so preparation and coordination staff who
  already run the day board see it; a reader without it gets the designed forbidden state.

## Data model and provenance

`lib/fixtures/scheduling/burials.json` is an **APP-AUTHORED recorded sheet** (no contract names a
burial-schedule or light-pickup record). Its provenance carries the minute, and the
fixture-contract suite pins what may not drift:

| Promise | Where |
|---|---|
| every burial's `case_number` is a real `operations/cases.json` case, and its `deceased_name` / `coordinator` are that case's own words | `tests/fixture-contract/burial-schedule.test.ts` |
| every `lot_number` / `section` is a real `property/lots.json` row, agreeing with the case's interment in `property/lot-lifecycle.json` | same |
| a present pickup has a real park clock time, a crew **role** (never a person) and a vocabulary state | same |
| no amount, price or fee appears anywhere | same |
| a malformed row (bad date/time, missing identity, duplicate id) is a 502, never a cast | `tests/unit/burial-schedule.test.ts` |

The office's real identities are never invented: the deceased and coordinator are the case's own
words; the light-pickup `crew` is an office role label ("Delivery crew"), not a named staff member.

## Rules homes

| What | Where |
|---|---|
| Park-time clock, day lookup, month/week grids, linkage, conflict rules, month navigation | `lib/burial-calendar.ts` (pure) |
| Tolerant reader + the named live-mode 503 (`BURIAL_SCHEDULE_NOT_WIRED`) | `lib/api-client/burial-schedule.ts` |
| The recorded sheet, with provenance | `lib/fixtures/scheduling/burials.json` |
| The calendar view (month grid · week grid · conflict strip · preparation list) | `app/(staff)/staff/schedule/burial-calendar.tsx` |
| The styles | the "Schedule: burial calendar" block of `styles/components.css` |

## Measured evidence (no screenshots)

- **Fixture:** 3 recorded burials, all 3 with a light pickup; one intentional demo conflict (the
  Delivery crew recorded for two 3:00 PM pickups on 2026-09-30).
- **Month grid:** `2026-09` renders **5 whole weeks × 7 days = 35 cells**, padding 2026-08-31 and
  2026-10-01…04; the two 2026-09-30 burials land in their own cell.
- **Week grid:** anchor `2026-09-30` → **7 day columns**, `2026-09-28` … `2026-10-04`.
- **Conflict rules:** 1 crew clash flagged on the fixture; synthetic slots/order clashes each
  flag exactly one conflict; a clean sheet flags none.
- **CSS block:** 4,199 bytes, 32 rules, **98 declarations**, tokens only (font sizes are ladder
  aliases; the conflict wash is an 8 % `--color-status-danger` mix).
- **Added tests:** 44 across four suites (17 pure + 11 page + 7 reader + 9 fixture-contract).

## Gates (all green)

```
npm run lint       # clean
npm run typecheck  # clean
npm test           # 220 files, 2,582 tests passed
npm run build      # production build passed
```

The shared guards stay green: `page-backgrounds`, `typography-system`, `phone-layout`,
`broken-pages`, `accessibility-craft`, `composition-pass`, `public-layout`, and the existing
`schedule-page` suite (the day board still leads; the calendar follows the week at a glance).

## Honest limits / open contract ask

- **Recording is not wired.** The calendar records and displays the office's sheet; adding or
  editing a burial date or a light pickup waits on a service. `scheduling-resources` owns
  bookings and property owns interments, and **no contract names a burial-schedule or
  light-pickup record** — this PR carries that ask. Live mode is the named 503 rather than a
  fake write path.
- **One demo conflict is present on purpose** (the crew double-booking above) so the flag can be
  seen; it is described in the fixture's provenance, not hidden.
