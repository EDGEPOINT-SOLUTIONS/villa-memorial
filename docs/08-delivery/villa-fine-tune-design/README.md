# Villa fine-tune pass — the 2026-10-02 captain's review

**Task:** `villa-fine-tune` · **Date:** 2026-10-02 · **Mode:** local-only branch `fm/villa-fine-tune`
**Base HEAD at start:** `9b85443` (family portal clarity) · **Delivered on:** `fm/villa-fine-tune` (fast-forward onto `main`)

The captain's brief was a fine-tune of the batch that had just landed, plus three
steering-inbox revisions that arrived during the pass. Every surface was checked by
eye at 1440 and 390 before a change. This record lists what was found, what was fixed,
the workflows re-run and the gates.

The pass is **local-only**: nothing was pushed and no PR was opened.

---

## 1 · The captain's revisions folded into this pass

| Inbox | Ask | Where it landed |
|---|---|---|
| `001.msg` | Home banner: the Sanctuario photograph is the band's dominant picture; the park name and the band's CTA anchor to the picture's bottom; the three-item trust ribbon is removed. Keep the rotating title sets, phone and Future plan. | `components/landing/home-banner.tsx`, the `.home-open--feature` / `.home-open__strip` block in `styles/components.css` |
| `002.msg` | Strip the opening band and the named tiles on services · plans · map · contact · blog · products · builder · facilities; remove the gallery page entirely. | the nine page files, `components/villa/service-rates-2026.tsx`, `components/blog/blog-view.tsx`, `app/(public)/gallery/` (deleted) + nav/footer/sitemap/robots/tests |
| `003.msg` | Align `/price-list` to the reference General Price List order. | **Superseded by `004.msg`** — read and kept as the convention source for the new GPL page; `/price-list` itself was left as it was (its order/labels are the captain's approved 2026 index). |
| `004.msg` | Build a dedicated `/general-price-list` page from Villa's recorded 2026 data, plus the same document as a PDF through the paper layer; link it from the price list and the footer; sitemap/robots. | `lib/general-price-list.ts`, `app/(public)/general-price-list/page.tsx`, the GET branch of `app/api/export/paper-pdf/route.ts`, footer + `/price-list` links, `lib/seo.ts` |

---

## 2 · What was found and fixed, per surface

### Home (`/`) — revision 001
**Found:** the client's park photograph rendered at roughly a third of the middle column
(the words column led); the park name sat in a small caption under it while the band's
call/Future-plan actions sat in the opposite column; a three-item trust ribbon
("Answered any hour" · "The first park in Basilan" · "Backed by Eternal Plans") occupied
the opening.
**Fixed:** the picture is now the band, full middle-column width at role `home-hero`
(16:9 — the client's own 960 × 541 file, so nothing is re-cropped or upscaled), with the
words above it. The park name and the two actions sit in an anchored strip at the
picture's bottom edge. The trust ribbon is gone. The rotating title sets (the page's one
`h1`), the gold call and the Future plan action all stay.
**Evidence:** `shots/before/root-*` → `shots/after/root-*`.

### Blog (`/blog`) — revision 002
**Found:** a visible centred title band ("News and stories from the park" + intro).
**Fixed:** the visible band is gone; the office's heading stays as the page's one `h1`,
visually hidden, and a thin right-aligned action row keeps the Products link. The posts
lead. No bare gap.
**Evidence:** `shots/before/blog-*` → `shots/after/blog-*`.

### Services (`/services`) — revision 002
**Found:** titleless gateway action row (Call / Start a quote) + a three-box orientation
strip (Quoted-not-listed · A-person-any-hour · A-plan-covers-these) + an "At-need services"
band head.
**Fixed:** all three stripped. The five service plates are the page's first section, with
a visually-hidden `h1` that still reads the page document's headline. The
"See what the plan covers →" action went with the band head; `/plans` stays reachable from
the header and the footer. Every service name, photo, request action and the embalming /
chapel bands stay.
**Evidence:** `shots/before/services-*` → `shots/after/services-*`.

### Plans (`/plans`) — revision 002
**Found:** three orientation tiles (Five tiers / Four ways to pay / Ages 1–100).
**Fixed:** the tiles are gone. The gateway's two view actions ("See the 2026 rates" /
"View packages") and the Coffins & caskets chip stay, so no link is lost; the tiers and
prices lead below them.
**Evidence:** `shots/before/plans-*` → `shots/after/plans-*`.

