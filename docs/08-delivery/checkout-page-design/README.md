# /checkout — the designed opening, the centred column and the shared public grammar

Captain's ask (2026-09-30): *"and also the checkout page it should be revised for it to follow
how every other pages looks like. the forms should be in the center also."* Every public page
now opens on the home's designed gateway — a kicker, the display-serif page title at the
page-title rung (35.2px, weight 500, never bold), one short lead and the page's own action —
and reads as hairline-separated bands. `/checkout` still wore the old generic `.page-header`
band, and its form sat in a narrow left-aligned column.

**The look moved. The behaviour did not.** The validation, the single `POST /api/orders`
payload (customer + sku/quantity lines), the order-number redirect, the cart clear, the field
labels, hints and error strings are untouched.

## What `/checkout` renders now

- **The opening** is the same gateway the sibling `/cart` opts into: `PublicHero`
  (`variant="interior"`) in a `.checkout-page` scope that drops the shared boxed band
  (transparent, no border, no gold rule), centres the copy, paints the eyebrow `--sky-700` at
  the micro rung and sets the title at the shared page-title step, weight 500. The way back to
  the cart is the opening's outline secondary, exactly where the other pages put their
  secondary action.
- **One centred column.** Every band is the same comfortable reading measure
  (`--measure-prose`, horizontal margins auto), so the details, the order summary and the
  commit share ONE centred column — never the old narrow column pinned to the left.
- **The details band** is the same fields on the shared `Field` primitive, under a centred
  `SectionHead` (kicker · title · one lead) — no `04`-numbered capture card.
- **The order summary** is a hairline ledger: one row per line (`name · qty × unit` — line
  total), the estimated total right-aligned on a heavier rule. It is a read of `cart.lines`;
  nothing new is sent.
- **The one commit** is the gold `Place order`, with the outline `Keep browsing` support
  action — the same rung `/cart`'s `Proceed to checkout` wears, and gold carries dark ink,
  never white.
- **The empty state is a page**, not the shared dashed empty-state box: its own band with a
  mark, a display-serif title at weight 500, one line and the gold way forward.
- **Phones get the page, not a shrunken desktop**: the commit band stacks full-width below
  40rem, and the measured document width at 390 is 390 — no horizontal overflow.

## Files touched

| File | Change |
|---|---|
| `app/(public)/checkout/page.tsx` | The page re-expressed on the shared primitives (`PublicHero` · `SectionHead`), the centred hairline bands, the gold commit, the designed empty state and the read-only order summary. Same validation, same `POST /api/orders` payload, same redirect and clear. |
| `app/(public)/checkout/layout.tsx` | The stale "retired / Quote / redirects" metadata corrected to `Checkout — Villa Funeraria` (the page is the live priced cart's final step). `noindex`/`nofollow` unchanged. |
| `styles/components.css` | The appended `public: checkout block` at the tail — the gateway opt-out, the centred measure, the band rhythm, the ledger and the phone reflow, mirroring the `public: cart block`. Tokens only; it edits no other lane's block. |
| `tests/unit/checkout-page-grammar.test.tsx` | New guard: the gateway opt-out, the weight-500 title, the centred column, the gold commit, the designed empty state and the phone reflow. |
| `docs/08-delivery/notes/demo-web-route-coverage.md` | The `/cart`, `/checkout` row notes the restyle. |

## Evidence

Before (the captain's running build) and after (this branch) at 1440 and 390, empty and a mixed
basket of a standard package + a White Rose half casket + a delivery line:

| View | Before | After |
|---|---|---|
| Empty · 1440 | `before-empty-1440.png` | `after-empty-1440.png` |
| Empty · 390 | `before-empty-390.png` | `after-empty-390.png` |
| Mixed · 1440 | `before-filled-1440.png` | `after-filled-1440.png` |
| Mixed · 390 | `before-filled-390.png` | `after-filled-390.png` |

The same mixed basket the `/cart` record uses (`PKG-STANDARD` + `CSK-WHITE-ROSE-HALF` +
`SRV-DELIVERY` ×2) is the line a browser seeds through Add-to-cart.

Full validation on the branch: `npm run lint`, `npm run typecheck`, `npm test` (246 files /
2,795 tests) and the production `npm run build` all pass; `/checkout` renders 200 from the
production server and the measured document width at 390 is 390.
