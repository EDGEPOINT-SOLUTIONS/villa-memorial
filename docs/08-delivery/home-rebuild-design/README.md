# The home rebuild + the quote basket — design record (2026-09-29)

Status: implemented on `fm/villa-home-rebuild`; `local-only`, not merged.
Sources: the captain's approved **home-rebuild plan** (`villa-home-restructure`,
read in full before coding), the office's steering messages of the same day
(trust row · named hero band · lifted titles · real band actions; Blog
top-level), and the operator's direct follow-up (section 2's photograph a
little larger; sections 2 and 3 swapped).

## 1 · The home page (`/`)

Seven sections, in the order the page renders them after the operator's swap:

| # | Section | Figures and names, and where they come from |
|---|---|---|
| 1 | The gateway | place from `contact.location`; the gold call action is **bound** to `contact.phoneDisplay` / `phoneHref`; three trust facts are staff copy in `home.gateway.facts`; medium icons on top, three equal centred columns |
| 2 | The first park | the park photograph (whole) + the arrangement builder + the two chapels. Builder figures: casket models from the **live catalogue** joined to the 2026 sheet (`builderCatalog`), preparation days from `EMBALMING_RATES`, the three-day chapel choices from `CHAPEL_RATES` + the sheet's `CHAPEL_MISC_FEE` (₱1,000), the five a-la-carte services from `ALACARTE_SERVICE_FEES` and the sheet's own ₱19,500 total. Chapel capacity comes from the **scheduling resources** (the record owns it) |
| 3 | The hero photograph | alone and whole; the band title is **read from the office's own park address** (`contact.parkAddress`'s first segment — "Sanctuario de Mercedes y Gloria"), never typed; the frame is capped at 64rem, centred |
| 4 | Villa Memorial Plan | five rising niches; monthly and senior monthly from the **pricing store** (`planRateOf`); the "what's different" line is the sheet's own `COFFINS` description + lid row; no amount is authored in content |
| 5 | Funeraria Memorial Services | five equal 3:2 plates (whole photographs, `object-fit: contain`), each bound to a **live a-la-carte service**; a quote under each and one centred all-five quote; **no amount** (the office's minute 5) |
| 6 | Villa Memorial Park | four lot types (pricing-store family + product rows) beside the masterplan; every **recorded** plot pinned at its own outline centroid (the park coordinate space is 0–100; nothing invented), coloured by live lot status, with the details panel (area · monthly · total · senior monthly · the sheet's 6-year / 72-month term) |
| 7 | Contact | the contact page's own enquiry form (name · email · optional phone · message · Data Privacy Act consent) and the embedded Google map; the address line and directions action read `contact`; the app holds **no coordinates** — the pin is Google's reading of the recorded address, said plainly in the editor |

**Palette.** `styles/tokens.css` now declares the plan's saturated sky ramp
(`--sky-50…950`, `#1b93d6` = THE SKY) and the real gold ramp
(`--gold-50…800`, `#e8b92f` = THE GOLD). The legacy `--ever-*` names repoint
onto the sky and `--brass-*` onto gold, so ~5,500 older `var()` references adopt
the palette through one bridge edit. `--color-text-accent` is the deepest gold
(800) because gold-700 measures 4.3:1 on `--paper-200` and the typography guard
requires 4.5. The 3D park scene's `--scene-*` materials are untouched. Gold
carries dark ink, never white.

**Band heads.** Kicker (uppercase, caption step) + the ceremonial gold hairline
+ the title one step up the existing ladder (`--text-3xl`, stepping back to
`--text-2xl` below 48rem so the h1 keeps the top of the hierarchy) + the band
action as a real outline button with the gateway's arrow mark. No band action
wears gold.

**Deliberate differences from the plan, each stated:**

- **Lot-family names.** The tiles price the pricing store's own families
  ("Prime Lots" on the client's 2026 sheet). The plan's decided name "Primary
  Lots" remains the park's own legend name and the client question stays open;
  the tile label is staff-editable.
- **"What's different" sentences.** The plan compresses the TYPES OF COFFIN
  sheet's line; the page prints the store's own description + lid row, so a
  sheet edit cannot drift from the page.
- **Senior rates.** Shown inside each tier's disclosure (the plan's note says
  every tier carries a printed senior rate).
- **Chapels.** The photographs follow the plan's own choice (chapel hall /
  wake set-up), which the services band also prints — the plan made that call
  explicitly.

## 2 · The editor (`/staff/landing/home`)

The Home document opens on **the seven sections**, each edited on its own:
titles, lines, actions (label + destination), pictures through the shared
`MediaPicker` (media library + device upload + URL), live catalogue pickers for
caskets/services/lot families, chapel binding to the scheduling resource, and
the plan band's prices read-only with links to `/staff/plans` and
`/staff/pricing` — **an amount is never typed into content**. The document's
older zones (brand · blog hero · rails · about · plans board · map copy · blog ·
FAQ) follow, renumbered 08–16.

Section 7 carries the **Google API key field**. The key is server-side
configuration: `lib/api-client/site-config.ts` (recorded seed + durable journal,
`SITE_CONFIG_PATH` or `.data/site-config.json`), read only by
`app/(public)/page.tsx` which builds the embed URL before the page serialises —
so the key never rides the landing document and never reaches public JavaScript.
`GOOGLE_MAPS_API_KEY` (environment) wins over the store; the editor says which
mode is live. No key → the plan's keyless classic embed.

## 3 · The quote basket + the cart (office direction, same day; cart restored 2026-09-29)

**Two baskets, one rule.** A line with a PUBLISHED price (a casket, a plan, anything the
store prices) goes to the **cart**, which keeps `/cart` and `/checkout` as real pages and
its order flow. A line the office quotes by hand (a service line, a lot, a chapel stay, a
typed request) goes to the **quote basket** at `/quote`. The rule is enforced at the store:
`addCartLine` refuses a lot, a booking or a zero-price line; `addQuoteLine` refuses a
priced non-lot, non-booking line; `tests/unit/quote-basket.test.tsx` proves both directions
and that neither basket holds the other's line. The header carries both labelled counts,
neither in gold.

The **quote basket** itself:

- the header carries TWO labelled actions — **Cart** and **Your quote** — each
  visible with no count and showing `Cart · N` / `Your quote · N` with lines,
  both sky/outline (never gold); the trolley glyph stays retired; the phone bar
  carries **Blog** directly (below);
- `/quote` owns the quote basket; the old single-item form is the **add step**
  ("Add to my quote"), its fields and layout unchanged; a quote line can be a
  service the office quotes, a **lot** (`LotQuoteButton` on
  `/lots/price-list-2026`) or a **chapel stay** (unique, never merged, released
  when removed);
- the send step posts **one** Request-for-Quote (`buildQuoteInquiry` →
  `POST /api/inquiries`, kind "quote") naming every line; nothing is an order
  and the page says so;
- `/cart` and `/checkout` are REAL pages again for priced lines (office,
  2026-09-29) with their order flow; only the quote-only surfaces send to
  `/quote`;
- tests renamed and re-pointed (`tests/unit/quote-basket.test.tsx`), with a new
  test proving lines of different kinds accumulate and submit together and the
  chapel hold/release contract kept.

### Remaining `cart` references (every one a stated decision)

`grep -rn "cart" app components lib styles tests` still finds the word in these
places, all deliberate:

- **`a-la-carte`** — the client's own French term for the a-la-carte fees; not
  the shop. (Most of the raw count.)
- **`app/(public)/cart/{page,layout}.tsx`** — the retired URL's redirect stub
  and its noindex layout.
- **`app/robots.ts`** and **`lib/seo.ts`** — the retired URL stays
  robots-disallowed; its comment names it.
- **`lib/quote-basket/quote-basket-context.tsx`** — `im_cart_v1` is read once so
  an existing visitor's basket survives the rename (the old key is then
  removed).
