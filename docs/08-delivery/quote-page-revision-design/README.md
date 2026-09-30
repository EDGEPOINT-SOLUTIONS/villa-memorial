# The `/quote` page — revisioning (captain, 2026-09-30)

**Brief (the captain's words):** *"the quote page needs revisioning, it should be flexible to the
add quote system, right now it's chaotic we don't know what's happening."*

The study is `data/villa-quote-page-plan/report.md` (task `villa-quote-page-plan`); the captain
answered all six board questions, and this record is the implementation. The plan's §4–§7 and the
six answers are the contract; where they differed, the answers win.

## The six answers, as built

| # | Captain's answer | What shipped |
|---|---|---|
| **D1 = B** | "the order will go in the order page in the admin panel and for the inquiry or quote, it will go in the inquiry page." | The two channels stay separate. The priced **cart** (`/cart` · `/checkout` → `POST /api/orders`) keeps its route to the admin **Order** page unchanged; the quote basket's inquiry goes to the admin **Inquiries** page. `/quote`'s copy and empty state stop promising caskets and plans it does not hold. |
| **D2 = A** | remove the add form from `/quote` | The page is **review + send**. The inline add form is deleted (`components/public-forms/quote-form.tsx`), and a small "Ask the office about it" link opens a light request dialog (`components/public-forms/quote-add-request.tsx`) that collects only what a line needs. Contact details and consent are asked **once**, at send. |
| **D3 = A** | a quote-only line never shows a figure; fix the refresh bug | A persisted, explicit `pricing` mode. The catalogue-refresh effect now updates a line's display **name only** — it can never re-price an `on_request` line. Retrieval and chapel use no longer acquire the sheet's ₱2,500 / ₱1,500. Quote-only lines print "To be quoted by the office". |
| **D4 = A** | split headline, no blended total | The summary band reads "N items — P with a published 2026 figure · Q the office will quote by hand", with "Published 2026 figures: ₱X (P items — the office confirms)" and "To be quoted by the office: Q lines". It never prints one blended number. |
| **D5 = A** | chapel lines carry the real held dates | The chapel booking step is re-linked on `/services` and `/facilities` (`ChapelBookingButton`), so the dialog picks the chapel, dates and 3–9 day stay, checks the park's schedule and **holds** the range; the line carries `booking` and prints the held range. The line is `on_request` (chapel is quoted by hand). |
| **D6 = A** | structured line items to the office | The quote inquiry carries a structured `lines` array; the board renders one row per line, its SKU, the published figure where it has one, and a **"Needs pricing"** flag. The topic is concise ("Quote request — 3 items") and the message carries only the family's own note. |

## The flexible line model (the captain's word: flexible)

`lib/quote-basket/quote-line.ts` is the one home. Each line carries:

```ts
type QuoteLinePricing =
  | { mode: "published"; unitPriceCents: number; currency: string }
  | { mode: "on_request" };

type QuoteLine = {
  sku: string;
  name: string;
  kind: string;                    // OPEN vocabulary
  descriptor: { label; unit?; detailSchema?; actions };  // supplied by the adding surface
  pricing: QuoteLinePricing;       // authoritative; never inferred on the page
  quantity: number;
  lineId?: string;
  booking?: ChapelBookingLine;
  detail?: string;
  preferredDate?: string;
};
```

`quoteLineDescriptor(kind, overrides)` supplies sensible defaults for the known kinds and a
humanised label for anything new, so a **new kind joins `/quote` with no page change**:
`QuoteLineRow` reads `descriptor` + `pricing` and never switches on `kind`. A regression test
renders an unseen `keepsake` kind from its descriptor alone.

## The honest-pricing rule

- **published** (a lot, from the store's own row): the 2026 figure prints, with "the office
  confirms"; it contributes to the published part of the summary band and gets a line total.
- **on_request** (a-la-carte service, embalming, chapel, free-text request): prints "To be quoted
  by the office", contributes **no** figure and gets **no** line total (in the row or the details
  recap).

The add-time decision belongs to the surface that knows the item: `ItemQuoteButton` adds
`on_request`; `LotQuoteButton` adds the store's `published` row; the chapel booking step adds
`on_request` + `booking`. The `addQuoteLine` rule still mirrors the cart's: a **published** line
that is neither a lot nor a booking is a cart line and the quote basket ignores it (D1-B).

## States

- **Empty** — the empty state leads, with browse doors to `/services`, `/products`, `/plans`,
  `/lots` and one "Ask the office about it" link. No send step.
- **One line** — the summary band reads its 1-item split; an `on_request` line prints only the
  office-quote label.
- **Mixed** — the band separates the published figure from the hand-quoted lines.
- **Very long** — the band is sticky on desktop with a "Send this quote request" shortcut; the list
  is a `<ul>` of cards (no pan frame), so it simply scrolls.
- **Phones** — the cards stack at 390 with every fact and its Remove visible, and the shared header
  brand no longer collides with the two basket buttons (a CSS fix: a `justify-self: start` grid item
  sizes to max-content, so `min-width: 0` alone did not shrink the wordmark; `max-width: 100%` +
  `overflow: hidden` at ≤39.999rem fixed it for every public page).

## The office's side (D6-A)

The payload the office receives, printed as data (a mixed 3-line basket):

```json
{
  "topic": "Quote request — 3 items",
  "message": "Please call after 6pm.",
  "source": "website",
  "lines": [
    { "sku": "LOT-MAUSOLEUM", "kind": "lot", "pricingMode": "published",
      "unitPriceCents": 107300000, "currency": "PHP", "quantity": 1,
      "detail": "24 sqm · 1. Lot Only · lot only" },
    { "sku": "SRV-RETRIEVAL", "kind": "service", "pricingMode": "on_request",
      "unitPriceCents": null, "currency": null, "quantity": 1,
      "detail": "Same week as the burial" },
    { "sku": "CHP-COMMON-DAY", "kind": "chapel", "pricingMode": "on_request",
      "unitPriceCents": null, "currency": null, "quantity": 3,
      "dateRange": "Sep 20 – 22, 2026 · 3 days" }
  ]
}
```

`lib/api-client/crm.ts` carries the provisional `Inquiry.lines` field with a flagged comment and
the contract ask is recorded in `docs/08-delivery/open-items.md` §8 — this shape is **not** frozen,
and the polite reader tolerates its absence on every older or non-basket inquiry.

## Files

| Kind | Path |
|---|---|
| Model (pure) | `lib/quote-basket/quote-line.ts` |
| Basket | `lib/quote-basket/quote-basket-context.tsx` (descriptor/pricing; refresh updates the name only) |
| Inquiry | `lib/quote-basket/quote-submit.ts` · `lib/inquiry-intake.ts` · `lib/api-client/inquiry-store.ts` |
| Page | `components/public-forms/quote-basket-page.tsx` · `components/public-forms/quote-add-request.tsx` |
| Line | `components/quote-line-row.tsx` |
| Office | `app/(staff)/staff/inquiries/inquiry-board.tsx` |
| Add controls | `components/villa/item-quote-button.tsx` · `components/villa/lot-quote-button.tsx` · `components/chapel-booking-dialog.tsx` |
| Chapel re-link | `components/villa/service-rates-2026.tsx` · `app/(public)/facilities/page.tsx` |

## Tests

| File | Pins |
|---|---|
| `tests/unit/quote-page-states.test.tsx` | empty / one-line / mixed / very-long page states; split headline; no blended total; card list not a table |
| `tests/unit/quote-basket.test.tsx` | the descriptor render; `on_request` prints no figure and no line total; a new kind renders; the add rule; the structured submission |
| `tests/unit/inquiry-store.test.ts` + `tests/unit/inquiries-route.test.ts` | the structured `lines` survive the route and the journal |
| `tests/unit/inquiry-board-lines.test.tsx` | the board's one-row-per-line + "Needs pricing" flag |
| `tests/unit/public-forms.test.ts` | `quoteInquiryInput` build the concise topic, the note-only message and the lines |
| `tests/unit/public-forms-render.test.tsx` | `/quote` is review + send; the request dialog opens prefilled and never asks for consent |
| `tests/unit/price-surfacing.test.tsx` · `tests/unit/villa-services-premium.test.tsx` · `tests/unit/facilities-page.test.tsx` | the chapel cards carry the booking step again, still publish no figure |

## Verification

- `npm run lint` · `npm run typecheck` · `npm test` (244 files, 2,762 tests) · `npm run build` ·
  `npm run smoke` (all 59 advertised routes render) — all green.
- Before/after screenshots at 1440×900 and 390×844 for the empty, single-line and mixed baskets
  were captured against a production build; the plan board's `board/assets/*-1440.png` /
  `mixed-390.png` are the "before" set. Per the docs refresh rule, shots are **not** committed.

## Deliberately out of scope

- The priced cart/checkout flow, the catalogue, the pricing store and SKU map — untouched (D1-B).
- The `/contact` request-order path and the builder — unchanged.
- Facilities' room names/capacity remain the client's open question, said on the page.
