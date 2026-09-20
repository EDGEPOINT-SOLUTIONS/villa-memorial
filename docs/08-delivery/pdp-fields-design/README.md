# Product detail page — editable description, gallery and specs (P1)

Phase P1 of the captain-confirmed editable-PDP plan
(`data/villa-pdp-cms-plan/report.md`, sections 4–7, 8.2 and 10; six decisions in
§9). P0 (the pure `RichTextDoc` / `ContentSpecs` / `ProductLine` model) shipped in
PR #103; this phase puts it to work on `/products/[sku]` and the catalogue entry
editor. **No URL changes**; the variant selector arrives in P2.

## What changed

| Layer | Before | After |
|---|---|---|
| Entry model | `CatalogueEntry` identity + `summary`/`media`/`blocks` | + `description` (typed rich-text tree), `gallery` (uncapped, ordered), `specs` (≤15 columns, unlimited rows) |
| Entry store | in-process `globalThis` (a restart lost an uploaded gallery) | durable append-only journal, `CONTENT_ENTRIES_STORE_PATH` or `.data/content-entries.json` |
| Admin editor | Identity · Hero photograph · Content blocks | + **Description** (zero-dep rich-text toolbar) · **Photographs** (library/device/URL, drag reorder, remove) · **Specifications** (spreadsheet, paged + `content-visibility`) |
| Public PDP | one rule-derived sample figure, plain-text lead, no specs | main viewer + **thumbnail rail**, the rich description as semantic HTML, the formatted specs table; same per-SKU URLs and the same honesty states |

## The source (this pass)

- `lib/content-catalog.ts` (P0 model) — `RichTextDoc`, `ContentSpecs`,
  `validateRichText`, `validateContentSpecs`, the entry fields and the glyph/
  payload guards. **No replacement**; this pass only consumes it.
- `lib/richtext.ts` — the pure serializer used by the editor host (and paper/
  export readers). Escapes every character; only the safe link schemes survive.
- `components/content/rich-text.tsx` — the **public** renderer: React elements from
  the nodes (h2/h3, p, ul/ol, strong/em/a), never `dangerouslySetInnerHTML`.
- `components/content/rich-text-editor.tsx` — the zero-dependency toolbar
  (B · I · H2 · H3 · ¶ · • · 1. · link) over a `contenteditable`, with
  `parseEditorHtml` keeping only the product's tags.
- `components/content/gallery-editor.tsx` — ordered gallery, drag + arrow
  reorder, remove, and the rule-derived photo offered (not forced) when empty.
- `components/content/specs-editor.tsx` — editable headers (≤15), add/remove
  rows, paging, `content-visibility: auto`.
- `components/content/specs-table.tsx` — the public formatted table (first column
  is the row header).
- `components/villa/pdp-gallery.tsx` — the client viewer + rail; the lead
  photograph is eager and every non-lead photograph is lazy; samples keep the
  chip and the sheet's substitution note.
- `lib/api-client/content-entries.ts` — now a durable store (seed + journal,
  atomic write, one in-process writer), covering both service and item entries.
- `app/(public)/products/[sku]/page.tsx` — renders the three new surfaces; a
  gallery-less item keeps the rule-derived `CasketSampleFigure` (never a hole).

## Evidence

Measured on the demo build at `1440×900` (`NEXT_PUBLIC_DEMO_PASSWORD` dev server,
`/products/CSK-WHITE-ROSE-FULL` with an authored entry):

- **Before** (P0 base): one `.casket-sample` figure, no rail / description / specs.
- **After**: the viewer renders the authored gallery (3 thumbnails in the rail, the
  lead eager, the rest `loading="lazy"`), the description renders `h2` + `<strong>` +
  `<em>` + a real `<ul>`, and the specs table renders 5 labelled rows. `scrollWidth
  === clientWidth === 390` at the phone width — no horizontal overflow.
- The editor page renders all three new sections; the loaded entry's description is
  parsed back into the `contenteditable`, the gallery lists its 3 photographs with
  reorder/remove controls, and the specs grid shows its 2 headers and 5 rows.

Shots in `shots/`:

- `before-pdp-1440.png` · `before-pdp-390.png` — the P0 page (from the scout board).
- `after-pdp-1440.png` · `after-pdp-390.png` — the viewport after the pass.
- `after-pdp-1440-full.png` · `after-pdp-390-full.png` — the full page (rail,
  description, specs and the rest).
- `after-editor-1440.png` — the three new editor sections.

## Tests

- `tests/unit/pdp-gallery.test.tsx` (new) — viewer/rail, eager-vs-lazy, sample chip,
  single-photo (no rail), the page's gallery fallback, and `richTextToHtml`
  escaping/safe links.
- `tests/unit/catalogue-entry-page.test.tsx` — the rich description, gallery and
  specs reach the public page; the editor shows the three sections.
- `tests/unit/catalogue-entries-store.test.ts` — the new fields round-trip, a 16th
  column and an uncaptioned sample are refused, and a save persists to the journal.
- `tests/unit/content-entries-store.test.ts` — the service entry journal persists;
  tests now point `CONTENT_ENTRIES_STORE_PATH` at their own temp file.

`npm run lint && npm run typecheck && npm test && npm run build` all green
(2261 unit + fixture-contract tests).

## Open asks (unchanged)

- The item-entry write API is APP-AUTHORED (`POST /api/content/entries`, scope
  `catalog:write` provisionally); no CMS service or content contract exists.
- Upload storage stays the `MediaPicker` data-URL / public-URL seam for P1. The
  server-side upload route to `MEDIA_UPLOAD_DIR` and the C12 object-store seam are
  P4 of the plan.
