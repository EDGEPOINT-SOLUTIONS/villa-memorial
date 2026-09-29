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

- **The gateway band (inboxes 023–032, FINAL state):** the decorations came
  and went the same day; this is where the band settled. The page-wide
  follow-through arch was built (true semicircular head, legs pinned to the
  viewport middle, closing on section 7), then the band's self-sizing arch was
  restored static with a circular-arc head, and finally (inbox 032) the ARCH
  WAS REMOVED ENTIRELY along with every cloud: the home has no arch and no
  drifting shape anywhere, and band 1 is plain WHITE (removing the absolutely
  positioned decorations moved no measurement). The band is now a FUNNEL BY
  SIZE, NOT WEIGHT, in this order: eyebrow `--text-micro` (12px) → the band's
  LARGEST line, the headline at `--text-hero` (the one fluid display size,
  clamp 35.2 → 57.6px) in **weight 500** instead of 700 → the lead at
  `--text-lg` (16px) → the two actions → the icon row, whose facts keep their
  medium icon and short label ONLY (the three detail lines were removed; the
  labels still read from the store). The headline's sky second sentence keeps
  its colour emphasis with no extra weight. `tests/unit/home-styles.test.ts`
  pins the funnel sizes, the light headline, the labels-only icon row and the
  absence of every arch/cloud token.

- **The former storefront returns BENEATH the blog (inbox 025; resolved by
  048):** `/blog` leads with the blog's own page document (heading · intro · one
  horizontal row per post) and then renders the whole former LandingView layout
  under it, BANDS ONLY — the left and right rails, the plans-and-lots card grid,
  the tier board, the live park map and the About band — through the
  `LandingBands` export in `components/landing/landing-view.tsx`. The newsfeed
  band, which for a time repeated the posts the page already leads with, was
  REMOVED at the office's direction (inbox 048 — the options put to them were
  "remaining posts or the band goes"; they chose the band goes); the blog's lead
  listing is the page's only post list. The bands read the landing document and
  the live stores as before, and the two documents stay independent. No
  second chrome: `LandingBands` renders no header, footer, phone bar or closing
  action band — `PublicShell` supplies exactly one of each, verified on the
  rendered page (1 header · 1 footer · 1 phone bar · 1 next-steps · 1 h1).
  Editor ownership (inbox 048): the HOME editor shows only the home's seven own
  sections plus the shared brand/24-7 chrome; the BLOG editor owns the posts lead
  and the storefront bands (Hero · rails · About · plans-and-lots · plan board ·
  park map copy); the FAQ has its own editor at `/staff/landing/faq`.
  `.blog-storefront` hands the bands back the container's gutter so the rails and
  middle sheet keep the former page's folio width. `tests/unit/blog-document.test.ts`
  pins the order (blog first, bands after, chrome-free) and
  `public-page-budget.test.tsx` declares the section list.

