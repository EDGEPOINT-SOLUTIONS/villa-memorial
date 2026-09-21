# Flexible hero — pure image · clear 100% · free text colour (2026-09-21)

Captain's direction (2026-09-21): the hero in the page/menu editor must support
being **"completely a pure image with no effect"**; **"the headline is not a
requirement"**; **transparency 100% must show the clear picture**, not a cloudy
wash; and **"the font color can be changed to any color also"**. Two additions
followed mid-task (2026-09-21, firstmate inbox 001): **the rail's oversized lead
image must not force the rails to scroll**, and **the left rail's 24/7 call card
must take the same colour as the hero text** so the two are synced.

This record covers the fields/controls added, the layering rules, the measured
before/after and the evidence files.

## Fields and controls added

| Where | Field | Notes |
|---|---|---|
| Landing hero (`HeroSection`, `lib/api-client/landing.ts`) | `textColour: string \| null` | Any CSS colour `isValidCssColor` accepts. Absent = the shipped token ink. |
| Page-document hero (`PageHero`, `lib/content-catalog.ts`) | `textColour: string \| null` | Same reader/validator; composed into Home by `lib/api-client/content-pages.ts`. |
| Landing + page-document editors | **Hero text colour** | Free text input + native colour picker + "Default ink" clear, live-validated, with a live "Hero headline" preview. Rendered by `components/landing/hero-background-field.tsx`. |

The copy fields (`eyebrow`, `headline`, `lead`/`subline`) are now **optional** in
both validators; an image-only hero (a photo and none of the three) is a legal
document. The Home editor's headline hint says so.

## The rendering rules

- **Image-only hero** (photo + no eyebrow/headline/lead/subline): the home hero
  renders the raw photograph at the layout's full hero size (`.hero-home--image-only`,
  16:9), with no brand, buttons, wash, scrim or gradient. The park hero has the
  same mode (`.hero-premium--image-only`). A visually-hidden `h1` keeps the page
  named for assistive tech.
- **Transparency 100% = the clear photograph.** The constant readability scrim
  (`.hero-home--photo::after`) is deleted. The staff-chosen colour is the only
  overlay (`.hero-home__wash`): 0% solid, 100% absent. The editor copy now reads
  "the photograph is clear".
- **Hero text colour** paints through one custom property, `--hero-text-colour`,
  set on the page shell. Every hero copy rule reads
  `var(--hero-text-colour, <token>)`, so a legacy document is untouched and an
  invalid colour never reaches the page. The left rail's 24/7 call card
  (`.rail-call*`) reads the same variable — the two are synced.
- **The rail lead image is capped.** `.rail-item--lead .rail-thumb` is
  `clamp(5.5rem, 7vw, 6.5rem)` instead of a fixed `14rem`, so the default rail
  list fits its viewport-bounded height.

## Measured before/after

### Rail scroll (1440×900, seed rails)

| | left rail content | left rail box | scrollable | right rail | lead thumbnail |
|---|---|---|---|---|---|
| before (14rem lead) | 866 px | 758 px | **yes** | 640 / 640 | 224 px (298 px wide) |
| after (capped lead) | 743 px | 743 px | **no** | 533 / 533 | 101 px (244 px wide) |

At **390×844** both rails are `display: none` (the flyout takes over), so there
is no rail scrollbar by construction; `document.scrollWidth === 390` (no
horizontal overflow).

### Lead image evidence

- `shots/rail-scroll-before-1440.webp` — 14rem lead, rail content past the fold.
- `shots/rail-scroll-after-1440.webp` — capped lead, all 11 pinned items visible.
- Synced call card: `shots/rail-call-before-1440.webp` (default navy ink) and
  `shots/rail-call-after-1440.webp` (hero text colour `#ffffff`, call card white).

### Hero states

| State | 1440×900 | 390×844 |
|---|---|---|
| Image-only hero (raw photo) | `shots/image-only-hero-1440.webp` | `shots/image-only-hero-390.webp` |
| 100% clear photo (with copy, no scrim) | `shots/clear-100-home-1440.webp` | `shots/clear-100-home-390.webp` |
| Custom text colour (`#ffffff`) + synced call card | `shots/custom-font-colour-1440.webp` | `shots/custom-font-colour-390.webp` |
| Editor controls (background + text colour) | `shots/editor-hero-controls-1440.webp` | — |

## Tests

- `tests/unit/hero-background.test.ts` — `readHeroTextColour` / `heroTextColourStyle`
  (valid, legacy-null, invalid never emitted).
- `tests/unit/content-catalog.test.ts` — an image-only `PageHero` is accepted;
  a valid text colour accepted, an invalid one refused; the transparency range
  still refused out of bounds.
- `tests/fixture-contract/landing.test.ts` — an image-only landing hero is
  accepted; the text colour round-trips / is refused when invalid.
- `tests/unit/landing-view.test.tsx` — image-only renders no copy/wash; the
  `--hero-text-colour` reaches the page and the call card; the photo scrim rule
  is gone; the rail lead cap and the call-card ink are pinned in the stylesheet.
- `tests/unit/hero-background-field.test.tsx` — the text-colour input renders and
  the 100%-clear copy is shown.

## Backward compatibility

Every new field is optional and reads as `null` when absent; the existing seed
documents carry no `textColour`, so they render the shipped token ink exactly as
before. The transparency semantics are unchanged (0–100, 100 = absent); only the
constant scrim is removed, which is the captain's explicit direction. No amount,
honesty state or kit rule changed.
