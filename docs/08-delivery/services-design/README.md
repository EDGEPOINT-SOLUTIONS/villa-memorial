# Services page — approved design (2026-09-16)

**Status:** captain-approved design, committed as the contract the implementation follows.
**Artifact:** [`services-design.html`](./services-design.html) — the Lavish review surface (the plan
+ the five sample pages embedded at desktop and 390 px), also openable directly in a browser (it
loads `../../../styles/*`, `services-pages.css` and `services-review.css`).
**Example pages:** [`page-01-services.html`](./page-01-services.html) … [`page-05-schedule.html`](./page-05-schedule.html)
— one complete, responsive example each, openable on their own at any width.
**Companion report** (full rationale, method, evidence, review record): the scout report in the
firstmate data directory (`data/villa-services-design-lavish/report.md`).

**Captain's approval (2026-09-16):** *"im good with all the plan please implement them"* — the plan
was approved verbatim, including all nine numbered questions (Q1–Q9). The captain also set the
brand rule applied here: **the public page paints sky blue, not dark blue** — `--sky-*` surfaces
with navy ink, the same grammar as the home page, `/plans` and the rest of the storefront.

> **Do not redesign on the way in.** The artifact is the reference. A deviation is the captain's
> call, not the implementer's.

---

## 1. What the page is for, and who reads it

`/services` publishes the client's 2026 funeraria price sheets and takes the first step of an
arrangement. Its reader is not shopping: they are a grieving family — often older, usually on a
phone, often reading for the first time within hours of a death, sometimes reading only to
compare prices weeks in advance. The page must answer three questions in this order:

1. **"Someone has just died — what do I do now?"** → a human on the phone, any hour, before any price.
2. **"What will this cost?"** → the client's own 2026 figures, in plain words, each with its unit.
3. **"Can I hold the chapel / reserve this line?"** → the two real storefront actions, explained.

Everything else on the page supports those three answers.

## 2. The approved decisions (the design's spine)

| # | Decision | Why |
|---|---|---|
| 1 | **Lead with the call, not the catalogue.** The hero carries a full-width 24/7 call panel above every price. | The most common visit is a death. A human is the product; a price can wait one screen. |
| 2 | **Answer "what now?" before "how much?".** Three numbered steps, then the death-at-home / death-in-hospital guides. | A family cannot read prices while wondering what happens next. |
| 3 | **Senior-first type everywhere on this page.** 18 px body, ≥16 px for every page-content text run, 1.6+ line-height, ≥48 px buttons. | The captain's explicit ask; the app's 15 px/13 px office scale fails it. |
| 4 | **One format for every amount:** `₱X,XXX` + the unit in words (`per service`, `for 5 days`, `per day`, `total`). | The old page mixed units across cards and tables. |
| 5 | **One row per decision.** The chapel 3–9 day schedule is one row per stay (days · regular · senior · Book N days · Request), grouped by chapel; the raw sheet table is never the phone experience. | A phone reader should never scroll a sideways table. |
| 6 | **Keep the sheet's words, add one plain sentence.** "Retrieval" stays (it is on the contract) with "We bring your loved one into our care" under it. | Families meet these words on paperwork; translating beats renaming. |
| 7 | **Explain the button pair once per section.** Add to cart = reserve now, pay nothing here; Request order = send the office a message, nothing is reserved. | The old page never explained it. |
| 8 | **Make the page navigable.** Breadcrumb, sticky "On this page" bar with five anchors + back-to-top, `scroll-margin-top` on every anchor target. | A 6–12 thousand pixel page with no navigation is a maze. |
| 9 | **Never leave the reader without a human.** A help band closes the page; phones get a sticky bottom call bar. | The phone number should be one thumb away at any scroll position. |
| 10 | **Keep the trust block.** Sheet provenance (which sheet, which fee, package scope, the senior-citizen question) stays, in plain sentences, at reading size. | The prices are the client's; the page should say exactly where each one comes from. |

## 3. Information architecture (order and reason)

