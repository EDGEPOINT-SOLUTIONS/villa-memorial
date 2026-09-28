# Funeral services — Request for Quote (captain's minutes, 2026-09-21, item 5)

**Brief:** *"Remove the displayed prices for funeral services. Replace the price information
with a 'Request for Quote' option."* The purpose is to let Villa Funeraria provide customised
quotations; the inquiry must capture the client's name, contact details, the requested funeral
service, a preferred date (when one applies) and additional requirements.

> **Update 2026-09-28 — superseded in part.** The capture mechanism described in the `/quote`
> row below and in the "Captured inquiry fields" measured row (browser-local
> `lib/demo-inquiry-captures.ts` → localStorage) was replaced when `/quote` and `/contact` moved
> onto `POST /api/inquiries` and the durable `lib/api-client/inquiry-store.ts` journal;
> `lib/demo-inquiry-captures.ts` is deleted. See `docs/08-delivery/phase1-design/README.md`.
> The no-price / one-quote-action rule this record documents is unchanged and stays
> authoritative.

**Surfaces changed**

| Surface | Before | After |
|---|---|---|
| `/services` (`components/villa/service-rates-2026.tsx` + `components/villa/embalming-day-picker.tsx`) | five a-la-carte fees, the embalming 3–9 day ladder (+ per-day beyond 9) and the two chapel cards each printed a 2026 amount, plus Add-to-cart / Request-order / the chapel booking step | no amount and no cart action anywhere; every service line carries ONE `Request a quote` action to `/quote` with the service prefilled |
| `/facilities` (`app/(public)/facilities/page.tsx`) | each room printed the sheet's per-day rate, and the misc-fee / groceries notes printed their figures | rooms keep their photographs, class and what each suits; each carries a `Request a quote` action (and the 24/7 call); no `₱` figure |
| `/services` guides (`components/villa/service-guide-page.tsx`) | already `quoteOnly`, but a staff-authored price block could resolve a catalogue amount | `priceOf` returns null, so a service guide can never become a price list |
| `/quote` (`app/(public)/quote/page.tsx` + `components/public-forms/quote-form.tsx`) | five fields (name · email · phone · interest · notes); a passed submission was confirmed as *not sent* and stored nothing | records the client's name and contact details, the requested service, a preferred date (optional) and additional requirements, then writes the enquiry into the demo inquiry store the staff board reads (`lib/demo-inquiry-captures.ts` → `quoteInquiryInput`); the confirmation says plainly that nothing was sent to a server |

**One request seam, no new grammar.** The RFQ links reuse the storefront's existing request
prefill (`lib/public-forms/request-prefill.ts`): `buildQuoteHref()` wraps `buildRequestHref()`
with `QUOTE_PATH = "/quote"` and carries **no** `price` param. `/quote` parses the same
`item` / `note` params and prefills the service. Nothing is fabricated: the quotation service
and crm-families remain unbuilt, so the capture is demo-local and honest.

**Measured / asserted (no screenshots)**

| Check | Value |
|---|---|
| Peso figures in `/services` markup | `0` (`expect(html).not.toMatch(/₱/)`) |
| Peso figures in `/facilities` markup | `0` |
| Distinct catalogue SKUs a quote link carries on `/services` | 15 (5 a-la-carte + 7 embalming day counts + 1 beyond-nine + 2 chapel classes) |
| `Request a quote` links on `/services` | one per line/row/card, plus the day-picker's selected stay, the whole-set action and the hero |
| Quote links carrying a `price` param | `0` |
| Add-to-cart / Request-order controls on `/services` | `0` |
| Largest type on the changed surfaces | 22 px (`--text-xl`: service/room names, embalming day labels); the shared section-head h2 stays `--text-section-title` (28 px) as on every public page; every quote action is `.btn--accent .btn--sm` (14 px) — no display-sized price remains (the retired `.sv-picker__amount` was 36 px) |
| Captured inquiry fields | `full_name`, `email`, `phone`, `topic` = requested service, `message` carries service + preferred date + additional requirements, `source` = `website` |

**Compliance with the captain's follow-up (no oversized type).** The 36 px `.sv-picker__amount`
price rule was retired with the price itself; no figure at 28 px or above remains on a
funeral-service surface (asserted by the `not.toMatch(/₱/)` checks and by the type-ladder
guard). The quote actions are the small accent rung.

**Deliberately out of scope (noted, not changed).**
`/plans`, `/price-list`, `/packages`, `/lots/price-list-2026` and the `/builder` estimator's
plan portion are the separate monthly-pricing lane. Casket/product prices on `/products` are
product (SRP) prices, not funeral-service fees, and the corpus keeps them. The chapel booking
dialog (`components/chapel-booking-dialog.tsx`, its rules, scheduling holds and tests) is left
intact but is **no longer linked from `/services`**: a chapel stay is now a quote request, and
re-linking the booking flow is a product decision for the captain.

**Tests**

| File | Pins |
|---|---|
| `tests/unit/price-surfacing.test.tsx` | `/services` renders no service figure, offers one quote link per a-la-carte line / embalming day count / chapel, and every quote link carries no price |
| `tests/unit/villa-services-premium.test.tsx` | the three quote sections, the card/photo/label grammar, and that the chapel rates + booking step are gone |
| `tests/unit/facilities-page.test.tsx` | both `/facilities` and `/services` publish no service rate, each room has one quote action and one call |
| `tests/unit/public-forms.test.ts` | `validateQuote` requires name, email, requested service and consent; `quoteInquiryInput` records the name, contact details, requested service, preferred date and additional requirements |
| `tests/unit/public-forms-render.test.tsx` | the `/quote` route renders every field and prefills the requested service from a `?item=` link |
| `tests/unit/request-prefill.test.ts` | the existing contact-request seam is unchanged |
| `tests/unit/typography-system.test.tsx` / `accessibility-craft.test.tsx` / `reading-budget.test.tsx` | type ladder, one h1 / labelled fields / named actions, prose budget |
