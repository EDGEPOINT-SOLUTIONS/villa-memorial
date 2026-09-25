# Home storefront rebuild — Amazon-familiar structure (2026-09-25)

Captain's direction (2026-09-25): *"The fucking designs are all the same… the
structures are all the same. Renovate them all in a much more Amazon inspired
UI/UX quality so customers are much more familiar. The home page, don't edit the
idea that there should be a mid section and right left rail, that stays the same,
but you should edit it with a new look, a much more intuitive design and much
more professional presentation. Remove all the things that are not useful…"*

The previous pass (PRs #121, #123–#125) changed only surfaces — white grounds,
gradients/marble removed, shared kit components — while every layout stayed
identical. This lane changes the **structure and presentation of the homepage**,
not its palette.

Two follow-up steering messages were acted on before shipping:

- **Type right-sizing.** The hero is capped at 36px desktop (never the 52px top
  of the `--text-display` clamp), section heads ride 22px, card titles and
  prices 18px, body 16px. Nothing on the page exceeds 36px; hierarchy comes from
  weight and colour, not size.
- **A designed opening band.** The page opens on a deliberate, uncrowded header
  band — eyebrow · headline · one short lead · the key action — on its own copy
  panel, never a bare title on the ground.

## The grammar (Amazon-familiar, the colours/type/language stay ours)

- **Picture first, then name, then figure, then ONE action per card.** Every
  home card is the kit `ProductCard` (photograph leads, figures under it) with a
  single gold per-item action (`btn--accent`).
- **Section heads carry a "see all" affordance.** The shared `SectionHead`
  primitive (`kicker · answer · ONE action`) now heads every mid band; three
  bands carry a `.section-head__link` door to their surface.
- **Progressive disclosure, not paragraph dumps.** The mission/vision words stay
  behind the shared `PublicDisclosure`; only the one-sentence lead is printed.
- **Consistent gutters and even columns.** The plans/lots shelf keeps the shared
  `.shop-grid.plan-lot-grid` (3 / 2 / 1 across) with one gap scale.
- **The rails earn their place.** Left = the departments list led by the
  always-reachable help card; right = the short action list led by four real
  doors.

## Section order

| Before (HEAD) | After |
|---|---|
| hero → **about** → plans & lots → plan board → live map → newsfeed → closing band | hero → **plans & lots** → plan board → live map → about → newsfeed → closing band |

Products first, story after: a visitor scanning the storefront meets the shelf
and the park before the brand prose. The closing band (`NextSteps`) and the
footer are unchanged.

## Structural inventory (measured from the rendered DOM)

Rendered with the seed content + pricing document through `LandingView`
(`renderToStaticMarkup`), counting class markers. Reproduced with a throwaway
harness; the durable assertions live in `tests/unit/landing-view.test.tsx` and
`tests/unit/public-page-budget.test.tsx`.

| Marker | Before | After |
|---|---|---|
| section order | hero, about, plans&lots, plan board, map, newsfeed | hero, plans&lots, plan board, map, about, newsfeed |
| `data-section-head` (shared heads) | 1 | 5 |
| `section-head__link` ("see all") | 0 | 3 |
| `hero-home__copy` (opening panel) | 0 | 1 |
| `rail-assist` (help card) | 0 | 1 |
| `rail-action` (quick actions) | 0 | 4 |
| `rail-heading` | 2 | 3 |
| `shop-card` (plan/lot cards) | 5 | 5 |
| `post-card` (newsfeed) | 4 | 4 |
| `btn--accent` (per-item gold) | 1 | 6 |
| `btn--secondary` (outline) | 8 | 3 |
| `btn--primary` (commit) | 1 | 1 |
| `mid-section` | 5 | 5 |
| `data-public-disclosure` | 1 | 1 |

The `btn--secondary` → `btn--accent` shift is the per-item action grammar: the
five home cards now wear the gold item rung (matching the catalogue's `Add to
cart`), leaving the hero's sky commit as the band's only filled commitment. The
chevron-free "see all" links are quiet text actions, so they do not compete.

## What was removed or folded (reviewable list)

1. **The map section's deep-link tip** (`Tip: the same map lives at /map — share
   any plot deep link, e.g. /map?park=villa&plot=A-001`). Editorial filler on a
   decision band; the map's own "Open the full map" door replaces it.
2. **The hero's care line** (a fourth copy of the 24/7 number). The number is
   now anchored in the left rail's always-reachable help card, the closing band,
   the footer and the phone action bar — the hero keeps the eyebrow, headline,
   one lead and its two actions.
3. **The per-card secondary action** on the plan/lot cards. One card, one action
   (`View lots` / `View the plan`, gold).
4. **Three prose section intros** replaced by the shared `SectionHead` lead —
   one sentence each, same words.
5. **Three hand-rolled band heads** (`.mid-kicker` + `h2` + `.mid-intro`)
   replaced by `SectionHead`, so the home uses the same head grammar as every
   other public page.

Not removed: live prices, plan tables, the lot families, the honesty notes
(sample labels, the senior-rate footnote, the price provenance note), contact
facts, or the newsfeed (it renders as clean cards).

## The opening band

`.hero-home__copy` is a designed panel (white surface, hairline, generous
padding) holding the brand, eyebrow, headline, one lead and the two actions. It
sits left over the hero photograph (or on the sheet when the document carries no
photo), so the type is always readable and the band never presents a bare title
on the page ground. An image-only document still renders the raw photograph
untouched — the hero-flexible contract (100 % = the clear photo, author text
colour, phone cap) is unchanged.

## Type right-sizing (homepage-scoped)

The role aliases are lowered **inside `.anchored-page`** on desktop only
(`@media (min-width: 48.001rem)`), exactly like the family portal's reading scale
(`.fv-body` overrides the `--text-*` tokens inside the kit). No other surface's
type moves, and the token map's phone step-down below 48rem still applies.

| Role | Before | After |
|---|---|---|
| hero (`.hero-home__title`) | `--text-display` clamp 36→**52px** | `--text-3xl` **36px** |
| section heads (`.section-head__title`, `.mid-section > h2`) | `--text-2xl` **28px** | `--text-xl` **22px** |
| card titles (`.shop-card__title`) | `--text-xl` **22px** | `--text-lg` **18px** |
| card price (`.shop-card__price`) | `--text-2xl` **28px** | `--text-lg` **18px** |
| body | `--text-md` 16px | unchanged 16px |

Every rule still consumes the role alias (`var(--text-hero)` etc.), so the
typography contract's "mapped role class rides its step" check is intact — only
the alias values are scoped down on the home. The phone step-down
(hero 28px / section 22px / card 18px) is the token map's own.

## Rails

- **Left rail — departments + help.** A fixed `.rail-assist` card leads: "Need
  help now?" with the staff-editable number as a 44px `tel:` target and the
  office's place under it. The staff-pinned departments follow under their
  heading, unchanged (thumb + name + caption/price, one oversized lead each).
- **Right rail — quick actions.** A fixed `.rail-actions` card leads with four
  real doors — Price list `/price-list`, Request a quote `/quote`, Plan finder
  `/builder`, Directions & park map `/map` — each with a one-line hint. The
  staff-pinned plans & lots remain below under their heading.

The whole rail surface stays staff-editable in the content model; the two lead
cards are app-authored destinations, not pinned content.

## Checks

```
npm run lint && npm run typecheck && npm test && npm run build
```

- `npm test`: 2539 passed (216 files), including the updated home pins in
  `tests/unit/landing-view.test.tsx`, `tests/unit/public-page-budget.test.tsx`,
  and the unchanged guards `public-layout`, `public-cta-contract`,
  `public-surface-consistency`, `page-backgrounds`, `typography-system`,
  `phone-layout`, `broken-pages`, `reading-budget`, `accessibility-craft`.
- `npm run build`: production build green.

No screenshots are attached for this task (per the brief); the evidence above is
the section/card inventory and the DOM marker measurements.
