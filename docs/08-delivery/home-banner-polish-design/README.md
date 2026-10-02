# Home banner polish — the 2026-10-02 captain's second pass

**Task:** `villa-home-polish` · **Date:** 2026-10-02 · **Mode:** local-only branch `fm/villa-home-polish`
**Base HEAD at start:** `a49083b` (the general-price-list PDF route)

The captain's brief was five changes to the home page, exactly as asked. This record
lists what changed, the measured before/after at 1440 and 390, and the gates. The pass is
**local-only**: nothing was pushed and no PR was opened.

> *"in the homepage center and make this part smaller and center it Isabela City, Basilan /
> We're here for you / any hour, any day. and the image not cropped, and also the font should
> be the same as the font of the 'Memorial plans & garden lots' and also remove this part in
> the home page Need help now? / Call 0917 617 8489 / Every hour, every day · Isabela City,
> Basilan and move this to the very bottom of the right rail Price list / 2026 coffins,
> services & plans / Start a quote / We reply with real figures / Plan finder / Build an
> estimate in minutes / Directions & park map / Find your way to the park"*

---

## 1 · What changed

All five asks live in two files plus the stylesheet.

| # | Ask | Where it landed |
|---|---|---|
| 1 | Centre and shrink the gateway block (the place line + the rotating title sets) | `styles/components.css` `.home-open__words` (`margin-inline: auto; text-align: center`) and the `.home-open__title, .home-gateway__title` rule |
| 2 | Match the "Memorial plans & garden lots" font (family **and** step) | the title rule now reads `font-family: var(--font-serif)` + `font-size: var(--text-section-title)`, the exact family/step of `.section-head__title` |
| 3 | Uncrop the Sanctuario photograph | `styles/components.css` `.home-open--feature .public-image--home-hero` (`aspect-ratio: auto; max-height: none`) and its `img` (`height: auto; object-fit: contain`); `components/landing/home-banner.tsx` `sizes` raised to match the wider box |
| 4 | Remove the "Need help now?" card | `components/landing/landing-view.tsx` — `RailAssist`, the `railAssist` prop and the `.rail-assist*` rules are gone |
| 5 | Move the four quick links to the very bottom of the right rail | `components/landing/landing-view.tsx` — `RailPanel` gained a `foot` slot and the right rail passes `<RailActions />` below the pinned list; the aside is now labelled "Plans & lots" and the `.rail-actions` block carries a separating hairline |

Nothing else on the page moved: the storefront bands, the plan/lots grid, the plan board,
the map, the About band, the banner's anchored strip (park name + call + Future plan), the
left rail's pinned "Care & services" list and the entrance overlay are all unchanged.

## 2 · Measured before/after (production-equivalent dev render, 80% root)

### 1440 × 900

| measure | before | after |
|---|---|---|
| gateway title | `35.2px` / weight `600` | **`25.6px` / weight `500`** — identical to the "Memorial plans & garden lots" head |
| gateway words | left-aligned, block `x=385` | **centred**, block `x=518`, `text-align: center` |
| Sanctuario photo | `592 × 333` inside a `670` band (frame shrank, `object-fit: cover`) | **`668 × 376`** — fills the band at the file's own `960 × 541` aspect |
| left rail lead | "Need help now?" card | **"Care & services"** (staff-pinned list) |
| right rail | quick actions on top | **pinned "Plans & lots" on top, quick actions at the very bottom** |
| image derivative | `hero-1-640` | **`hero-1-960`** (never upscaled) |
| horizontal overflow | 0 | **0** |

### 390 × 844

| measure | before | after |
|---|---|---|
| gateway title | `25.6px` (page-title phone step) | **`19.2px`** (section-title phone step) |
| Sanctuario photo | `360 × 240`, `cover`-cropped to a `3 / 2` frame | **`360 × 203`** — the whole `16:9` picture, no crop |
| horizontal overflow | 0 | **0** |

## 3 · Gates

```
npm run lint          ✓
npm run typecheck     ✓
npm run test          ✓  (the one 5s timeout that appeared under parallel load passed in isolation —
                          the suite is flaky under CPU contention, not on this change)
npm run build         ✓
```

Affected unit gates updated in the same commit (the captain's decision changed what they pin):
`tests/unit/home-styles.test.ts` (the gateway title now rides the section-title step in
`--font-serif`), `tests/unit/landing-view.test.tsx` and `tests/unit/public-page-budget.test.tsx`
(the help card is gone, the quick actions sit below the pinned list).

## 4 · Evidence

`shots/before-1440.png` · `shots/after-1440.png` · `shots/before-390.png` · `shots/after-390.png`
under `docs/08-delivery/home-banner-polish-design/screens/`.
