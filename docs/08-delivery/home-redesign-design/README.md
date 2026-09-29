# Home redesign — the captain's reference page (2026-09-29)

The captain supplied a complete, self-contained reference page for `/` and asked
for the homepage to look like it. This record is the design account: what was
built, the deliberate differences from the reference and why, and the evidence.

## What changed

- **The home has its own chrome.** The reference carries its own header nav and
  footer, whose links are in-page anchors (`#now`, `#services`, `#plans`,
  `#park`, `#caskets`, `#faq`, `#talk`) that exist only on `/`. The route moved
  from `app/(public)/page.tsx` to **`app/(home)/page.tsx`** (a new route group),
  so it no longer inherits `PublicShell`'s shared header/footer/phone-bar/closing
  band. Every other public page keeps `app/(public)/layout.tsx` byte-for-byte;
  the group split is the only structural change.
- **The home has its own design language.** `styles/home.css` is the reference's
  stylesheet, translated: every selector is scoped under `.vf-home`, and the
  reference's palette keeps living as `--vf-sky` / `--vf-sky2` / `--vf-mist`
  custom properties, so no view types a colour. The file is imported from
  `app/globals.css` (like the other sheets) but cannot reach another page.
- **Two faces, self-hosted.** Young Serif (headings) and Figtree (text) are
  vendored under `public/fonts/young-serif/` and `public/fonts/figtree/` with
  their SIL OFL 1.1 licences, declared in `styles/home.css`. The reference loaded
  them from `fonts.googleapis.com`; the product self-hosts, so **no request
  leaves this origin**. The product's Inter face is untouched and stays the face
  of every other page.
- **The type cap is superseded on `/` only.** The public ladder's "nothing above
  ~40px" cap does not apply to this page: the reference's `clamp()` scale is the
  design here. `styles/home.css` is deliberately outside the sheets
  `tests/unit/typography-system.test.ts` scans, and its header records why; every
  other page keeps the ladder.
- **The whole reference composition is rebuilt:** the sticky header, the arch
  hero with the floating card, the wave dividers, the trust rule, the two doors,
  the four steps, the services, the four casket collections, the five plan
  tiers, the park + plot-dot map, the family-page promise, the FAQ details, the
  closing band and the footer.

## Real data, never literals

| Reference element | Source |
|---|---|
| Brand wordmark + mark, both phones, office/park addresses, location | the landing content document (`lib/api-client/landing.ts`) |
| Hero photograph | `content.hero.image` (falling back to the About image / `HERO_IMAGE`) through `lib/media.ts` derivatives |
| Five plan tiers + monthly figures | the editable pricing store, `planMonthlyPrice()` |
| Four casket collections, model counts, "from" SRP, the full price range | `CASKET_MODELS` in `lib/villa-pricing.ts`; photos via `casketSamplePhoto()` |
| Five services, embalming day counts, chapel classes | `ALACARTE_SERVICE_FEES` / `EMBALMING_RATES` / `CHAPEL_NOTES` |
| Plot groups and availability (`Available: 85`, `Reserved: 3`, `Sold: 3`) | the park plot store via `lib/home-park-inventory.ts` — the same seed `PublicParkMap` renders; totals are **computed** |
| FAQ questions/answers | the landing document's editable `faq` region |
| Canonical/OG/Twitter + JSON-LD | `lib/seo.ts`; the home renders its own `<JsonLd>` exactly once |

The plot inventory (verified by the render harness) is exactly the store's:
Premium lots 44 · Primary lots 12 · Garden lots 12 · Garden niches 19 ·
Mausoleum 4 → **91 plots, 85 available / 3 reserved / 3 sold**.

## Deliberate differences from the reference

1. **The brand mark is the client's real logo**, not the reference's placeholder
   arch-and-cross SVG. Brand data is staff-editable landing content.
2. **The arch holds a real client photograph**, not the SVG chapel illustration.
   The arch shape (4:5, `object-fit: cover`) is the reference's; a portrait frame
   the shared `PublicImage` roles (all landscape) cannot carry, so the arch owns
   its own `<img>` with explicit `width`/`height`.
3. **The casket cards show the client's real sample photographs**, not the SVG
   coffin drawings (the reference's own placeholders). Each card is captioned by
   the sheet's "Illustration purposes only." line, and the full ₱33,000–₱160,000
   range is printed below — the standing product rules on sample imagery are not
   relaxed.
4. **The family-page card shows the live entry-plan monthly figure** (`₱600 a
   month on Bronze 1`) instead of the reference's `₱2,000 is still to pay on the
   plan.` The product has no family balance at render time and never authors an
   amount in a view; the card keeps its shape and its promise, with a figure the
   pricing store owns.
5. **The FAQ answers are the landing document's**, not the reference's literal
   paraphrases. The reference's three questions are the document's three
   questions; keeping the document as the source is what lets the office edit
   them without a developer.
6. **The footer's route links point to real pages** (`/services/death-at-home`,
   `/services/death-at-hospital`, `/price-list`, `/faq`) and the three sign-in
   entries to the real doors (`/client/login`, `/agent/login`, `/login`), in
   place of the reference's in-page `#` anchors.
7. **A skip link is the first focusable element** (the reference has none). The
   product's accessibility bar requires it; the visible keyboard focus ring,
   `aria-live` plot detail, the reference's `prefers-reduced-motion` rule and the
   one `h1` / ordered headings all stay.
8. **Fonts are self-hosted** (difference #0 in the section above): privacy is not
   regressed for a font request.

No other public page, portal, admin route or price/product datum was touched.

## Evidence

- `before-1440.webp` / `after-1440.webp` — the homepage full-page at 1440 px.
- `before-390.webp` / `after-390.webp` — the homepage full-page at 390 px.
- `after-1440-map-tapped.webp` — the plot detail after tapping a plot
  (`Premium lots 1 is available — ask our staff to reserve it.`).
- `after-1440-faq-open.webp` — the FAQ with one answer open.

Measured on the rendered home (`tests/helpers/prose.ts`; the home is measured in
the record, never gated — its copy is the design):

- paragraph prose **414 words** across 32 paragraphs (the reasoning section above
  and the service/trust/FAQ copy account for it; the reference is the authority);
- longest paragraph **≤ 30 words**; longest list item **15 words**;
- one `h1`, no skipped heading level.

## Tests

- `tests/unit/public-page-budget.test.tsx` — the home blueprint now renders the
  rebuilt page and pins the new section order (`data-vf-section`); it no longer
  asserts the shared primitives on the home because the home carries its own
  chrome by design.
- `tests/unit/home-styles.test.ts` — now checks every `vf-*` class against
  `styles/home.css`.
- `tests/unit/seo.test.ts` — `/` joins `OUTSIDE_THE_GROUP` (like `/blog`, it
  carries its own chrome) and the JSON-LD check asserts the home renders its own
  block exactly once.
- `tests/unit/typography-system.test.ts` is **unchanged**: `styles/home.css` sits
  outside its scanned sheets by design; the supersession is recorded in the
  stylesheet's own header.
- Everything else (the view-only map guard, the public layout/image/CTA
  contracts, the standing product rules) stays green and keeps guarding.