### Park map (`/map`) — revision 002
**Found:** a designed band head above the map ("The park map" · "Every recorded plot, on
one plan" · "Click a plot for its status, size and price").
**Fixed:** the band head is gone. The Map/Lots view switch and the "3D · enter the park"
action stay; the map itself leads.
**Evidence:** `shots/before/map-*` → `shots/after/map-*`.

### Contact (`/contact`) — revision 002
**Found:** gateway action row (Call / Send a message) + a three-fact trust row.
**Fixed:** the gateway and its facts are gone; the enquiry form is the page's first
section under a "Your message" band head (renamed from the duplicated "Send a message").
The two published lines, the addresses, the form and every Call action stay. The hidden
`h1` still reflects the page document's headline (and "Request an order" for a prefilled
storefront request).
**Evidence:** `shots/before/contact-*` → `shots/after/contact-*`.

### Products (`/products`) — revision 002
**Found:** gateway action row (See the catalogue / Call the office) + a "24 models · from
₱33,000 · sample photographs labelled" fact line.
**Fixed:** the gateway is gone; the catalogue's own head ("The 2026 catalogue" · "Every
model, with its price") leads into the refine rail and the grid. Every model, price,
filter, cart action and request link stays.
**Evidence:** `shots/before/products-*` → `shots/after/products-*`.

### Builder (`/builder`) — revision 002
**Found:** gateway action row (Call / Start with your situation) + three fact tiles
(24 casket models / Preparation, 3–9 days / An estimate, not a quotation).
**Fixed:** both gone; the workbench's "The arrangement / Build it, question by question"
head leads. The five steps, the running total, the plan panel and the request hand-over
stay.
**Evidence:** `shots/before/builder-*` → `shots/after/builder-*`.

### Facilities (`/facilities`) — revision 002
**Found:** gateway action row (Call / See the rooms) + a three-fact row (Chapels by the
day / 3–9 day stays / The grounds).
**Fixed:** both gone; the rooms band ("The rooms" · "Two rooms, for the whole wake")
leads, then the grounds atlas. Every room, capacity, photo, booking action and grounds
place stays.
**Evidence:** `shots/before/facilities-*` → `shots/after/facilities-*`.

### Gallery (`/gallery`) — revision 002
**Removed entirely:** the route (`app/(public)/gallery/`), the header "Explore more" entry,
the phone quick-menu entry, the sitemap entry, the page-document key + its content-catalog
entry + its fixture document, the `gallery-page` test, and the stale route in two
design-audit scripts. `lib/gallery.ts` stays: its `GALLERY_HERO` is the `/contact` gate
photograph. Zero `href="/gallery"` links remain on any public page (checked with curl on
`/`, `/services`, `/plans`, `/contact`, `/blog`, `/products`, `/facilities`, `/map`).
**Evidence:** `shots/before/gallery-*` (the removed page); the sitemap now carries
`/general-price-list` and no `/gallery`.

### Price list (`/price-list`) — revision 004
**Found:** the captain's dedicated-GPL revision supersedes the earlier restructure ask.
**Fixed:** the page keeps its approved 2026 index, with one new "General price list"
action added beside Print and Ask the park office.
**Evidence:** `shots/before/price-list-*` → `shots/after/price-list-*`.

### General Price List (`/general-price-list`) — new page + PDF, revision 004
**What it is:** a dedicated public page in the reference General Price List's order, an
effective date, and an itemised list. Every figure is a live read of the current pricing
store (`planRateOf`) or the client's recorded 2026 material (`lib/villa-pricing.ts`). The
page and the PDF are built from the SAME `buildGeneralPriceList` /
`buildGeneralPriceListPaper`, so they cannot drift.

**Reference → ours mapping**

| Reference GPL section | `/general-price-list` section | What it carries / why not |
|---|---|---|
| Professional services | 1 · Professional services | Embalming (3–9 days) and interment. The client's "quoted, not listed" rule is kept, so each line says **Quoted** and no service amount is invented. |
| Facilities & equipment | 2 · Facilities & equipment | Chapel use (common/private) and viewing equipment — **Quoted**. |
| Transportation | 3 · Transportation | Retrieval, delivery to the wake/chapel, transfer to the burial site — **Quoted**. |
| Merchandise: caskets | 4 · Merchandise | The 24 casket models, grouped by collection, with regular SRP and senior-citizen price. |
| Merchandise: outer containers, urns | 4 · Merchandise (note) | One honest line: not offered by Villa; the office can advise. |
| Merchandise: cremation | 4 · Merchandise (note) | Same honest line — not offered. |
| Cash advances (US) | 6 · Cash assistance | Villa's own recorded plan cash-assistance tiers (₱10,000 / ₱20,000 / ₱30,000); no US amount is copied. |
| — (Villa addition) | 5 · Plans & lots | The five plan tiers × four payment modes (regular + senior) and the four lot families (regular + senior monthly and total). |
| — (Villa addition) | 7 · Branches | The office's published branch list and the 24/7 line. |

