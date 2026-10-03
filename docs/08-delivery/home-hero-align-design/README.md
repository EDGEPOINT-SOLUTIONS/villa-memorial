# Home hero align — implementation record (2026-10-03)

**Task:** `villa-home-hero-align` · **Mode:** local-only branch `fm/villa-home-hero-align`
**Base HEAD at start:** `d891ae9` (fix(home): trim the empty gap above the home hero)
**Branch tip:** rebased onto `main` @ `26a8240`, a clean fast-forward

**Captain's brief:** *"No please level it to the margin top of both left and right rail 1st image so
that it's balance."* After the 2026-10-03 top trim the middle sheet's hero photograph sat above the
rails: measured at 1440, the hero `<img>` began at **153.36 px** while the first picture in each rail
began at **195.16 px** — the three columns' first pictures did not share a line.

---

## 1 · What changed

One home-scoped CSS block in `styles/components.css` (the `public: home block`, beside the
top-trim rules). No markup, no other page, no rail movement.

The rails open with a heading block the middle sheet does not have: `.rail-panel`'s padding-top, the
`.rail-heading` line box plus its rule and padding-bottom, and the panel's flex gap. The new
`--rail-lead-offset` is that block **measured in the rail's own tokens**, never a guessed pixel;
the sheet's and media's 1 px frames cancel the panel's and the lead card's, so it is exactly the
extra top padding the banner needs. It is applied only where the three columns are side by side
(`@media (min-width: 75rem)`); below 75 rem `.anchored-rail` is `display: none`, so the
single-column home keeps its clean top.

| # | Ask | Where it landed |
|---|---|---|
| 1 | Level the hero picture with the rails' first pictures | `.blog-storefront { --rail-lead-offset: calc(--space-3 + --text-md × --leading-tight + --space-2 + 1px + --space-3) }` and, at ≥ 75 rem, `.blog-storefront .home-banner { padding-top: var(--rail-lead-offset) }` |
| 2 | The measure is the rail heading block, not a magic number | the calc reads `--space-3` · `--text-md` · `--leading-tight` · `--space-2` · 1 px — the heading's real parts |
| 3 | Keep the trimmed top; do not move the rails | the page/sheet top stays 0; only the middle banner gains the heading-height offset; no rail rule changed |
| 4 | 390 keeps a clean rhythm | below 75 rem the offset is not applied (rails hidden) — the phone hero top is unchanged |
| 5 | Nothing else in the band changes | only `padding-top` on the banner; picture, caption strip (park name · 24/7 call · Future plan) and rails' content/spacing are untouched |

## 2 · Measured before/after (dev render, fixture mode, intro cookie set)

Top = the `<img>`'s top edge at scrollY 0, at 1440 × 900.

| element | before | after |
|---|---|---|
| middle hero `<img>` | 153.36 px | **195.19 px** |
| left rail first `<img>` ("Viewing & wake set-up") | 195.16 px | 195.16 px |
| right rail first `<img>` ("Mausoleum") | 195.16 px | 195.16 px |
| roster | hero 41.80 px high | hero **0.03 px** from the rails |

The three first pictures now share one line (0.03 px apart, well inside the ~2 px target). The
banner's computed `padding-top` at 1440 is 41.832 px.

**The breakpoint.** At 1250 (the narrowest side-by-side width) the same alignment holds (hero
195.19 vs rails 195.16). At 1199 and below the rails are `display: none`, the offset is 0 and the
phone hero top is 79.78 px — identical to the top-trim record's 390 measurement. No horizontal
overflow at any tested width.

| viewport | rails | hero top | rail first img | banner padding-top |
|---|---|---|---|---|
| 1440 | block | 195.19 | 195.16 | 41.832 px |
| 1250 | block | 195.19 | 195.16 | 41.832 px |
| 1199 | none | 95.78 | — | 0 px |
| 390 | none | 79.78 | — | 0 px |

## 3 · Phone (390) — what was done

The rails are hidden below 75 rem, so there is nothing to level against. The new offset is scoped to
`min-width: 75rem`, which is the exact complement of the existing `max-width: 74.999rem` rule that
hides `.anchored-rail`. The 390 before/after captures are byte-identical
(`before-390.png` and `after-390.png` share the same md5, `e5064bd5…`): the phone layout is
unchanged and keeps its clean rhythm.

## 4 · Gates

```
npm run lint          ✓
npm run typecheck     ✓
npm test              ✓ (317 files, 3328 tests at the rebased head)
npm run build         ✓ exit 0
npm run smoke         ✓ (production build on :4000 — all 53 advertised routes render)
```

The stylesheet guards exercise the block unchanged: `home-styles`, `public-layout`,
`composition-pass`, `landing-view`, `home-blog-swap`, `phone-layout`, `broken-pages`,
`typography-system`.

## 5 · Evidence

Viewport captures of the running app (1440 × 900 and 390 × 844), with the home intro cookie set:

| viewport | before | after |
|---|---|---|
| 1440 | [`screens/before-1440.png`](screens/before-1440.png) | [`screens/after-1440.png`](screens/after-1440.png) |
| 390 | [`screens/before-390.png`](screens/before-390.png) | [`screens/after-390.png`](screens/after-390.png) |

## 6 · Records touched

- `docs/08-delivery/notes/demo-web-route-coverage.md` — the `/` row names the 2026-10-03 hero
  alignment and links this record.
