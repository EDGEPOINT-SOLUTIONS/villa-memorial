# Frontend Final Design — Port Plan (web/ → villa-memorial)

Status: in progress (Sep 2026) — Slice 1 (real content & photos) first pass done · Owner: Gabriel R. (non-dev builder) · Reviewer: dev (Keb)

## Why this exists

The dev decided that **villa-memorial is the final home of the frontend design**.
Everything premium that was built into the In-Memoriam production frontend
(`web/`, Next.js — pull request #65 on `in-memoriam`, branch
`non-dev/web-property-map`) must be **applied here**, because this repo is the
single final design reference.

Rules for this port:

1. **Palette stays the original COO blue/gold** ("Radiant Compassion" — sky blue,
   classic gold, warm paper, Playfair Display + Inter). The granite/marble/brass
   re-theme experiment (PR #62 / `non-dev/ui-ux-doc-palette`) is **not** carried
   over.
2. Port = re-implement each web/ change inside this demo's own conventions
   (React + Vite, `src/lib/store.tsx` editable catalogue, tokens in
   `src/styles/tokens.css`). Never copy Next.js plumbing.
3. No backend wiring, no contracts, no money math — demo stays frontend-only,
   honest "not wired" states included.
4. Push to `main` directly is authorized here by the dev (admin access). The
   `in-memoriam` repo keeps its strict branch + PR workflow and is **not**
   modified by this work.

## Source of the changes: PR #65 themes → where they land here

| # | What PR #65 added to web/ | Target in villa-memorial | Notes |
|---|---|---|---|
| A | Real Villa 2026 products, plans & full price list (single source `lib/villa-pricing.ts`) | `src/lib/catalog.ts` + `/admin/store` editable store | Replace demo values with the real sheets; keep the store editable |
| B | Real uploaded photos used by name; never cropped/stretched (natural-aspect) | `public/` images + every page that shows a photo | Demo images must match real Villa imagery |
| C | Premium storefront heroes: plans, plan detail, services (+death-at-home/hospital), transport, lots, map, cart, products, packages, compare, senior benefits, one-page Villa Memorial Plan & 2026 Price List | `Coo*` public pages + `/site/*` routes | Restyle in blue/gold; add one-pager if missing |
| D | Landing: "The First Ever Memorial Park in Basilan" showcase + live park map embed + store section + lot→map deep link + honest buy CTA | `CooHomePage` / `/` | Not present here yet — add in blue/gold |
| E | Multi-park interactive map: Villa Memorial, Loyola Gardens, Golden Haven; staff editor (upload/resize/lock image, plots add/move/remove/lock, size slider); plot-type Legend (unlimited types, colours + photos); type on every plot; 52 public plots; Villa rows A–D typed PRIMARY/PREMIUM/GARDEN NICHES/MAUSOLEUM | `MapView`, `PublicMapPage`, `CooLotsPage`, `CooMapPage`, staff property screens | Port the editor + legend behaviour; demo map is simpler today |
| F | Site-wide polish: nav active states, serif/sans pairing, one focus ring, hover/motion, back-pills (no dead ends), related cross-link chips; clean link crawl | shared shells + all pages | Re-verify every route is reachable |
| G | Checkout header + back-to-cart pill | `CartPage`, `CheckoutPage` | Small |

Out of scope / skipped PRs: #60 (design proposal docs), #62 (wrong palette),
#63 (backend notification service — not a frontend change), #61 (superseded —
its content already lives on this repo's `main`).

## Slice order

1. **Content first (A, B)** — real 2026 catalogue + real photos; every other
   slice renders against it. *(done: real `villa-pricing.ts` mirror, real lot
   photos + Lot-Only starting prices in `catalog.ts`/`publicCatalog.ts`, real
   media folder mirrored from the web uploads; remaining: pages still on AI
   heroes get swapped in slices 2–4)*
2. **Landing showcase (D)** — premium hero + live map embed.
3. **Public storefront heroes + one-pager (C).**
4. **Park map upgrade (E)** — legend types + staff editor + 52 plots + multi-park.
5. **Polish pass (F, G)** — nav/typography/focus/back-pills/link crawl.

Each slice: implement → run the app → screenshot/walkthrough → commit to `main`
with a plain-language message naming the slice.

## Decisions made for the non-dev

- Palette: COO blue/gold wins over the DOC granite/marble/brass experiment.
- villa-memorial is the final design; `web/` PR #65 stays untouched as the
  reference source while this port is in flight.
- All 2026 prices remain display content only (same rule as web/) — never used
  in checkout math.