- **The entrance overlay (office, inboxes 050/051/052/057/058):** the home's opening
  piece is a real app feature, built to the office's own reference
  (`Villa Funeraria – Cloud Sign.html`, kept in the firstmate home; NOT added
  to the repo). The cloud's geometry is copied exactly: the five circles and the
  rounded base in a 400×200 viewBox, the `#7cbcec → #2f6cab` sky gradient, the
  blurred white highlight and the `#0a2a55` underside clipped by `clipPath
  id="shape"`, and the two drop shadows (`0 36px 32px rgba(15,45,90,.3)`,
  `0 6px 8px rgba(15,45,90,.22)`). The cords are 2px, `linear-gradient(#f3e2b4,
  #b8975a)`, held `padding: 0 28%`, full length at rest (`380px + 30vh`) with
  the whole hang dropping over it on one expo-out transform; the beads sit at
  28%/72% across and 32.4% down at
  13px with the reference's gold radial. The words carry the reference's
  vertical gold gradient (`#fff3c4 → #ebca77 → #cfa24d`) clipped to the text
  with the soft dark shadow, scaled with the cloud (0.05 and 0.0633 of its
  width, clamped to ladder steps — the one artwork-scale exception the
  typography gate names). The motion is the reference's: the expo-out drop, the
  hang swaying about its TOP anchor, the words surfacing, then the exit dimming
  the words while the cords recoil and snap away, thin to `scaleX(.6)` and the
  cloud squeezes to `scale(.985,1.035)`. **The motion was rebuilt
  compositor-only (office, inbox 057) after the office read the first build as
  not smooth**: the cords used to animate `height` (a layout property) while the
  SVG's Gaussian blurs and the cloud's two drop-shadows re-rasterised every
  frame. Now the cords sit at their full length at rest and the WHOLE hang drops
  as one `translateY` gesture (`home-intro-drop`, 1.6s expo-out) whose keyframe
  track carries the decaying sway as follow-through that settles — one curve, no
  second animation racing it; the exit recoils on `scaleY(1 → 1.06 → 0)` with the
  cloud lifting on `translateY` (`home-intro-lift`) to meet the anchor. Every
  `@keyframes` block in the intro animates only `transform`/`opacity` (grep of
  the block: `['animation-timing-function', 'opacity', 'transform']`), the
  filters are set once and never animated, `will-change: transform, opacity` is
  carried only while the intro runs and dropped on the final fade, and
  `tests/unit/home-intro.test.tsx` walks every keyframe and fails a
  layout-triggering property by name. Measured in headless Chromium at
  1440×900 sampling `requestAnimationFrame` deltas across the intro: before the
  rebuild p95 33–100ms with 8–22 frames >33ms (worst ~250–1033ms); after, p95
  16.8ms with 1–2 frames >33ms (worst 133–267ms, the remaining frame being
  hydration, not the animation). Deliberate differences from the standalone
  demo, per the guards: the exit begins at 1.7s (not the demo's 3.8s) and any
  click/keypress finishes it in ~220ms; the words ride the app's self-hosted display face (no
  Google-Fonts Cormorant link — that face is OFL and can be self-hosted like
  Manrope if the office asks); no replay button; the two lines live in
  `home.intro` and are edited in the home editor's zone 00; reduced motion shows
  the greeting WITHOUT motion for 1.5s (the reference only disables part of its
  motion); the page behind is inert while it is up with focus returning to
  `#main`, and no layout/scroll/focus trace is left. Total visible ~2.6s.

  **The sign is the FIRST PAINT of `/` (office, inbox 058).** The first build
  gated on the client: the home painted, then a `location.replace` hop to
  `/entrance` — whose client piece returned `null` until hydration — so the
  office saw the homepage, then a ~2.5s blank wait, before a sign that looked
  un-animated. Now `app/(public)/page.tsx` reads the `villa_home_intro_seen`
  cookie BEFORE render and puts the overlay FIRST in the document for an unseen
  visitor: the server HTML itself carries the sign, the CSS drop runs from the
  first frame (hydration only arms the timers), and the home is rendered
  underneath — when the sequence ends the overlay simply unmounts, with nothing
  to navigate. A returning visitor's request carries the cookie and gets the
  home alone. Measured in a fresh Chromium profile: the overlay is in the DOM
  and the drop animation is running at the first sample (~150ms: `translateY`
  −650, `home-intro-drop:0:running`), the URL never leaves `/`, the session
  cookie is written when the sequence ends, and a reload serves the home
  directly. The two keys live in the plain module `lib/home-intro.ts` — a
  constant exported from the `"use client"` component reaches the server as a
  client-reference proxy, so `cookieStore.get(INTRO_COOKIE)` read `undefined`
  and the gate never closed (found and pinned by test). Two fallbacks:
  `@media (prefers-reduced-motion: reduce)` refuses the motion before hydration
  (verified with CDP emulation: no animation frame at all, greeting still,
  gone ~1.5s after hydration), and a CSS self-dismiss keyframe slides the
  overlay off-screen on `transform` alone if the client never hydrates
  (verified with scripts disabled: after 4s the overlay sits at `translateY`
  −909px and the home's own link is what a hit test finds). `/entrance` stays
  as the blank `noindex` standalone route, handing off to `/` as before.
