# UI/UX renovation — the public-site sweep

**Task:** `villa-ui-renovation-public` · **Captain, 2026-09-25:** _"completely renovate
everything, especially the ui/ux… all background color should be white, sky blue theme is for
buttons only and footer, and don't do anything with the navigation bar."_

This lane sweeps the **public site** onto the foundation ([PR
#121](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/121)). The foundation made the
semantic grounds white and confined the sky to controls + the footer, but deliberately left
page-level composition to a dependent sweep. What remained on top of those white grounds were
the exact tells the captain named: a decorative gold radial bloom on every shared band/hero, a
white→beige gradient wash, and warm `--marble-*` placeholder grounds across the catalogue, PDP,
gallery, services and facilities.

## What shipped

- **The shared closing band is flat white.** `.next-steps` (rendered on every public page by
  `PublicShell` / `LandingView` / `NextSteps`) carried a gold radial gradient plus a
  white→granite linear gradient; it now paints `var(--color-bg-surface)` and keeps its one gold
  rule. This is the single highest-leverage declaration in the sweep — one rule, every route.
- **Every public hero/band is flat.** The decorative gold radial bloom was removed from
  `.hero-premium` (package + park), `.gal-hero`, `.ia-hero`, `.mem-profile__hero`,
  `.mem-unavailable` and `.contact-facts`; the white→beige gradients on `.plan-statement`,
  `.mem-profile__portrait`, `.park-map` and `.media-block` are gone too.
- **Media placeholders are neutral, not warm marble.** All 18 public photo placeholders
  (`.shop-card__media`, `.ledger__media`, `.tier-ledger__media`, `.item-card__media`,
  `.model-photo img`, `.day-ladder__media img`, `.plan-tier__media`, `.chapel-card__media`,
  `.casket-sample__media`, `.casket-card__media`, `.tribute-figure img`, `.pdp-variant__thumb`,
  `.pdp-gallery__main/__thumb/__placeholder`, `.pdp-zoom__frame`, `.gal-figure__media`,
  `.sv-price-card__media img`, `.sv-chapel__media`, `.sv-card-media`, `.fac-room__media`,
  `.fac-ground__media`, `.rail-thumb`) now sit on the neutral `var(--color-bg-subtle)` wash.
  `.mem-profile__portrait` and `.mem-rule-card--never` join them.
- **Blue-tinted loading + beige chip gone.** `.skeleton` shimmers on the granite ladder, not
  `--navy-*`; `.badge--accent` uses the established `var(--gold-wash-soft)` accent wash, not
  `--marble-200`.

## Measured before/after (no screenshots — declaration + computed-style measurements)

Declaration scan of `styles/components.css` (comment-stripped):

| | before | after |
|---|---:|---:|
| `background` values reaching a `--marble-*` primitive | **32** | **4**¹ |
| `background` values carrying a `gradient(…)` | **62** | **51**² |
| public band/hero selectors with a gradient background | **11** | **0** |

¹ the 4 survivors are dead legacy (`.landing__hero`, `.memorial-card`), the family portal's
`.fv-record__mark`, and the staff `.kpi-card--action` — none is a live public route.
² the 11 removed are exactly the public band/hero gradients above; the fair-haired survivors are
controls (`.quick-call`, `.ia-call`), brand chrome (`.brand-mark`, the footer/header hairlines),
legibility scrims (`.rail-item__text`), the home hero's sanctioned bloom, and staff/editor
surfaces — each outside this sweep's scope.

Computed backgrounds on the live public routes (Chrome DevTools Protocol over a fixture-mode dev
server): before the sweep, `/products`, `/lots`, `/products/[sku]`, `/memorials`, `/gallery`,
`/facilities`, `/services`, `/plans`, `/map` and the home each reported warm `rgb(245,243,238)` /
`rgb(234,230,221)` marble grounds and a `.next-steps` gold radial. After the sweep the only
non-white backgrounds on any public route are the allowlisted controls (`.btn--primary` sky,
`.btn--accent` gold, the call actions, the phone bar), the footer (sky), the untouched nav bar,
status washes / badges, the park map's data-viz marks (legend dots, pins), the skip link, the
home hero's one sanctioned gold bloom, and small identity/status indicator discs.

## The guard

`tests/unit/public-surface-consistency.test.ts` (new, **6 tests**) — the sweep made executable,
the sibling of `tests/unit/page-backgrounds.test.ts`. It fails, by declaration:

1. a `gradient(…)` background on any of the 10 shared public bands/heroes;
2. a `--marble-*` background on any public band, hero or media placeholder (25 selectors);
3. a media placeholder that never takes `var(--color-bg-subtle)`;
4. a prune/rename that leaves the named surfaces undefined.

It also asserts the shared closing band is flat white and that `.hero-home` keeps its sanctioned
bloom, so a future drive-by cannot silently flatten the captain's one documented exception.

## Full check set (all green)

```
npm run lint       # clean
npm run typecheck  # clean
npm test           # 210 files, 2,488 tests passed
npm run build      # production build passed
```

## Scope notes

- **The navigation bar is untouched.** No `.anchored-*` rule body changed. The only nav deltas
  are the shared token values that moved in the foundation (hairline + hover wash), and those are
  the foundation's recorded one-token reverts.
- **`.hero-home` is the one sanctioned gold bloom** (the foundation's documented exception);
  this lane does not touch it, and the guard pins that decision.
- **Dead CSS left in place.** `.landing__hero`, `.landing__cta`, `.landing-showcase`,
  `.memorial-card` and `.sv-total` have no live consumer; the composition pass owns dead-code
  removal, so this lane did not prune them.