| # | Section | Anchor | Why here |
|---|---|---|---|
| 0 | Breadcrumb | — | Where am I, one tap home. |
| 1 | Hero: eyebrow, H1, 20 px lead, client's sample photo + illustrative caption | `#top` | Say what the page is before anything else. |
| 1b | **Call panel**: "If someone has just died" + **Call 0917 000 1234** + "What to do first" | — | The first visit's real question, above every price. |
| 2 | **Sticky "On this page"**: What to do first · Services & prices · Embalming · Chapel dates · Where prices come from · Back to top | — | The page's map, always visible under the header. |
| 3 | **What happens after you call**: three numbered steps + the two guide cards (Death at home, Death in hospital) | `#first-steps` | Orientation before money. |
| 4 | **Services and prices**: the five a-la-carte cards (icon, name, ₱ amount + "per service", one plain sentence, both actions) + the ₱19,500 total band | `#services` | The sheet's own at-need block, one card per decision. |
| 5 | **Embalming — priced by the day**: day picker (3–9) → price panel → Add/Request; the full day counts behind "See every day count"; the client's wake photo beside it | `#embalming` | The reader's real question is "how much for N days?", not "show me a table". |
| 6 | **Chapel — check the dates and book online**: two photo cards (per-day rate, room facts, 3-day regular + senior, **Check dates & price** + Request order), the PLACEHOLDER notice, per-stay rows for 3–9 days grouped by chapel, the senior-citizen note and the sheet's notes | `#chapel` | Booking needs dates and a schedule check; a chapel is never a one-click cart item. |
| 7 | **Where these figures come from**: both sheets named, the ₱1,000 fee, the package scope, the illustrative photographs | `#sources` | Provenance, in plain sentences. |
| 8 | **Help band**: "Talk to a person, any hour" + Call + Message us | — | Close with a human. |
| 9 | **Phone call bar** (fixed, under 75 rem): "Someone has died? — Call 0917 000 1234" | — | One thumb away at any scroll position (clears the quick-menu FAB). |

## 4. The five sample pages

