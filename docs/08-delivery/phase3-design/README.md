# Phase 3 — the catalogue now controls what the storefront sells

> **The client's ask, verbatim:** *"how the product catalog works … it should make sense not just
> for show … the admin should be the most crucial part in this, it's where we handle very customer
> that's why you should be careful here."*

---

## 1 · What was wrong

**One figure lived in two places, and the admin could only change the one nobody displayed.**

`buildCasketListing` (`lib/casket-listing.ts`) priced from the hardcoded `CASKET_MODELS` list in
`lib/villa-pricing.ts`, and `CasketCard` printed `model.srp`. But the Add-to-cart beside it sent
`item.unit_price_cents` — the **durable catalogue's** figure. The two agreed only because
`tests/fixture-contract/catalog-sources.test.ts` pins the catalogue's *seed* to the sheet, which is to
say: a fixture contract was the only thing holding the displayed price and the charged price together.

So a staff price edit in `/staff/catalog` would have moved what the cart charged and left the headline
showing the old number — **on the same card, in front of a family.** Measured before the change: 24 of
24 caskets agreed; the divergence was one edit away, not hypothetical.

**The senior price was worse: it did not exist in the catalogue at all.** All 24 casket rows carried
`unit_price_cents` and nothing else, so the senior figure — a column the client's 2026 sheet prints
beside every model — lived *only* in the hardcoded list. **It could not be edited, full stop.**

Three other surfaces read the sheet constant too: the PDP's senior line and request note, the
`/products` "from ₱X" line, and the Smart Service Builder's whole casket table.

## 2 · The change

**The catalogue is the live selling record for both figures. The sheet stays the provenance of the
seed.**

| Piece | What changed |
|---|---|
| `lib/fixtures/commerce/catalog-items.json` | all **24 casket rows gained `senior_price_cents`**, seeded from the sheet's own senior column (`git diff`: 48 insertions, 24 deletions — one line per casket, nothing else touched) |
| `lib/api-client/commerce.ts` | `CatalogItem` gains `senior_price_cents?: number \| null`, **APP-AUTHORED** exactly like `image` (the frozen envelope names `unit_price_cents` and no senior figure) |
| `lib/api-client/catalog-store.ts` | threaded through both readers and both write projections, plus `optionalSeniorPrice` — a present value must be a positive integer **below** the regular price, because a "senior price" above it is not a discount |
| `lib/catalog-admin.ts` | the draft and validator gain the field, with the same floor rule and the office's own wording; **blank means "no senior price", never 0**, which would publish as free |
| `lib/casket-listing.ts` | `priceCents` / `seniorPriceCents` now read the **catalogue row**; `seniorDiscountCents` is **derived** (`regular - senior`) so there is one number to keep honest, not two |
| `components/villa/casket-catalogue.tsx` | the card prints the listing's figures, and prints **no senior line** when there is none |
| `components/villa/product-detail.tsx` | the PDP's senior line and request note come from the variant's catalogue row |
| `app/(public)/products/page.tsx` | "from ₱X" is the cheapest casket the **catalogue** sells |
| `lib/service-builder-catalog.ts` + `builder/page.tsx` | the builder's estimate takes the catalogue, with the sheet as a **documented fallback** so an unreadable catalogue degrades rather than blanking a step of the arrangement |
| `lib/catalog-sources.ts` + its contract test | `CatalogPriceSource` gains `seniorCents`; the test pins the recorded senior figure back to the sheet for **all 24** and asserts the count is 24, so it cannot pass vacuously |
| `app/(staff)/staff/catalog/catalog-item-form.tsx` | a **Senior-citizen price** control, and the error-clearing map learned the new field (without it the refusal stayed on screen while typing) |

## 3 · Evidence

### The admin edit, through the real API, read off the real page (`scripts/design-audit/phase3-price-proof.mjs`)

```
=== 1 · the catalogue row today ===
  unit_price_cents   : 3300000      senior_price_cents : 2640000
  the storefront shows the regular 33,000 : true
  the storefront shows the senior  26,400 : true

=== 2 · edit the price as the office would ===
  PATCH /api/catalog/items/CSK-LUMINA -> HTTP 200
  unit_price_cents   : 3999900  (was 3300000)
  senior_price_cents : 3199900  (was 2640000)

=== 3 · the public /products page ===
  shows the NEW regular 39,999 : true
  shows the NEW senior  31,999 : true
  still shows the OLD regular 33,000 : false
  still shows the OLD senior  26,400 : false

=== 4 · revert ===
  the sheet's regular 33,000 is back : true

PASS — a staff price edit moves what the storefront DISPLAYS, and the cart charges the same row.
```

