# Family portal — the premium pass (2026-09-30)

**Task:** `villa-family-portal-premium` · **Repo:** villa-memorial · **Branch:** `fm/villa-family-portal-premium`
**Brief:** the captain's own 2026-09-30 request — *"Let's make the family portal more premium, Apple
inspired dashboard"* — as a **focused polish over the shipped command centre**, not a rebuild.

> The command centre itself already shipped on `main` (`family-command-centre-design`,
> `family-portal-pages-design`, `family-household-design`). This record is the follow-up pass: it
> changes the **material** of those surfaces, moves no markup and drops no information.

## 1 · Scope and honesty

- The work is CSS only: `styles/tokens.css` (the named model) and `styles/components.css` (a block
  at the tail). No `.tsx` changed, so the interaction design, the routes, the panel count and the
  information architecture are exactly as the captain approved them.
- **The agent portal is not restyled.** Every new selector is prefixed
  `.portal-frame[data-portal="family"]`; the `.dash-*` classes exist only on the family dashboard.
- **The approved colour-meaning system stays.** The panel head washes (`needs` warning, `money`
  gold, `arrangement` sky, `settled` success, `place` neutral) are pinned by
  `tests/unit/family-density.test.tsx` and are deliberately kept — the polish quiets the *material*,
  not the meanings. No new hue is introduced.

## 2 · The named elevation + radius model

Declared once in `styles/tokens.css` (the "family elevation + radius model" block), consumed only
by the `[data-portal="family"]` block:

| Plane | Ground | Radius | Elevation |
|---|---|---|---|
| GROUND — the workspace | `--paper-100` (#faf7f2) | — | — |
| SURFACE — panels, KPI tiles, alerts, cards | `--paper-0` | `--family-radius-surface` **12px** | `--shadow-card-rest` |
| FLOATING — papers dialog, account menu, drawer | `--paper-0` / translucent | `--family-radius-floating` **20px** | `--shadow-raised` |
| CONTROL — buttons, fields, nav items, switcher | — | `--radius-md` **8px** | hover → `--shadow-card-hover` |

The three shadows are the product's **existing** steps, not a second system. The one addition is the
softened edge (`--family-hairline`, `color-mix(border 58%, transparent)`) that turns a drawn 1px
rectangle into a plane edge.

**The ground is the real fix.** The 2026-09-30 eye-comfort pass set the portal frame to `--paper-200`
("the workspace sits on a warm tint") but the content column still painted white over it, so the desk
never showed. This pass gives the family content `--paper-100` — warm, but not the full-screen cream
cast `--paper-200` painted once it was visible — so the white planes finally sit above a desk.

**A block inside a panel is content, not a second plane**: the nested `.dash-table`, `.dash-remember`
and `.dash-upload` lose their shadow and read on the panel they belong to.

## 3 · Palette and contrast (measured, WCAG 2.1)

One accent for attention, the status roles kept to their roles, and everything else quiet. The
switcher's current person becomes the one accent moment (`--sky-50` fill, `--sky-800` ink), and the
rail/top bar/drawer recede into glass. Every text/ground pair introduced or carried:

| Foreground | Ground | Ratio | Min |
|---|---|---|---|
| `--sky-800` #0b4468 | `--sky-50` #eaf6fd | **9.36:1** | 4.5 |
| `--sky-700` #0f5d8e | `--sky-50` #eaf6fd | **6.42:1** | 4.5 |
| `--ink-700` #423e38 | `--paper-100` #faf7f2 | **9.94:1** | 4.5 |
| `--ink-900` #191713 | `--paper-100` #faf7f2 | **16.75:1** | 4.5 |
| `--ink-700` #423e38 | `--paper-200` #f4efe6 (rail help) | **9.27:1** | 4.5 |
| `--ink-600` #5c574e | `--paper-200` #f4efe6 | **6.26:1** | 4.5 |
| warning-ink #7a5f1f | warning-bg #f5eeda (panel head) | **5.20:1** | 4.5 |
| success-ink #4f6b4a | success-bg #e9efe7 (panel head) | **5.08:1** | 4.5 |
| `--gold-800` #6e4e08 | gold-wash-soft over white (~#fdf7e4) | **7.11:1** | 4.5 |
| danger-ink #7f3f36 | danger-bg #f5e5e2 | **6.45:1** | 4.5 |

The translucent chrome resolves to the same inks: the rail is 84 % white over the frame, the drawer
94 % white over the page, so the ground stays light enough that the measured ratios hold.
`backdrop-filter` is enhancement-only — the translucent colour alone is readable without it.

## 4 · Type

No role moved off its ladder step and nothing dropped below the 12px floor
(`tests/unit/typography-system.test.ts` pins both). What changed is the drawing: the dashboard's
compact headline tightens to `line-height: 1.08` / `letter-spacing: -0.016em`, the panel title to
`1.15` / `-0.012em`, the remembering name to `1.1` / `-0.01em`, and the KPI figure to `1.05` /
`-0.01em`. Money and dates already ride `font-variant-numeric: tabular-nums` through the `.dash`
scope and `.dash-table`; that is unchanged.

## 5 · Chrome and motion

The rail, the phone top bar and the bottom tab bar are one translucent pane
(`backdrop-filter: saturate(1.35) blur(20px)`) over the warm desk, with a soft edge shadow instead of
a drawn border; the drawer blurs 24px. Motion is short and purposeful — a 120ms colour step on the
rail and the switcher, a 200ms shadow/transform step on an interactive tile, and a 200ms fade-and-rise
on the drawer and the account menu. Nothing animates on load and no figure animates. The global
`prefers-reduced-motion` block plus the scoped rule at the tail removes the lift and the open
animations.

## 6 · Density proof (measured on the live dashboard at 1440, person view)

| Measure | Before (`main`) | After |
|---|---:|---:|
| Body words | 632 | **632** |
| KPI tiles / panels / tables / alert rows | 6 / 7 / 5 / 3 | **6 / 7 / 5 / 3** |
| Document height / screens | 1919px / 2.13 | **1914px / 2.13** |
| `.portal-content` ground | `#ffffff` | `#faf7f2` |
| `.dash-panel` radius | 8px | **12px** |

The change is provably material-only: `git diff` carries no `display`, `grid`, `flex`, `padding`,
`margin`, `width`, `height`, `gap` or `font-size` declaration. The page is 5px *shorter* because the
display leading tightened.

## 7 · Evidence and verification

`shots/` — `before-*` is `main` immediately before this pass, `after-*` is this branch. Both widths,
the household switcher, one person's command centre, the plan page, the papers dialog, the collapsed
rail and the account menu.

Gates, all green on the head:

- `npm run lint` — 0 errors (3 pre-existing warnings in `tests/unit/gallery-page.test.tsx`, untouched).
- `npx tsc --noEmit` — clean.
- `npx vitest run` — **258 files, 2,880 tests** pass, including `family-density`, `family-calm-state`,
  `typography-system` (the portal weight guard), `page-backgrounds`, `portal-calm`, `page-opening`,
  `broken-pages`, `phone-layout`, `accessibility-craft`, `composition-pass` and `public-layout`.
- `npm run build` — success (97/97 static pages).
- `node scripts/smoke-public-routes.mjs --base http://localhost:4100` — **all 54 advertised routes
  render** against the production build.
- Computed values quoted from the live page: content `rgb(250,247,242)`; panel/KPI radius `12px`;
  panel & alert shadow `rgba(25,23,19,0.04) 0 1px 2px, rgba(25,23,19,0.09) 0 6px 16px -6px`; rail
  `color(srgb 1 1 1 / 0.84)` + `rgba(25,23,19,0.16) 6px 0 24px -18px`; panel title `18.4px / -0.192px`.
