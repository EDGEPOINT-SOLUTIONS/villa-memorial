# Digital memorial (public) — implementation record (F-04, 2026-09-18)

**Routes:** `/memorials` (Digital Memorial Search) · `/memorials/[id]` (Digital Memorial Page) ·
`/memorials/find` (Find My Loved One).
**Brief:** checklist F-04 — "Build the public side of the digital memorial — the three screens the
requirement document names and the product has never had", with the privacy and consent rules
visible on the pages themselves because the digital-memorial service does not exist.

## The rule this work is built around

> **Nothing is published by default. A memorial exists only when the family has chosen to
> publish it. Never render a fabricated memorial, a placeholder person, or a name that looks
> real.**

The app therefore ships **zero published memorials**. `lib/fixtures/memorials/memorials.json`
records the honest state — `service_state: "not_wired"`, an empty `memorials` list, and the demo
family's consent reference with `visibility: null` (“Not decided yet”, the same state the family
portal shows for all three choices). No person is invented to make the screens look alive; the
published branch is implemented and proven by tests with a test-only record
(`tests/helpers/memorial-record.ts`, name “Example Memorial Record” — unmistakably a test).

## What each screen does

| Screen | Route | What it serves |
|---|---|---|
| **Digital Memorial Search** | `/memorials` | The privacy rules **before** the results: a “Searchable” card, a “Never shown” card, and the three visibility choices in a visitor's terms. Then one search by name + birth/death year, the honest empty states, the shape a published memorial takes, and one family path. |
| **Digital Memorial Page** | `/memorials/[id]` | A family-published record renders the profile: portrait (or the initials the family-portal design already uses), name, life dates, the first line of the remembrance at a glance, the family's further words, where they rest, and the office line as the only contact. An absent id and an unpublished id get **the same** “This memorial cannot be shown here” answer — the page never confirms that a private person exists. |
| **Find My Loved One** | `/memorials/find` | The gentler path: how the office looks (4 steps), what to have ready, how a memorial is created or changed (only the family decides), and the privacy promises — with the 24/7 line as the primary action. |

## Where every fact comes from (nothing is authored in a view)

| Fact | Source |
|---|---|
| The three visibility choices | `MEMORIAL_VISIBILITY` in `lib/memorials.ts`; `familyLabel` is pinned by **reading the family portal page** in `tests/unit/memorials.test.ts`, so the two surfaces cannot describe different choices |
| Searchable / never-shown lists, privacy promises | `MEMORIAL_SEARCHABLE`, `MEMORIAL_NEVER_SHOWN`, `MEMORIAL_PROMISES` in `lib/memorials.ts` |
| Search parsing, validation, matching | `parseMemorialSearch` / `matchMemorials` in `lib/memorials.ts` — untrusted params clamped, years validated, **an empty query matches nobody** |
| Published records | `lib/api-client/memorials.ts` — tolerant field-by-field reader over the recorded fixture; **drops every record whose visibility is not `published`**, throws 500 on a malformed published record |
| 24/7 number | the staff-editable landing content document (`listLandingContent()`, zone 01) — never typed |
| Resting-place line | built from the record's own park/section/lot (`memorialRestingLine`) |

## Search that is not a directory

- `matchMemorials([…], emptyQuery)` returns `[]` (asserted directly).
- A result page (`?name=…`) is **noindex** and disallowed in `robots.txt` (`Disallow: /memorials?`);
  the canonical stays `/memorials`.
- “Nothing found” names every reason — kept private, family only, or not exist — without narrowing
  which one applies.
- When the store holds nothing published (today), the stronger copy is used: “No memorial can be
  found yet”, with the service line.

## Crawl behaviour (deliberate, not incidental)

| Surface | Robots |
|---|---|
| `/memorials`, `/memorials/find` | In `PUBLIC_PAGES` → sitemap + indexable |
| `/memorials?…` | `noindex, follow` from `generateMetadata`, plus `Disallow: /memorials?` |
| `/memorials/<published-id>` | Normal `pageMetadata` (canonical of its own) — and only a published record enters `app/sitemap.ts` |
| `/memorials/<anything-else>` | `UNPUBLISHED_MEMORIAL_ROBOTS` = `noindex, follow`; no name, no canonical claim |

`app/robots.ts` cannot express “noindex only while unpublished” for one path shape, so the rule
lives on the page; a blanket disallow would hide published memorials too (documented in the file).

## Public navigation

