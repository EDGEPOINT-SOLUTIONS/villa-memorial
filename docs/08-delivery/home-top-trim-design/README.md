# Home top trim — implementation record (2026-10-03)

**Task:** `villa-home-topgap` · **Mode:** local-only branch `fm/villa-home-topgap`
**Base HEAD at start:** `b0d3af5` (chore(demo): clean every demo record…)

**Captain's brief:** *"The home page in the middle section, take a screenshot of the hero image and
tell me what's wrong, i want to remove the margin top space gap because it's too far."*
Measured on the live home at 1440: the header ended at 129px, then the page's own top padding, the
storefront grid's gutter, the middle sheet's padding and the banner section's padding stacked to
**146px of empty space** above the photograph.

---

## 1 · What changed

One home-scoped CSS block in `styles/components.css` (the `public: home block`, beside the
`.home-open*` rules). No markup, no other public page.

| # | Ask | Where it landed |
|---|---|---|
| 1 | Reduce the stacked space above the hero on `/` only | `.public-main:has(> .blog-storefront) { padding-top: 0 }` — the page's own `--space-7` air (51.2px) |
| 2 | The band's own top padding | `.blog-storefront .home-banner { padding-top: 0 }` — the `.mid-section` clamp (38.4px) |
| 3 | The middle sheet's top padding | `.blog-storefront .anchored-mid__inner { padding-top: 0 }` — 32px |
| 4 | Leave ONE small gap, scaled sensibly at 390 | unchanged — the storefront grid's own `--space-5` gutter (22.4px at every width) stays as the single gap under the header |
| 5 | Do not touch any other public page's top spacing | every selector is scoped to `.blog-storefront` (or `.public-main:has(> .blog-storefront)`); `.blog-storefront` wraps the home's bands and nothing else now (`/blog` has been its own reading page since 2026-10-02) |

Nothing in the band moved: the photograph (uncropped, its own aspect), its bottom caption strip
(park name · 24/7 call · Future plan) and the flanking rails are unchanged. Only the space above the
band collapsed.

## 2 · Measured before/after (dev render, fixture mode, intro cookie set)

Gap = header's bottom edge → the hero `<img>`'s top edge (scrollY 0). The picture's frame is the
sheet's 1px border plus the media's 1px border, so the *visible desk-tint gap* to the sheet is
22.4px of the 24.4px measured.

| viewport | before | after | removed |
|---|---|---|---|
| 1440 × 900 | **145.97 px** (img top 274.94) | **24.39 px** (img top 153.36) | 121.58 px |
| 390 × 844 | **113.97 px** (img top 169.36) | **24.39 px** (img top 79.78) | 89.58 px |

Contributors at 1440, before → after: page `--space-7` **51.2 → 0** · grid `--space-5`
**22.4 → 22.4** (kept) · sheet clamp **32 → 0** · section clamp **38.4 → 0** · frame borders
**2 → 2**. Horizontal overflow 0 at both widths; no picture re-crop.

**Another public page is unchanged.** `/services` was re-measured on the same branch:
`main.public-main` padding-top **51.2px before and after**, and `.sv-page` top **180.16px before and
after**.

## 3 · Gates

```
npm run lint          ✓
npm run typecheck     ✓
npm test              ✓ (full suite)
npm run build         ✓ exit 0
npm run smoke         ✓ (production build on :4000)
```

The home/landing/structure gates exercise this block unchanged:
`home-styles`, `landing-view`, `home-blog-swap`, `composition-pass`, `public-layout`, `broken-pages`,
`page-backgrounds`, `phone-layout`, `public-page-budget`, `accessibility-craft`, `journey-actions`.

## 4 · Evidence

Viewport captures of the running app (1440 × 900 and 390 × 844), with the home intro cookie set:

| viewport | before (`main` @ `b0d3af5`) | after (this branch) |
|---|---|---|
| 1440 | [`screens/before-1440.png`](screens/before-1440.png) | [`screens/after-1440.png`](screens/after-1440.png) |
| 390 | [`screens/before-390.png`](screens/before-390.png) | [`screens/after-390.png`](screens/after-390.png) |

## 5 · Records touched

- `docs/08-delivery/notes/demo-web-route-coverage.md` — the `/` row names the 2026-10-03 top trim
  and links this record.
