# Section titles — the studied pattern, applied to the public pages

Captain, 2026-10-02: *"study how they do their section titles here [stanfillfh.com paste] … apply this."*
The study is `data/villa-admin-plan/section-title-study.md`. This record is the copy pass that applied it.

## The pattern (what the study found)

- A section title is **one short human clause** — a claim ("Service that Exceeds
  Expectations"), an emotional promise ("Where Your Loved Ones Are Honored"), a three-beat
  imperative ("Prepare. Plan. Protect."), or a first-person invitation ("Always Here to
  Help"). Aim: **six words or fewer.**
- Almost every title is paired with **exactly one supporting line or one action** — the title
  promises, the line explains, the action lets the visitor act.
- **Two-line labels** belong only to gateway tiles (the home's, which this pass excludes).
- **Social proof carries a number, not adjectives.**

## What this pass changed

Copy only. No structure, component, layout or type change; no amount, phone number, address or
link was touched. Page H1s are unchanged (kept sensible for search); the pass works on the
`h2`/`h3` band titles and their supporting lines.

| # | Page | Old | New |
|---|------|-----|-----|
| 1 | Services | `Services we provide` | `Ask for the services you need` |
| 2 | Services | `Five services — ask for the ones you need.` | `Five services, each quoted for your family.` |
| 3 | Services | `Chapel — two rooms for your dates` | `Two rooms for your dates` |
| 4 | Services | `More about the service` | `More from the office` |
| 5 | Services (hero lead) | `At-need funeral care, any hour. Every service is quoted.` | `At-need care any hour — every service is quoted.` |
| 6 | Services (band action) | `A Villa Memorial Plan already includes all five · See what the plan covers →` | `See what the plan covers →` |
| 7 | Plans | `Every plan already includes all of this` | `Every plan includes the same` |
| 8 | Plans | `The same on every tier.` | `One list, every tier.` |
| 9 | Plans | `Frequently asked questions` | `Your questions, answered` |
| 10 | Products | `Photographs are illustrative samples; the office confirms the exact model and availability.` | `Illustrative samples; the office confirms the model.` |
| 11 | Products/[sku] | `About this model` | `The model in detail` |
| 12 | Products/[sku] | `Specifications` | `Recorded details` |
| 13 | Products/[sku] | `More about this model` | `More from the office` |
| 14 | Plans/[sku] (package) | `More about this package` | `More from the office` |
| 15 | Price list | `Branches & affiliated locations` | `Where you'll find us` |

Rows 11–14 are **authored-content sections**: they only render when staff have written a
description, specs or extra blocks for that catalogue item. No fixture item carries one, so the
PDP and package before/after screenshots are byte-identical — the rewrite is the state a staff
edit will show. Every other row is visible in the shots below.

## Sections audited and left alone (already matched the pattern)

| Page | Sections kept | Why they already comply |
|------|---------------|--------------------------|
| Services | `Embalming — quoted by the day` | A claim, 5 words, with one line. |
| Plans | `Compare the five tiers` · `What differs, tier by tier` · `Add only what you need` | Imperatives/claims ≤ 6 words, one line each. |
| Plans (add-ons) | `The services, by the piece` · `A place in the park` · `The chapel` | One clause each, one line, one action. |
| Park / Map | `Every recorded plot, on one plan` | A 6-word claim with one line. |
| Products | `Every model, with its price` | A 5-word claim with one line. |
| Products/[sku] | `What comes with it` | An invitation with one list. |
| Facilities | `Two rooms, for the whole wake` | A 6-word promise with one line. |
| Gallery | `The grounds and the setting` · `What the family is choosing between` · `Chapels, viewing and the march` | One clause each, one line. |
| Blog | `News and stories from the park` · `Memorial plans & garden lots` · `Villa Memorial Plan` · `Browse the grounds, live` · `About Villa Memorial Park` | One clause each, one line; the rail heads are the office's own two-word group names. |
| Contact | `Tell us what you need` · `Both lines answer any hour` · `Two addresses, one park` | First-person/clause titles, one line, one action. |
| Memorials | `What this search can show` · `A person will look with you` | A claim and an invitation, one line each. |
| Memorials /find | `How the office looks for someone` · `A family's decision, never a default` · `What a family can choose` | One clause each, one line. |
| Price list | `The Villa Memorial Plan` · `Lots & mausoleum` · `Coffin options` · `What every plan includes` | The index's own family labels, mirrored by the sticky rail and its kicker numbers; kept for scanability. |
| Lots price list | `Monthly installments` · `Regular and senior rates` | A figure-led index, one line each. |
| Builder | `Build it, question by question` | A 5-word imperative; the step titles are the form's own labels. |
| FAQ | `Straight answers` | A 2-word claim over the page's own answers. |

Shared chrome — the shell's closing band (`Talk to us`), the footer columns and the leaflet's
`Park map` label — is not a page section and was not touched. The home is **excluded** until the
landing re-vision pick lands (the captain's own exclusion); `/blog`'s storefront bands read the
landing document but every one of them already matched the pattern, so nothing there changed.

## Honesty preserved

- No price, amount, count, address or phone number changed. Every `php()`/store read is untouched.
- `Illustrative samples` / the sample notes and the plan-source notes still print; the wording
  only tightened.
- The `/services` Request-for-Quote rule still holds: no price is published, and the shortened
  band action still points at `/plans`.
- The price-list band still labels the four recorded branches and affiliated parlors, now under a
  human title.

## Evidence

- Screenshots — 1440 and 390, full page — for every touched page:
  `screenshots/before-{services,plans,products,product-detail,package,price-list}-{1440,390}.png`
  and the matching `after-*` set. Captured from the branch's own dev server on `:4010` with
  chrome-devtools-axi (`--full-page`).
- Tests updated where they pin copy: `tests/unit/price-surfacing.test.tsx` and
  `tests/unit/villa-services-premium.test.tsx` (the `/services` band titles).
- Gates run: `npm run lint`, `npm run typecheck`, the affected unit files, the full `npm test`,
  then `npm run build` once at the end.
