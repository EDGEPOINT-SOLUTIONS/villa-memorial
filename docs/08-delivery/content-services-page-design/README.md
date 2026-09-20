# Funeraria Memorial Services page — Phase 3 implementation record (2026-09-21)

**Route:** `/services` (`app/(public)/services/page.tsx`), with the three guide routes
`/services/death-at-home`, `/services/death-at-hospital` and `/transport`.
**Brief:** Phase 3 of the captain-approved content-catalogue plan —
`data/villa-content-catalog-plan/report.md` §9 (phase table) and §11 step 5: *"one hero →
straight to the services; service entries + the three guide pages as service entries; chapel
names read the chapel record"* (captain's 2026-09-21 direction; report §10).

## What shipped

### One hero, then straight to the services

The pre-migration page led with a 24/7 call panel, a sticky "On this page" subnav and a
"what happens after you call" steps section before any price. Per the captain's direction the
page is now **one hero → straight to the services**:

- the hero keeps its eyebrow / headline / one-line lead / photograph (the page document) and
  gains **two actions**: the primary 24/7 call (`tel:`, read from the landing content document —
  never typed) and "See the 2026 services" (`#services`);
- `ServicesSubnav` and the steps section are gone, along with
  `components/villa/services-subnav.tsx`;
- the page leads into `Services and prices`, `Embalming — priced by the day` and
  `Chapel — check the dates and book online` immediately.

### The service descriptions are editable content

The descriptions typed into `components/villa/service-rates-2026.tsx` are now paragraph blocks
in the **"Funeraria Memorial Services" page document** (`lib/fixtures/content/pages.json`),
edited in **Pages & content → Funeraria Memorial Services** (`/staff/landing/services`):

| Now editable (page-document blocks) | Was |
|---|---|
| The five a-la-carte notes (`services-alacarte-*`) | `ALACARTE_NOTES` in the component |
| The two chapel-class copy lines (`services-chapel-*`) | the hardcoded `what` strings on the chapel cards |

`lib/service-content.ts` is the ONE typed reading of those blocks (stable ids, the
`plans-note-<key>` convention Phase 2 established), with the old copy as the honest fallback.

### The three guide pages are editable service entries

The captain confirmed the guide pages stay as service entries (§10 answer 3). Each is a
`CatalogueEntry` of kind `service` in `lib/fixtures/content/service-entries.json`, read/written
by `lib/api-client/content-entries.ts` (the app-authored CMS seam, same posture as the landing
and page-document stores; `POST /api/content/entries`, `catalog:write` provisional) and edited
by `components/content/catalogue-entry-editor.tsx` at
`/staff/landing/service-entry/[key]`. `/staff/landing/services` lists the three with their edit
links ("Service entries").

`/services` renders them as cards in its own section, and each route
(`components/villa/service-guide-page.tsx`) renders its entry's title, eyebrow, lead,
photograph and content blocks; the route's `<title>`/description come from the same entry. The
routes themselves are unchanged.

### Chapel names read the park's chapel record

The two chapel cards used to hardcode `Common chapel` / `Chapel A` / `120 people`. The card now
reads the park's own staff-editable **chapel record** (`getChapelSchedule()`, the same source the
booking dialog's `/api/chapel/schedule` serves): the card title is the record's `name`, the
capacity is the record's `capacity`, and the sheet class ("Common chapel" / "Private chapel")
shows as a small label. A rename on `/staff/schedule` therefore reaches the card and the booking
dialog together — the drift the plan's §4.3 recorded
(`tests/unit/chapel-storefront-sync.test.tsx` proves it).

## Not changed

- The approved section grammar and rate components — the amounts still come from
  `lib/villa-pricing.ts` / `lib/catalogue-skus.ts`; no amount is authored in a view or block.
- The pricing / catalogue / chapel stores and their staff screens.
- The service-entry pages' real actions (Add to cart / Request order / the chapel booking step)
  and the illustrative-sample labels.
- `/facilities` (its room copy and rates stay as they were; the two pages still cannot drift).

## Evidence

Screenshots in `shots/` (`/services`, production build, 1440×900 and 390×844):

| Shot | What it shows |
|---|---|
| `services-before-1440.png` · `services-after-1440.png` | 1440×900 viewport — before: call panel + subnav; after: hero → straight to the services. |
| `services-before-390.png` · `services-after-390.png` | 390×844 viewport. |
| `services-before-1440-full.png` · `services-after-1440-full.png` | Full page, before/after. |
| `services-before-390-full.png` · `services-after-390-full.png` | Full page at 390. |
| `editor-services-1440.png` · `editor-services-entries-1440.png` | The page editor and its **Service entries** list. |
| `editor-service-entry-1440.png` | One guide's service-entry editor (identity · hero photograph · content blocks). |

## Tests

- `tests/unit/service-content.test.ts` — the service descriptions read the document with
  honest fallbacks; the three guide entries and their typed view; a client photograph resolves
  through the one imagery rule home.
- `tests/unit/content-entries-store.test.ts` — the store serves the three entries, a save
  lands on the next read, and a price binding that names an unknown SKU is refused.
- `tests/unit/service-entry-page.test.tsx` — **a service-entry edit reaches the guide page,
  its `<head>` and the `/services` card**; the transport route reads its own entry.
- `tests/unit/chapel-storefront-sync.test.tsx` — **a chapel-record rename reaches the card and
  the booking dialog's schedule** (and the capacity follows).
- `tests/unit/pages-and-content-admin.test.tsx` — the services document now shows its block
  canvas and the service-entry list; the entry editor renders; an unknown key 404s.
- Repinned: `tests/unit/villa-services-premium.test.tsx`, `tests/unit/price-surfacing.test.tsx`
  (the subnav/steps assertions become hero-and-call-bar assertions; the chapel booking aria
  names carry the record's own name) and `tests/unit/reading-budget.test.tsx` (the guide card
  prints one short line, the full lead stays on the guide page).
- Gates: `npm run lint && npm run typecheck && npm test` (2175 passed) and `npm run build`.

## Open follow-up (named, not smuggled in)

Phase 4 is out of scope here: the item catalogue's per-casket/package content blocks, the
plan-tier **entries** (as opposed to document blocks) and the nav cleanup. This phase adds the
service-entry store and editor only; no casket/package entry was added.