- The bar gains one chip: `SITE_NAV_LINKS` = Home · Services · Plans · Lots · Park · Facilities ·
  Gallery · **Memorials** · Contact. Measured on the built app: 9 chips on **one row at 1200 px**
  (the tightest desktop width) with no wrapping and no horizontal overflow.
- The phone quick menu and the footer's “Explore” column gain “Digital memorial search” and
  “Find my loved one”, so every chrome surface reaches the pages.
- `PUBLIC_PAGES` publishes the two static routes; `tests/unit/seo.test.ts` walks `app/(public)`
  and pins the table to the tree.

## Render check (production build, `next start`)

Measured in Chrome via `chrome-devtools-axi` against the built app. Shots in `shots/`
(`<state>-1440.jpeg` / `<state>-390.jpeg`, full page).

| State | Viewport | `h1` | Overflow | Min button | Rules before form | robots |
|---|---|---|---|---|---|---|
| `/memorials` | 1440 × 900 | 1 | 0 | 48 px | yes | indexable |
| `/memorials` | 390 × 844 | 1 | 0 | 48 px | yes | indexable |
| `/memorials?name=Rosalinda&born=1931` (empty) | 1440 × 900 | 1 | 0 | 48 px | yes | `noindex, follow` |
| `/memorials?name=Rosalinda&born=1931` (empty) | 390 × 844 | 1 | 0 | 48 px | yes | `noindex, follow` |
| `/memorials/find` | 1440 × 900 | 1 | 0 | 48 px | — | indexable |
| `/memorials/find` | 390 × 844 | 1 | 0 | 48 px | — | indexable |
| `/memorials/private-record` (absent/unpublished) | 1440 × 900 | 1 | 0 | 48 px | — | `noindex, follow` |
| `/memorials/private-record` (absent/unpublished) | 390 × 844 | 1 | 0 | 48 px | — | `noindex, follow` |

Also verified by `curl` on the built app: `/robots.txt` contains `Disallow: /memorials?`;
`/sitemap.xml` contains the two static memorial routes and **no** `/memorials/<id>` URL.

The **published** branch cannot appear in a live render check by design (no fabricated person);
its proof is `tests/unit/memorials-published-page.test.tsx` (real routes with the reader mocked to
serve the test-only record: profile renders, canonical is its own, results appear only for a
matching query) plus the profile tests in `tests/unit/memorials-pages.test.tsx`.

## Tests

| File | Pins |
|---|---|
| `tests/unit/memorials.test.ts` | The visibility vocabulary (family-portal drift guard), searchable/never-shown, query parsing/validation, empty-query-is-nobody, name/year matching, and the reader's drop-everything-not-published rule |
| `tests/unit/memorials-pages.test.tsx` | The three real pages: one `h1`, rules before the form, the three choices, honest empty states, the uniform absent/unpublished answer, the profile's fields, and no name leaking from the family fixture |
| `tests/unit/memorials-published-page.test.tsx` | The published branch through the real routes (reader mocked): profile, metadata, search results |
| `tests/fixture-contract/memorials.test.ts` | The fixture records an empty published store, the consent record points at the family snapshot and copies no name |
| `tests/unit/reading-budget.test.tsx` | `/memorials`, `/memorials/find` and the not-available `/memorials/[id]` join the reading budget |
| `tests/unit/seo.test.ts` | The two static routes are in `PUBLIC_PAGES`, no detail route is static, the sitemap carries no unpublished memorial, and robots disallows only the query state |

## Honest gaps (open, not hidden)

- **No digital-memorial service or contract exists.** `memorialsLiveModeEnabled()` is `false` with
  the explanation that there is no live branch to claim; when the service lands, the fixture is
  replaced by recorded responses, the service line is removed from the pages, and the vocabulary
  stays in `lib/memorials.ts` (or moves to the contract that supersedes it).
- **The client's own public search/privacy rules are an open question**
  (`docs/07-client-villa/open-questions.md` — “Public memorial search/privacy rules”). The pages
  publish the product's guaranteed privacy floor and name the open item on `/memorials/find`
  rather than assuming an answer.
- **The office's public-search checklist is unconfirmed.** `/memorials/find` lists the details a
  search needs (name, dates, park/lot, caller's number) and says the office may ask for more —
  no proof-of-relationship process is invented.
- **A malformed fixture is a loud 500/error state, never half a person.** The detail page renders
  an honest error band; the search renders the design-system error state.
