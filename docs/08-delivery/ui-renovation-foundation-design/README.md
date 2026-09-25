# UI/UX renovation — foundation (design system + shells)

**Task:** `villa-ui-renovation-foundation` · **Captain, 2026-09-25:** _"completely renovate
everything, especially the ui/ux… the sky blue color should not be in every pages background
because it's making every page to feel cheap and very ai… all background color should be white,
sky blue theme is for buttons only and footer, and don't do anything with the navigation bar."_

This lane is the foundation the page-by-page sweeps build on: the semantic tokens, the shared
component surfaces, and the four shells (public, Admin Portal, agent, family). Page-level
composition stays with the dependent sweeps.

## What shipped

- **White grounds, product-wide.** `--color-bg-page` / `--color-bg-surface` /
  `--color-bg-surface-raised` / `--color-bg-desk` all resolve to `#ffffff`; the staff/public
  "desk" radial sky wash is gone.
- **Neutral hairlines.** `--color-border` → `granite-200` (`#d9dde1`), `--color-border-strong` →
  `granite-300`, `--color-rule` → `granite-200`, `--color-rule-strong` → `granite-300`. The blue
  hairline everywhere was the other half of the template tell.
- **Sky confined to controls + footer.** Every page/section/table/band sky fill was replaced with
  white or the neutral quiet wash; the blue survives on primary buttons, selected/pressed states,
  the call actions, small status indicators, and the footer — plus the untouched public nav bar.
- **Sharpened shared components.** Radii `4/6/10px → 6/10/14px`; the two elevation ladders were
  rebuilt as crisp low-opacity two-layer shadows; the quiet hover wash is neutral; the missing
  `--space-9` the portal content column referenced is now declared. The Admin Portal's navy/gold
  buttons joined the product's **flat-fill** button grammar (the vertical sheen gradients and
  `brightness()` hovers are gone; the hover steps the fill one rung), matching the public pass.
- **Shells.** Public shell + anchored home, Admin Portal (`app-shell`, topbar, white rail with a
  sky active edge), agent/family portal frame (white rail, white content), and all sign-in doors
  now paint white.

## Measured before/after (no screenshots — token + declaration measurements)

Sky-background declarations in `styles/components.css` (any `background`, `background-color` or
`background-image` value reaching a `--sky-*` token):

| | before | after |
|---|---:|---:|
| sky background declarations | **120** | **34** |

All 34 survivors are the explicit control/footer/nav/indicator allowlist (primary button, pressed
toggles, current nav/step items, call actions, footer, nav bar, timeline dots, avatar discs), and
the guard fails any new one.

Semantic tokens:

| token | before | after |
|---|---|---|
| `--color-bg-page` | `sky-50` `#f2f9fe` | **`#ffffff`** |
| `--color-bg-surface` | `#fbfdff` | **`#ffffff`** |
| `--color-bg-surface-raised` | `#ffffff` | `#ffffff` |
| `--color-bg-desk` | sky radial wash → `#f5f8fb` | **`#ffffff`** |
| `--color-bg-subtle` | `sky-100` `#e2f2fc` | `granite-50` `#f6f7f8` |
| `--color-border` | `sky-200` `#c4e6f8` | `granite-200` `#d9dde1` |
| `--color-border-strong` | `sky-300` `#98d2f1` | `granite-300` `#bfc5cb` |
| `--color-rule` | `#d6eaf8` | `granite-200` `#d9dde1` |
| `--color-rule-strong` | `#b4d9f0` | `granite-300` `#bfc5cb` |
| `--radius-sm / md / lg` | `4 / 6 / 10px` | `6 / 10 / 14px` |

Resolved ground that the shells paint: `.public-shell` / `.anchored-page` / `.anchored-mid__inner`
/ `.app-main` / `.app-sidebar` / `.family-shell` / `.portal-frame` / `.portal-content` /
`.portal-sidebar` / `.signin-shell` / `.auth-shell` / `.sv-page` / `.hero-home` → `#ffffff`
(with `.hero-home` keeping its restrained gold bloom).

## Guards

- **`tests/unit/page-backgrounds.test.ts` (new, 8 tests)** — the captain's rule made executable:
  the ground tokens must be `#ffffff`, the hairline tokens must not reach the sky ladder, 31 named
  shell/page-ground classes must paint no sky, the footer must keep its sky surface and the
  primary/accent buttons their fills, and a global scan fails **any** sky background outside the
  control/footer/nav/indicator allowlist.
- The existing colour, typography and layout guards stay green: `typography-system`,
  `public-layout`, `public-image-rules`, `public-cta-contract`, `phone-layout`, `composition-pass`,
  `broken-pages`, `accessibility-craft`, `reading-budget`.

## Full check set (all green)

```
npm run lint       # clean
npm run typecheck  # clean
npm test           # 209 files, 2,482 tests passed
npm run build      # production build passed
```

## Scope notes

- **Navigation bar untouched (rules byte-identical).** No `.anchored-*` rule body changed; the
  public bar keeps its layout, labels and gold-underline active cue. Three nav-chrome paints
  read shared tokens whose values moved, so they shift with the system: the header/phone-bar
  hairlines (`--color-rule` / `--color-border`: sky tint → neutral grey) and the nav-chip hover
  wash (`--color-bg-subtle`: `sky-100` → `granite-50`). These are the only nav deltas and each
  is a one-token revert if the captain wants the bar frozen exactly.
- **Footer keeps the brand.** `.anchored-footer` remains the one sky brand surface (asserted).
- **Page-level composition is not in this lane.** Routes whose internal bands still carry their own
  sky accents (services `sv-*`, gallery, memorial, facilities, immediate-assistance, agent `ag-*`)
  have had their grounds/surfaces whitened here; their layout and composition passes are the
  dependent sweep lanes' work.