**PDF:** `GET /api/export/paper-pdf?document=general-price-list` builds the document
server-side from the same builder and renders it through `lib/export/paper-profile.ts` +
`lib/export/pdf.ts` on the quotation sheet's own profile (`family-request`, 8.5 × 14
legal). The public GET is deliberately unsigned because the list is public data; every
other profile stays behind the staff session in POST. The page's "Download the PDF" and
"Print this list" actions are the storefront helpers.
**Evidence:** `shots/after/general-price-list-*`; the generated 4-page PDF in
`shots/pdf/page-1..4.png`.

---

## 3 · Surfaces surveyed and left unchanged (the original fine-tune brief)

The brief also asked for an admin / family / agent fine-tune. Each was checked by eye at
1440 and 390 against the admin plan board (`.lavish/villa-admin-plan/index.html`) and the
captain's "clean and not confusing" test; **no defect worth a change was found**, so none
was made (the brief's own rule: prefer a smaller set of real fixes over a broad sweep).

- **Admin** — the seven-question nav (Today first) already matches the board's revision;
  the dashboard leads with the greeting + "17 things need you today", five KPI tiles and
  the cross-record "Needs you today" table (figure, record, waiting, owner, one action).
  The calendar carries labelled day types and a click-through day panel. No duplicate or
  ambiguous nav entries, no paragraph walls. Representative unedited screens are in
  `shots/survey/staff__*`.
- **Family** — the clean-start empty states are warm and intentional: `/client/plans`
  opens "No plan is on your account yet." with a real Call action and the "Add a loved
  one" form, not a bare gap (`shots/survey/client__plans-*`). The amortization panels (`PlanAmortizationPanel` /
  `LotAmortizationPanel`) render the recorded schedule as a facts strip plus a
  period · amount · status · remaining table, with an honest "not recorded" state and the
  office phone when the record carries no schedule.
- **Agent** — the clean start reads without dead ends: the dashboard's "Nothing needs you
  today." plus the all-clear line and per-stage zero counts; the New lead form is a
  one-question-at-a-time capture with an honest save/signal note (`shots/survey/agent__*`).
  Workflows are pinned by the passing agent tests.

If the captain wants changes on any of these three after seeing the shots, they are a
fresh, small pass — nothing was silently left half-done.

---

## 4 · Tests updated in the same PR chain (fixtures move with the contract)

Removing a page and stripping bands changes what the page tests pin, so the pins were
updated in this branch rather than worked around:

- Deleted `tests/unit/gallery-page.test.tsx`; removed the gallery entries from
  `public-page-budget`, `reading-budget`, `public-nav`, `content-catalog`,
  `content-pages-store`, `content-stores-durable`, `pages-and-content-admin`,
  `admin-plan-corner-pages` and the fixture document.
- `content-catalog.test.ts` now lists six corner page documents.
- `reading-budget.test.tsx` points services/builder/facilities/contact at their new
  opening leads and accepts a form submit as the opening action.
- `public-page-budget.test.tsx`, `products-listing`, `service-builder-page`,
  `villa-services-premium`, `contact-page-redesign`, `facilities-page`,
  `home-blog-swap`, `price-surfacing`, `landing-view` updated to the stripped structure.
- New coverage for the GPL is by construction: the page renders the live store, and the
  paper builder is exercised by the export route. A future dedicated test can assert the
  reference-section order directly.

---

## 5 · Gates

Run with the dev server stopped (the build/dev `.next` trap in `AGENTS.md`):

```bash
npm run lint       # clean
npm run typecheck  # clean
npx vitest run     # 301 files · 3,251 tests · all passing
npm run build      # production build passes; /general-price-list built, /gallery gone
```

The full suite is green only with the dev server stopped: `next dev` recompiling in
parallel starves several store/timeout-sensitive suites and produced a different flaky
failure set on two runs. With the server stopped it passed clean and deterministic.

---

## 6 · Open items (not blockers)

- The GPL publishes the funeral services as **Quoted** per the client's "quoted, not
  listed" rule, so the office's recorded a-la-carte figures (in `lib/villa-pricing.ts`)
  are not printed. If the captain wants the GPL to be the one place those figures are
  public, that is a one-line change in `lib/general-price-list.ts` plus the matching
  price-surfacing test update.
- The `/price-list` restructure from `003.msg` is superseded by the dedicated GPL; the
  reference's section order was used only as the new page's convention.