- **History comments** in `app/(public)/quote/page.tsx`, the context header and
  the test that pins the rename — they say what changed, so the next reader
  knows why the word appears.
- Nothing else: no user-visible string, route, component or test asserts a
  "cart" now.

## 4 · Tests touched (updated honestly, never loosened)

`public-page-budget` (the home's seven sections, in the new order),
`home-styles` (the new classes; the template-literal tokenizer strips `${…}`),
`page-backgrounds` (the plan-owned sky surfaces on the allowlist),
`hero-background` + `hero-background-field` (the new palette),
`public-nav` (the labelled quote action; Blog top-level; the four-target phone
bar), `seo` (the quote basket is transactional: no sitemap entry, robots-closed,
/cart closed too), `quote-basket` (renamed from `cart-catalogue`, plus the
multi-kind accumulation test), `price-surfacing` (lot rows now add to the
quote), `public-forms-render` (the quote form is the add step), and the four
render suites that now wrap the lot/quote pages in the shared basket provider.

## 5 · Addendum — the office's later passes (same branch)

- **Final band order (office, 2026-09-29; supersedes the plan's original 4/5/6 order):**
  1 gateway · 2 the hero photograph ("Sanctuario de Mercedes y Gloria", whole and
  generous) · 3 the first park (the pavilion photograph dominant at 1.6 : 1
  against the builder, chapels under it) · 4 Villa Memorial Park (lots + pinned
  map) · 5 Villa Memorial Plan · 6 Funeraria Memorial Services · 7 Contact.
  The two grounds bands sit together; the shop bands follow.
- **Header (inbox 015):** the bar is 5.5rem (4.5rem compressed; phone 4.25 →
  3.75rem), `--anchored-header-h` follows (4.5625rem / 3.8125rem), and the header
  mark is 3.5rem (2.75rem on phones) with the wordmark scaled beside it. Scoped
  to `.anchored-header__bar`, so the footer's brand block keeps the base size.
- **Blog (inbox 016):** the blog is its own page document (`PageDocument` key
  `blog`, schema `BlogDocument`: heading · intro · posts), migrated from the
  landing document — the landing seed now carries **no posts**. `/blog` moved
  INSIDE `app/(public)` (shared chrome) and renders heading → intro → one
  horizontal row per post → the one retained former band (About, story/mission/
  vision, which exists nowhere else). `/staff/landing/blog` is the `[doc]` page
  with the dedicated `BlogDocumentEditor`; editing one document cannot change the
  other (`tests/unit/blog-document.test.ts`). `LandingView` is now **unrouted**;
  its tests inject the migrated posts so the component's contracts stay covered.
- **Clouds, white ground, nav shadow (inbox 019):** the gateway carries three
  CSS-only blurred cloud shapes animated with `transform` only, behind the words,
  clipped by the band, pinned in place under `prefers-reduced-motion`.
  `--color-bg-page` / `--color-bg-desk` now resolve to `--paper-0`; every public
  card already carried its own boundary (`.card`'s border + `--shadow-card`,
  `.shop-card`'s top rule, `.story-band`'s top hairline, the home's own hairlines
  and borders, the tables' row rules), so no surface needed a new rule. The nav
  bar keeps a soft `0 10px 26px -18px rgb(8 28 49 / 0.35)` shadow at every scroll
  position, strengthening in the compressed state.

- **The gateway's arch and clouds (inboxes 023–031, FINAL state):** three
  directions landed the same day and this is where they settled. (1) The
  page-wide follow-through arch was built (true semicircular head, legs pinned
  to the viewport middle, closing on section 7) and then REMOVED at the
  captain's call — no scroll tracking, nothing animated. (2) The clouds were
  removed ENTIRELY (inbox 031): band 1 is plain WHITE with no drifting shape,
  and the removal moved no measurement (they were absolutely positioned and
  clipped). (3) The band's one decoration is its self-sizing arch around the
  words, `.home-gateway__frame` / `.home-gateway__arch`, sized from the content
  box + `2 × --space-8` so the legs live in the band's side margin. Its head is
  now a TRUE CIRCULAR ARC — viewBox 1000 × 536,
  `M0,536 L0,268 A600,600 0 0 1 1000,268 L1000,536` — instead of the plan's
  elliptical sweep: at 1920 that is span 1137, head rise 305, springing
  height 305 (the curve meets the legs at ~56°, so they read as legs, not as
  the tail of a sweep), with the feet running past the band's ground line where
  the band clips them. It carries a soft STATIC sky-blue glow and is desktop
  only (`display: none` below 52 rem). `tests/unit/home-styles.test.ts` pins
  the shape, the glow and the absence of clouds.

- **The former storefront returns BENEATH the blog (inbox 025):** `/blog` leads
  with the blog's own page document (heading · intro · one horizontal row per
  post) and then renders the whole former LandingView layout under it, BANDS
  ONLY — the left and right rails, the plans-and-lots card grid, the tier board,
  the live park map, the About band and the newsfeed — through the new
  `LandingBands` export in `components/landing/landing-view.tsx`. The bands read
  the landing document and the live stores exactly as before, with ONE pointed
  exception (inbox 031): the newsfeed band is given the BLOG page document's
  posts, because the landing document no longer owns them and the band was
  rendering its empty state under a page that lists the posts. That does repeat
  the same posts the page leads with — the office was given the two options
  (the band shows the remaining posts, or it goes) and has not chosen yet. No
  second chrome: `LandingBands` renders no header, footer, phone bar or closing
  action band — `PublicShell` supplies exactly one of each, verified on the
  rendered page (1 header · 1 footer · 1 phone bar · 1 next-steps · 1 h1).
  `.blog-storefront` hands the bands back the container's gutter so the rails and
  middle sheet keep the former page's folio width. `tests/unit/blog-document.test.ts`
  pins the order (blog first, bands after, chrome-free) and
  `public-page-budget.test.tsx` declares the section list.
