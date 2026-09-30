# /cart — the designed opening and the shared public grammar

Captain's ask (2026-09-30): *"The cart page also needs to be themed the same way as other
pages."* Every public page now opens on the home's designed gateway — a kicker, the
display-serif page title at the page-title rung (35.2px, weight 500, never bold), one short
lead and the page's own action — and reads as hairline-separated bands. `/cart` still wore the
old generic `.page-header` band, so it looked like a different site.

**The look moved. The behaviour did not.** The cart context, the quantity and remove controls,
the chapel-date release, the store snapshot and the `/checkout` link are untouched.

## What `/cart` renders now

- **The opening** is the same gateway the other interior pages opt into: `PublicHero`
  (`variant="interior"`) in a `.cart-page` scope that drops the shared boxed band (transparent,
  no border, no gold rule), centres the copy, paints the eyebrow `--sky-700` at the micro rung
  and sets the title at the shared page-title step, weight 500.
  Measured on the running build: **35.2px / weight 500 / TeX Gyre Bonum**.
- **The lead** is one line: the item count plus "prices are confirmed at checkout" when the
  cart holds lines, or the browse line when it is empty.
- **The page's action** sits where the other pages put theirs: gold `Proceed to checkout` with
  an outline `Keep browsing` for a non-empty cart; gold `Browse plans & services` with an
  outline `See the 2026 price list` for an empty one. The gold commit is the gateway's own
  contrast rule — the fill carries dark ink, never white.
- **The lines** are the shared `.table` unboxed: one hairline per row, a centred `SectionHead`
  above it. Each line still opens the same inline catalogue-details reveal.
- **The estimated total** is a right-aligned ledger row on a hairline — not the old
  gold-topped shadow card.
- **The empty state is a page**: its own centred band with a mark, a display-serif title at
  weight 500 and one line. It is no longer the shared dashed `EmptyState` error box.
- **Phones get the page, not a shrunken desktop**: below 40rem the lines table re-lays-out as
  stacked, labelled rows (the same grammar `/price-list` uses for its rate card), the commit
  band stacks full-width, and the measured document width at 390 is 390 — no horizontal
  overflow.

## Files touched

| File | Change |
|---|---|
| `app/(public)/cart/page.tsx` | The page re-expressed on the shared primitives (`PublicHero` · `SectionHead`), the hairline bands, the designed empty state and the stacked phone layout. Same cart logic, same links. |
| `components/cart-line-row.tsx` | Each row marked `.cart-line`; the fact cells carry `data-label` so the stacked phone layout keeps the column headers it hides. |
| `app/(public)/cart/layout.tsx` | The stale "retired / Quote" metadata corrected to `Your cart — Villa Funeraria` (the page is the live priced basket). `noindex` unchanged. |
| `styles/components.css` | The appended `public: cart block` at the tail — the gateway opt-out, the band rhythm, the designed empty state and the phone reflow. Tokens only; it edits no other lane's block. |
| `tests/unit/cart-page-grammar.test.tsx` | New guard: the row labels, the gateway opt-out, the weight-500 title, the gold commit, the designed empty state and the closed-details-row fix. |
| `docs/08-delivery/notes/demo-web-route-coverage.md` | The `/cart` row notes the restyle. |

## Evidence

Before (the captain's running build) and after (this branch) at 1440 and 390, empty and a
mixed cart of a package + a casket + a delivery line:

| View | Before | After |
|---|---|---|
| Empty · 1440 | `before-empty-1440.png` | `after-empty-1440.png` |
| Empty · 390 | `before-empty-390.png` | `after-empty-390.png` |
| Mixed · 1440 | `before-mixed-1440.png` | `after-mixed-1440.png` |
| Mixed · 390 | `before-mixed-390.png` | `after-mixed-390.png` |

The mixed cart is the recorded catalogue's `PKG-STANDARD` + `CSK-WHITE-ROSE-HALF` +
`SRV-DELIVERY` (2) — the same lines a browser seeds through Add-to-cart.

**The shop the phone reflow fixes:** the before-390 mixed shot cut the Line-total column and
the Remove action into the pan frame; the after-390 shot stacks each fact under its label and
fits 390 exactly.
