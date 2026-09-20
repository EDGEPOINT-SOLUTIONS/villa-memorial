# `/services` trim — implementation record (2026-09-21)

**Route:** `/services` (`app/(public)/services/page.tsx`; `components/villa/service-rates-2026.tsx`).
**Brief:** the captain's 2026-09-21 direction from the live page removed three surfaces:
(1) the chapel placeholder disclaimer and the whole “See every stay, 3 to 9 days” rate block
with its senior-rate disagreement table, sheet footnote and miscellaneous-fee notes;
(2) the entire **Guides for what comes next** section; (3) the **Where these figures come
from / The 2026 sheets, reproduced exactly** provenance block. Everything else stays: the
hero, Services and prices, Embalming, the Chapel A/B cards, “Talk to a person, any hour” and
the footer.

## What shipped

| Removed | Where it lived |
|---|---|
| Chapel disclaimer (“The chapel list is still unconfirmed…”) | `ChapelRates` `.sv-placeholder` |
| “See every stay, 3 to 9 days — regular and senior prices” schedule | `ChapelRates` `<details id="chapel-stays">` |
| Senior-rate disagreement table + footnote | `ChapelRates` `.sv-senior` |
| Miscellaneous-fee notes | `ChapelRates` `.sv-section__note` |
| “Guides for what comes next” section | `app/(public)/services/page.tsx` → `ServiceGuides` (component deleted) |
| “Where these figures come from / The 2026 sheets, reproduced exactly” | `app/(public)/services/page.tsx` `#sources` |

**Kept exactly:** the hero; `Services and prices` (the `.sv-price-card` grid and the sheet’s
own ₱19,500 total); `Embalming — priced by the day` (the day picker and the full 3–9 day
disclosure); `Chapel — check the dates and book online` (the park’s Chapel A/B cards with the
per-day rate, the 3-day regular/senior examples, `Check dates & price` and `Request order`);
the `Talk to a person, any hour` band and the footer.

### Honesty notes that left the page

Two honesty statements lived on the removed surfaces; they are recorded here so the change is
explicit and no underlying data was dropped:

- **“The chapel list is still unconfirmed — names and capacity are the park’s placeholder
  records. Prices and dates are real.”** The placeholder chapel names/capacity are unchanged in
  the park’s own chapel record (`lib/fixtures/scheduling/chapel-admin.json`) and the client
  question stays open in `docs/07-client-villa/open-questions.md`; only the on-page notice left.
- **The senior-rate disagreement** (sheet III’s table column vs its own per-day footnote) is no
  longer restated on `/services`. The figures and the recorded client question stay in
  `lib/villa-pricing.ts` and the pricing fixture; the page simply no longer prints the
  comparison.

### The guide routes stay

`/services/death-at-home`, `/services/death-at-hospital` and `/transport` are unchanged service
entries — still edited at `/staff/landing/service-entry/[key]` and listed from
`/staff/landing/services`. They are only no longer **linked from `/services`**.

The now-unused `.sv-placeholder` / `.sv-senior` / `.sv-sources` / `.sv-prices--guides` CSS blocks
remain in `styles/components.css`: this pass was scoped to the page shape, and
`tests/unit/broken-pages.test.ts` still pins the guide-card rule.

## Tests updated to pin the new page shape

- `tests/unit/villa-services-premium.test.tsx` — the chapel cards keep the per-day rate and the
  3-day regular/senior example; the removed schedule, disclaimer and guide section are absent.
- `tests/unit/price-surfacing.test.tsx` — the same, plus the guide cards are no longer listed.
- `tests/unit/service-entry-page.test.tsx` — an entry edit still lands on the guide route and no
  longer on `/services`.

## Evidence

Full-page screenshots in `shots/` (fixture-mode dev server, spare port 4321), 1440 × 900 and
390 × 844:

| Shot | What it shows |
|---|---|
| `services-before-1440.jpg` · `services-after-1440.jpg` | 1440-wide full page — before: chapel schedule + guides + provenance; after: the trimmed page. |
| `services-before-390.jpg` · `services-after-390.jpg` | 390-wide full page, before/after. |

Before = base commit `b1519cc`; after = this change. The removed sections are visible in the
before shots between the Chapel cards and the `Talk to a person` band.
