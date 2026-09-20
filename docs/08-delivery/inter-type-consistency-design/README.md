# Inter + one role→step type map

Captain's direction, 2026-09-21: *"Can you make it inter, and the consistent of
the font sizes, fix it."* — plus the inbox addition the same day: *text ink must
be pure black* (navy stays surface/border/background).

This pass does three things in one PR:

1. **Adopt Inter** as the product's one typeface (self-hosted, SIL OFL 1.1),
   retiring Alegreya and Source Sans 3.
2. **One role→step map** — the same role uses the same ladder rung on every
   surface, and the display roles step down once below 48 rem through the same
   aliases.
3. **Pure-black ink** — `--color-text-primary` / `--color-figure` are `#000000`;
   `--color-text-secondary` / `--color-text-muted` are neutral greys. No text
   colour carries the navy tint.

## 1 · Inter

| | Before | After |
|---|---|---|
| display / headings | Alegreya (serif) | **Inter** |
| body / UI | Source Sans 3 | **Inter** |
| paper / legal print | Times New Roman · Bookman Old Style (TeX Gyre Bonum) | unchanged |

- Files: `public/fonts/inter/{inter-latin,inter-latin-ext,inter-latin-italic,inter-latin-ext-italic}.woff2` + `OFL.txt`
  (Fontsource 5.3.0 `@fontsource-variable/inter`; variable weight axis 100–900).
- `--font-serif` and `--font-sans` both resolve to Inter; hierarchy now comes
  from weight (700 headings) + the role steps, not a second typeface.
- **Peso sign verified**: `fontkit.hasGlyphForCodePoint(0x20B1)` is `true` in the
  `latin-ext` subset (normal + italic) and `false` in `latin`, so price tables
  keep a real glyph instead of a fallback face.
- The retired `public/fonts/alegreya/` and `public/fonts/source-sans-3/` trees
  and their `@font-face` blocks are gone.

## 2 · Role → step map

Defined in `styles/tokens.css`; every role class consumes the alias, and
`tests/unit/typography-system.test.ts` pins both the alias values and the classes.

| Role | Token | Step | px | Before (drift) |
|---|---|---|---|---|
| hero | `--text-hero` → `--text-display` | display | 36→52 fluid | already `--text-display` (landing/home/hero-premium/pkg/gal) |
| page title | `--text-page-title` → `--text-3xl` | 3xl | **36** | split: 28 (`.page-hero__title`) vs 36 (staff/paper/agent/IA) |
| section title | `--text-section-title` → `--text-2xl` | 2xl | **28** | split: 36 (`.section-title`, `.mid-section > h2`, `.sv-page h2`, gallery) vs 22 (`.page-section-title`, `.rich-text h2`, `.sv-sources h2`) vs 18 (`.plan-section-title`) |
| card title | `--text-card-title` → `--text-xl` | xl | **22** | split: 22 (`.shop-card__title`, `.svc-card__title`) vs 18 (`.card__header h2`, `.ledger__row-title`, `.item-card__title`, `.empty-state__title`, `.ag-card__title`) |
| body | `--text-body` → `--text-md` | md | 16 | already 16 |
| UI | `--text-ui` → `--text-md` | md | 16 | already 16 |
| caption | `--text-caption` → `--text-sm` | sm | 14 | already 14 |
| micro | `--text-micro` → `--text-xs` | xs | 12 | already 12 (floor) |

Phone step-down (≤ 48 rem), one place in `tokens.css`:
page-title → 2xl (28), section-title → xl (22), card-title → lg (18).

Base `h1`/`h2`/`h3` in `styles/base.css` are the page-title / section-title /
card-title roles, so an unclassed heading is already consistent. The duplicate
global `h1, h2, h3, h4` block in `components.css` (which silently re-weighted
every heading to 600 and beat base's ladder) was removed — one owner.

### Measured (after, browser)

| Surface | Element | Rendered |
|---|---|---|
| `/` (1440) | `.hero-home__title` | 52 px Inter 700 |
| `/` (1440) | `.svc-card__title` (lead card) | 28 px |
| `/products` (1440) | `h1.page-hero__title` | 36 px |
| `/staff/pricing` (1440) | `.page-header h1` | 36 px |
| `/staff/pricing` (1440) | `.table thead th` | 12 px |
| `/products/CSK-LUMINA` (1440) | `h1.pdp-buy__title` | 36 px |
| `/products/CSK-LUMINA` (1440) | `.pdp-section__title` | 28 px |
| any (1440) | `body` | 16 px `rgb(0,0,0)` |
| any (390) | `--text-page-title` / `--text-section-title` | 1.75 rem (28) / 1.375 rem (22) |

## 3 · Ink

| Token | Before | After |
|---|---|---|
| `--color-text-primary` | `--navy-900` (#0d2942) | **#000000** |
| `--color-text-secondary` | `--navy-700` (#1c4366) | **#333333** |
| `--color-text-muted` | `--navy-500` (#41709c) | **#595959** |
| `--color-figure` | `--navy-900` | **#000000** |
| `--color-text-accent` | `--gold-800` | unchanged (accent ink) |
| `--color-text-inverse*` | marble / navy-200 | unchanged (on dark surfaces) |

`--navy-*` is untouched as a surface/border/background ladder. Direct
`color: var(--navy-*)` text colours on the gallery/lots/membership/memorials/
platform surfaces were routed through the ink tokens; `.platform-bar__note`
(light text on the navy bar) now uses `--color-text-inverse-muted`.
Contrast (AA, ≥ 4.5:1): #000000, #333333 and #595959 all pass on both
`#f2f9fe` (page) and `#ffffff` (surface).

## Evidence

`shots/{before,after}/` — 1440×900 and 390×844 for the public home, product PDP,
plans, an admin screen, an admin table, the family portal and checkout (14 pairs).
The admin table is the "a table" ink evidence; the home is the page. The PDP
shots are captured against the rebased tree (the P3 Amazon PDP rebuild landed
between this branch's base and its merge), and every other surface is unchanged
by that rebuild. The PDP rebuild also introduced three headings
(`.pdp-buy__title` 36, `.pdp-section__title` 28, `.pdp-feature-group__title` 18)
that this branch routes through the same role aliases.

## Tests

`tests/unit/typography-system.test.ts`:
- every `font-size` is a ladder or role token, 12 px floor, no raw values;
- the role→step map exists in `tokens.css` and every mapped class uses its token;
- the phone step-down lives in the token map;
- Inter is declared for both `--font-sans`/`--font-serif`, the woff2 + OFL ship,
  the retired families are gone, and the latin preload is Inter;
- the peso range is present;
- primary is `#000000`, supporting inks are neutral greys and pass AA, and no
  text colour uses a `--navy-*` token;
- the gold-as-text and reading-scale rules from the 2026-09-18 pass still hold.

Full suite: `npm run lint && npm run typecheck && npm test && npm run build`.
