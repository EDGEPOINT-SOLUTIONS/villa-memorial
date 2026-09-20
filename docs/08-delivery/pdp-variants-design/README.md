# Product detail page — the variant selector (P2)

Phase P2 of the captain-confirmed editable-PDP plan
(`data/villa-pdp-cms-plan/report.md`, sections 5–7, 8.2 and 10; the six decisions in
§9). P0 (the pure `RichTextDoc` / `ContentSpecs` / `ProductLine` model, PR #103)
and P1 (entry description, gallery, specs and their public render, PR #104) are
merged; this phase adds the line document and the selector that swaps between
its variants.

## The confirmed model (captain, 2026-09-21)

- **Q4 — line = the sheet's collection (four lines); variant = each model.**
  `lib/product-line.ts` derives the four lines from `CASKET_MODELS`, so a
  re-transcription cannot leave them stale and no line is hand-listed.
- **Q1 — per-variant specs with line-level shared defaults.**
  `resolveSpecs(line, variant)` unions the columns (≤15, refusing over the cap
  by name) and merges rows by first cell; a variant authors only its deltas.
- **Q6 — keep per-SKU URLs and sync on selection.** `history.replaceState` moves
  the URL to the chosen model's own `/products/<sku>`; the server head keeps the
  per-SKU canonical, so no duplicate-content risk is introduced.
- **Q2 — reuse `catalog:write`.** No new scope; `staff-scope-vocabulary` stays green.

## What changed

| Layer | Before | After |
|---|---|---|
| Line document | derived in memory only (`lib/product-line.ts`) | **durable `ProductLine` store** (`lib/api-client/product-lines.ts`) over the four derived lines: name, ordered variant membership, shared specs |
| BFF | — | `GET/POST /api/content/product-lines` (`catalog:write`, rules-free; `validateProductLine` is the authority) |
| Admin | item content editor (description/gallery/specs) | **Product line / variants** panel on a casket's item content screen: line name, variant order/membership with a link to each model's own editor, shared specs |
| Public PDP | one SKU page with static sibling links | **client `components/villa/product-detail.tsx`**: a labelled radiogroup of the line's models; choosing one swaps the gallery, price, specs, description and rule-derived facts in one commit |
| Specs | per-entry only | rendered from `resolveSpecs(line, variant)`, so a line's shared row prints for every model |

## The source (this pass)

- `lib/api-client/product-lines.ts` — the durable store (seed + atomic journal,
  one in-process writer, `PRODUCT_LINES_STORE_PATH` or
  `.data/content-product-lines.json`, gitignored); `listProductLines` /
  `getProductLine` / `getProductLineForSku` / `saveProductLine`.
- `app/api/content/product-lines/route.ts` — the write seam beside
  `/api/content/entries`; the handler holds no rules.
- `components/content/product-line-editor.tsx` — the admin panel (live
  `validateProductLine`, Save disabled on an error, identity left to each item).
- `components/villa/product-detail.tsx` — the selector + the per-variant
  sections. The page resolves the line and every sibling entry **server-side in
  one pass** and hands them to it as plain data, so a swap is local state with no
  round-trip.
- `app/(public)/products/[sku]/page.tsx` — builds the `PdpVariant[]` (each model's
  own entry, its `resolveSpecs` table and its rule-derived thumbnail) and passes
  the static sections (advisor card, the five-tier strip) as slots.
- `styles/components.css` — the `.pdp-variants` / `.pdp-variant` block, tokens
  only; the selected state is a border/ink change, never a second accent fill.

## Imagery fallback (the report's §5)

A variant with no authored gallery prints, in order:

1. its **own** authored gallery (`entry.gallery`) — the selector swaps to it;
2. otherwise the rule-derived sample photograph (`CasketSampleFigure`) with its
   “Sample photograph” chip and the sheet's substitution note;
3. otherwise (a manual line with no model) an honest text placeholder —
   *“Photographs for this model are being prepared …”* — never another variant's
   photograph silently.

A line-level **shared gallery** is *not* part of the confirmed P0 `ProductLine`
type (it carries `sharedSpecs` only), so rung 1 of the report's list does not
exist in this model; the fallbacks that ship are 2 and 3.

## Money & honesty

- The buy card reads the **selected variant's live catalogue `display_price`** and
  its model's sheet senior figures; nothing is authored, and the Add-to-cart is
  keyed by SKU so the cart/prefill can never carry the previous model.
- The seven held client photographs (`HELD_CLIENT_PHOTOS`) are never offered;
  every sample keeps its chip and the sheet's note; `catalogue-imagery` remains
  the one photograph rule home.
- No new dependency and no amount is typed into a view.

## Evidence

Dev server on a spare port (`4199`), fixture mode, measured with
`chrome-devtools-axi`. Selecting a variant updates `location.pathname`, the `h1`,
the checked radio and the price together:

```
r.length = 6
click[0] → url "/products/CSK-WHITE-ROSE-HALF"
           h1  "White Rose Half casket", checked ["White Rose Half casket"],
           price "₱62,000.00"
```

At 390 the page has no horizontal overflow (`scrollWidth === clientWidth === 390`).
Saving the line from the admin panel through `POST /api/content/product-lines`
returns the store's success line.

Shots in `shots/`:

- `before-pdp-1440.png` · `before-pdp-390.png` — the P1 PDP (no selector), reused
  from `pdp-fields-design`.
- `after-selector-1440.png` · `after-selector-390.png` — the selector with the
  URL's model checked, its thumbnails, live region and price.
- `after-swapped-1440.png` · `after-swapped-390.png` — the same page after
  choosing a sibling: gallery, `h1`, `aria-checked` and price all moved.
- `after-admin-line-1440.png` — the Product line / variants panel (name, ordered
  variants with per-model editor links, shared specifications).

## Tests

- `tests/unit/product-line.test.ts` — extended with the store: the four derived
  lines, id/SKU resolution, a saved name + shared specs reaching the next read, a
  stored membership excluding a variant, and the save refusals.
- `tests/unit/pdp-variants.test.tsx` (new) — the labelled radiogroup and per-radio
  `aria-checked` + `aria-live`; a second SKU URL selecting a different model; the
  swap of gallery/specs and the live price; per-variant specs merged with the
  line's shared defaults; the rule-derived sample fallback; the honest text
  placeholder; and the admin panel rendering (and its 403).

`npm run lint && npm run typecheck && npm test && npm run build` all green
(201 test files, 2279 tests).

## Not in this pass (P3+)

The sticky gallery, the zoom dialog, the phone stack polish and the PDP's
reading-budget entry are P3. The upload route + object-store seam is P4. This PR
keeps the SKU and `CatalogueActions` contracts unchanged and touches only the
variant behaviour.