| # | Page file | In-artifact anchor | What it shows |
|---|---|---|---|
| 01 | [`page-01-services.html`](./page-01-services.html) | `#sample-01` | The full redesigned `/services` at desktop and 390 px |
| 02 | [`page-02-chapel-booking.html`](./page-02-chapel-booking.html) | `#sample-02` | The chapel card before the tap, the booking step in context (the live dialog's own copy and figures), the refused state |
| 03 | [`page-03-in-cart.html`](./page-03-in-cart.html) | `#sample-03` | The "In your cart" state on a chapel card and a service line, the success alert, the cart line at 390 px |
| 04 | [`page-04-states.html`](./page-04-states.html) | `#sample-04` | Eight states with the live wording: empty cart, loading, catalogue error, schedule error, refused dates, not-offered-online, success, release warning |
| 05 | [`page-05-schedule.html`](./page-05-schedule.html) | `#sample-05` | The long-content case: the sheet's 8-column table, the per-stay rows that replace it on the page, the at-rest disclosure, the embalming day counts |

The artifact also carries the plan itself (page job, IA, navigation, the price → booking/enquiry
path, what is removed/moved, the accessibility standard, the section-by-section before/after and
the build spec) and the review record with the captain's answers.

## 5. Build spec (implemented)

Implementation files (all in the app, none here):

| File | What it now does |
|---|---|
| `app/(public)/services/page.tsx` | Breadcrumb, hero + call panel, sticky nav (`SECTIONS` list), three steps + guide cards, the three rate sections, sources, help band, phone call bar. Error branch keeps `ErrorState` when the catalogue is unreachable. |
| `components/villa/service-rates-2026.tsx` | `AlacarteServiceRates` · `EmbalmingRates` · `ChapelRates` on the `sv-*` classes; per-stay rows; the sheet's tables behind disclosures; figures only from `lib/villa-pricing.ts`. |
| `components/villa/embalming-day-picker.tsx` | The 3–9 day picker + price panel (client component; state, no rules). |
| `components/villa/services-subnav.tsx` | Sticky "On this page" bar; progressive enhancement (plain anchors before hydration, `aria-current` from an IntersectionObserver after). |
| `components/villa/in-cart-notice.tsx` | The "In your cart" chip per line; a chapel removal releases the dates through the same helper the cart page uses. |
| `components/chapel-booking-dialog.tsx` | `ChapelBookingButton` gained `ariaLabel` (the stay rows say "Book N days" under a chapel heading; the accessible name carries the chapel — WCAG 2.5.3 label-in-name). No booking-logic change. |
| `styles/components.css` | The "Services page — the approved 2026-09-16 redesign" `sv-*` block. |

**Nothing else moved:** every price, SKU, service, chapel option and figure comes from
`lib/villa-pricing.ts` / the catalogue / the chapel store. Add to cart, Request order, the booking
step, reserve-on-add/release-on-remove, the cart, checkout and scheduling behave exactly as before.

**Sky-blue colour correction applied after the review** (captain's brand rule; nothing structural):

- the help band is a light sky gradient with navy ink (16.8:1), not a dark-navy band — it matches the call panel;
- the phone call bar is `--sky-700` with white text (5.9:1), not `--sky-900`;
- all text on the page uses the navy ink ladder on sky/white surfaces, so no surface is "dark blue".

## 6. Senior-first legibility — measured

The same CDP harness measured the live page and the sample (raw output in the scout report's
`measure.json`):

| Measure | Live 1440 | Live 390 | Sample 1440 | Sample 390 |
|---|---|---|---|---|
| Body base font | 15 px | 15 px | **18 px** | **18 px** |
| Smallest page-content text | 11.2 px | 11.2 px | **16 px** | **16 px** |
| Text runs under 16 px (page content) | 192 | 184 | 22¹ | 13¹ |
| Lowest body contrast | 4.9:1 | 4.9:1 | **7.8:1 (AAA)** | **7.8:1 (AAA)** |
| Controls under 44 px | 42 | 28 | **0** | **0** |
| Widest horizontal scroller (page) | 52 px | 455 px | **none** | **none** |
| Sticky in-page navigation | no | no | **yes** | **yes** |

¹ the remaining sub-16 px runs are the shared site header/footer links, which this design does not
touch. Contrast is computed from each element's own `color` against its painted background; tap
targets are measured from `getBoundingClientRect()`.

## 7. Review record and decisions

| Round | When | What happened |
|---|---|---|
| Construction | 2026-09-16 | Plan written; five sample pages built from the live page, the client's sheets and the park's chapel records; render-verified at 1440 / 390 / 320 px (no overflow, no console errors); price guard green. |
| Round 1 | 2026-09-16 | Session served to the captain (plan + 5 pages + Q1–Q9). |
| Decision | 2026-09-16 | **Approved verbatim**: "im good with all the plan please implement them" — Q1 call-first hero, Q2 per-stay chapel rows, Q3 in-cart state, Q4 embalming day picker, Q5 remove the plans card, Q6 sticky phone call bar, Q7 18 px body on this page, Q8 keep the senior-sheet conflict printed as-is, Q9 build as drawn. The captain's additional brand rule: sky blue, not dark blue. |

**Held questions (open client decisions, published as-is, not resolved by this design):**

- The senior-citizen chapel sheet is internally inconsistent (the table's 96 % column vs its own
  ₱1,800 / ₱4,200-per-day footnote); both are published as printed (Q8).
- The park's real chapel list is still unconfirmed; the page marks the names PLACEHOLDER.
- No contract maps the Bronze/Silver/Gold tier photography to named casket models (unchanged).

## 8. Tests that pin this design

`tests/unit/villa-services-premium.test.tsx` (three priced sections, per-card actions, chapel
photographs + illustrative labels, both chapel columns, the booking step and its accessible names,
the sticky anchors, the day picker) and `tests/unit/price-surfacing.test.tsx` (every 2026 figure
published and sellable, the chapel request path). `tests/unit/chapel-booking.test.ts` and
`tests/unit/chapel-admin*.ts*` still pin the booking/schedule rules the page uses, untouched.

## 9. Files here

```
docs/08-delivery/services-design/
├── README.md                 this contract
├── services-design.html      the approved Lavish review (plan + samples + review record)
├── page-01-services.html     full redesigned page
├── page-02-chapel-booking.html
├── page-03-in-cart.html
├── page-04-states.html
├── page-05-schedule.html
├── services-pages.css        the approved sv-* design block (same rules shipped in
│                             styles/components.css between the "Services page" and
│                             "end services page" markers — keep the two in step)
└── services-review.css       review-surface chrome (not product CSS)
```