**One thing this proof caught, which is why it exists.** My first run asserted the new senior price
appeared and it did **not** — because I searched for `"31,999.00"` while the casket card prints
`php(amount)`, which carries no decimals (`₱31,999`). The senior line had in fact rendered correctly
all along (`Senior 61–100 · ₱26,400 · ₱6,600 off`). A unit test would not have caught my mistake; a
check against the real page did. The script now records *why* it matches that format, so the next
reader does not repeat it.

### The gate

| Check | Result |
|---|---|
| `lint` / `typecheck` | clean |
| `npm test` | **232 files, 2,689 tests pass** (was 231 / 2,681 — +1 file, +7 tests, +1 rewritten assertion) |
| `npm run build` / `smoke` | clean · **61 of 61 routes render** |
| Design audit, 208 routes × 2 viewports | **0 failed · 0 overflow · 0 sub-12px · 0 multiple/missing `h1` · 0 missing `alt`** · 18 contrast flags, all on gradient/photo surfaces |

### New tests

`tests/unit/casket-price-single-source.test.ts` (5) — every listing figure comes from the catalogue row;
**simulating a price edit moves every figure together** while the sheet constant deliberately does not;
the catalogue's seed still equals the sheet's two figures for all 24 models; no casket's senior price
is at or above its regular price; and a service records `null`, not `0`.

`tests/fixture-contract/catalog-sources.test.ts` (+2) — the senior figure is pinned to the client's
document wherever the sheet prints one (**asserted 24, non-vacuous**), and an item whose sheet has no
senior column records none.

`tests/unit/catalog-admin.test.ts` (+1, 1 updated) — the draft carries the new field, and the four
refusals: above the regular price, zero, fractional centavos, and blank-means-absent.

## 4 · What I deliberately did NOT change, and why

**`item_type` stays `add_on` for caskets.** The user's complaint that the catalogue "doesn't make sense"
is most visible here: filtering **Add-on** in the admin returns 24 coffins.

But `item_type` is a **frozen contract enum** — `order-payment-api-v1.md:42` and
`order-fulfilled-event.md:40` name exactly `package | service | add_on`, and `commerce.test.ts:107`
filters on it. Giving caskets a `product` type means changing a frozen wire value, which is a
platform/captain decision, not a drive-by in a UI phase — the repo's own rule is that a client-specific
need must never silently become core platform behaviour.

So I made it **honest instead of silent**: the catalog screen now carries one line explaining that the
three types are the contract's own words and that the casket models are its `add_on` rows. The office
no longer has to guess. **A first-class product type is an open contract ask**, and it is the one item
in this phase I would take to the platform rather than fix here.

Also unchanged: **a casket created through `/staff/catalog/new` still cannot appear on `/products`**,
because `buildCasketListing` iterates the client's 24-model sheet — the same fact as above, from the
other side. Making a *new* coffin appear means either a catalogue-driven listing (which would need the
sheet's collections and ordering to move into the catalogue too) or a product type that the sheet does
not have. Both are the same contract conversation, so I have left them together rather than half-solve
one.

## 5 · Open

1. **The `item_type` / new-casket contract ask** (§4). One conversation; two symptoms.
2. **The builder still reads `lib/villa-pricing.ts` for everything except caskets** — the a-la-carte
   fees, the embalming ladder and the chapel schedule. Those figures have no catalogue row to edit
   (`SRV-EMBALM-*` does, but the ladder is priced from the sheet constant), so the same
   display-vs-charge question applies to them and was out of scope here. Worth its own pass.
3. **`lib/villa-pricing.ts` still carries `srp`/`seniorPrice`/`seniorDiscount` per model.** They are
   the sheet's transcription and the provenance the contract test reads, so they should STAY — but
   `seniorDiscount` is now derivable from the catalogue's two figures and is only used by the sheet
   test and the builder's fallback. Removing it is a tidy-up, not a fix.
