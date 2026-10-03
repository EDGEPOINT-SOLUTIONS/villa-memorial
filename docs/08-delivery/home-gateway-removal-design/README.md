# Home gateway removal — implementation record (2026-10-03)

**Task:** `villa-home-remove-gateway` · **Mode:** local-only branch `fm/villa-home-remove-gateway`
**Base HEAD at start:** `a5c4051` (family plan/lot inquiry gate)

**Captain's brief:** *"remove this Isabela City, Basilan / We're here for you / any hour, any day. /
We come to you / and stay until the burial is done. / The first park in Basilan / family-run, in
Isabela City."* — the entire gateway block at the top of the home's middle column.

---

## 1 · What changed

One component, one test, and the route-coverage note. The stylesheet needed no edit: the band's
existing `.home-open--feature` layout already stacks a single full-width picture with its anchored
strip, and the retired gateway classes stay in the file for the office's editor and the kept
`HomeTitleRotator` component.

| # | Ask | Where it landed |
|---|---|---|
| 1 | The place line and all rotating title sets off the home | `components/landing/home-banner.tsx` — the `.home-open__words` block (the `home-open__eyebrow` place line + `HomeTitleRotator`) is removed; the band is the photograph and the anchored strip only |
| 2 | Keep the Sanctuario photograph (uncropped), the call and the Future plan action | unchanged — the `PublicImage` `home-hero` still renders whole (`.home-open--feature` overrides its ratio/ceiling), and the strip keeps `0917 617 8489` and `Future plan` |
| 3 | Exactly one `h1`, visually hidden, reading the page's honest title | the band's new `<h1 id="home-title" class="visually-hidden">` renders the office's own wordmark (`content.logo.wordmark`, "Villa Funeraria"); the section's `aria-labelledby` points at it |
| 4 | Rebalance the band | no CSS change needed — `.home-open--feature` is a single-column full-width picture with the strip attached to its bottom edge, so the picture and the two actions carry it |
| 5 | Keep the rotating title data + editor wiring | untouched — `content.home.gateway` (place, `titleSets`, `titleIntervalSeconds`, `lead`, `secondary`, `facts`) and `/staff/landing/home` section 1 keep working; `HomeTitleRotator` and its timing module are unchanged, so the office can render the words again later |

**Why the wordmark and not the retired promise.** The h1 existed to name the route (F-16's
"one h1 per route" contract). The removed sets were marketing lines, so the hidden heading reads
the page's honest title — the site's own wordmark — never one of the words the captain took off
the page. It is the same sr-only pattern the titleless interior heroes use.

## 2 · Measured before/after (dev render, fixture mode, intro cookie set)

| viewport | band height before | band height after | `.home-open__words` | horizontal overflow |
|---|---|---|---|---|
| 1440 × 900 | 620 px | **519 px** | present → **absent** | 0 / 0 |
| 390 × 844 | 505 px | **410 px** | present → **absent** | 0 / 0 |

`document.querySelectorAll("h1").length` = 1 at both widths, and the `h1` text is
"Villa Funeraria" (asserted by `tests/unit/home-blog-swap.test.tsx`). No horizontal overflow at
either width.

## 3 · Gates

```
npm run lint          ✓ 0 errors
npm run typecheck     ✓ clean
npm test              ✓ 310 files · 3297 tests
npm run build         ✓ exit 0
node scripts/smoke-public-routes.mjs --base http://localhost:4000
                      ✓ all 53 advertised routes render
```

The affected gates updated/passing in the same commit:
`tests/unit/home-blog-swap.test.tsx` (the banner no longer renders the place line or the sets;
one hidden h1 with `id="home-title"`), and the home/landing/stores/structure suite
(`home-styles`, `landing-view`, `public-page-budget`, `home-title-rotator`, `home-title-rotation`,
`home-editor-title-sets`, `composition-pass`, `accessibility-craft`, `reading-budget`) all pass
unchanged.

## 4 · Evidence

Full-page captures of the running app, 1440 × 900 and 390 × 844, with the home intro cookie set:

| viewport | before (`main` @ `a5c4051`) | after (this branch) |
|---|---|---|
| 1440 | [`screens/before-1440.png`](screens/before-1440.png) | [`screens/after-1440.png`](screens/after-1440.png) |
| 390 | [`screens/before-390.png`](screens/before-390.png) | [`screens/after-390.png`](screens/after-390.png) |

## 5 · Records touched

- `docs/08-delivery/notes/demo-web-route-coverage.md` — the `/` row now names the 2026-10-03
  removal and the hidden honest title, and links this record.
