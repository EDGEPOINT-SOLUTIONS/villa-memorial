# Public navigation — approved design (2026-09-17)

**Status:** captain-approved design, committed as the contract the implementation follows.
**Artifact:** [`index.html`](./index.html) — the Lavish review surface (the plan, the before/after,
the label options, every state, the measured evidence and decisions D1–D5). It opens directly in a
browser: it loads its review-time copies of `styles/*` and the `nav-*`/`review` files beside it.
**Proposed reference:** [`nav.css`](./nav.css) + [`nav-core.js`](./nav-core.js) — the two-layer bar,
the permanent phone action bar, the grouped "Plan ahead" menu/sheet and their states, in the app's
tokens under the scratch `vn-` prefix.
**Companion report** (full rationale, method, evidence, review record): the scout report in the
firstmate data directory (`data/villa-nav-design-lavish/report.md`).

**Captain's approval (2026-09-17), verbatim:** *"ok im good please implement that"* — the design as
presented was approved, i.e. the recommended option for every question:

| # | Decision | Approved option |
|---|---|---|
| D1 | What the page links say | **A** — short labels (`Home · Services · Plans · Lots · Park · Contact`) + grouped "Plan ahead" menu carrying the client's full names |
| D2 | Where the cart lives | **A** — a cart icon with its count beside Sign in, never a text link among the pages |
| D3 | The phone bottom bar | **A** — permanent, `Call 24/7` + `Plan ahead`, with the existing full-menu button above it |
| D4 | Utility row colour | **A** — neutral near-white, the sky-blue call button as its only colour |
| D5 | What scroll does | **A** — quiet compression (shorter main row, more opaque, soft shadow), **never auto-hiding** |

> **Do not redesign on the way in.** The artifact is the reference. A deviation is the captain's
> call, not the implementer's.

---

## 1. What the bar is for, and who reads it

The public navigation serves a family at the worst moment of their life, often on a phone, often
once. It must answer two questions before anything else: **"where is what I need"** and **"can I
reach a human right now"**. Today one 68 px row carries everything — the brand, seven wide labels,
a small phone chip and the sign-in — which works at 1440 and breaks on a phone (see §3).

The approved design gives each job its own row and its own size, moves the cart out of the label
row, and keeps the client's own full page names one tap away instead of shortening them in place.

## 2. The approved design (the bar's spine)

- **Two layers.** A slim utility row carries the trust facts — *Isabela City, Basilan · every hour,
  every day* — and the 24/7 number as a real call button (sky-blue, navy ink, ≥44 px). Below it the
  main row carries the brand, the page links, a quiet **Sign in** and the **cart icon + count**.
- **Short words, full names.** The bar's chips are the short unmistakable words (D1); the client's
  full names — *Funeraria Memorial Services*, *Villa Memorial Plan*, *Villa Memorial Park* — stay
  verbatim as the page headings and in the grouped **Plan ahead** menu (and the phone sheet).
- **Active page.** A gold underline plus a weight change, keeping `aria-current="page"` — never
  colour alone.
- **Scroll life.** After ~24 px the main row compresses (68 → 56 px desktop, 116 → 108 px phone
  total), the sheet goes more opaque and takes a soft shadow. The utility row and call button stay;
  the bar **never auto-hides**.
- **Phone.** A permanent bottom action bar with two big targets — **Call 24/7** (a real `tel:`
  link) and **Plan ahead** (a dialog-style sheet with the full names) — above nothing that moves
  under a thumb. The full menu (MobileQuickMenu) keeps the complete link list and sits above it.
- **Accessibility as a feature.** A skip-to-content link is the first focusable; focus rings stay
  visible; every target reaches 44 px (bottom-bar buttons 48 px); the sheet is a real
  `role="dialog"` with `aria-modal`, Escape closes and focus returns; contrast is AAA where
  measured.

## 3. Before → after, measured

Measured with Chrome DevTools at 1440 × 900, 390 × 844 and 320 × 800 against the live app and the
proposal (raw JSON lived in the scout workspace; the artifact's §06 shows the tables).

| Measure | Before | After |
|---|---|---|
| Header height (desktop ≥ 75 rem) | 69 px, one row | 122 px (two rows) → 110 px scrolled |
| Header height (phone) | 69 px | 106 px → 98 px scrolled |
| Nav links | 36.1 px tall | 44 px |
| Sign in | 36.1 px tall | 44 px |
| 24/7 number | 43.1 px chip, top-right | 45.4 px call button (desktop); 48 px bottom-bar button (phone) |
| Cart | "Cart" text link among pages | 44 × 44 icon + count badge |
| Horizontal scroll at 390 / 320 | none | none |
| **Sign in vs brand at 390** | **68 px overlap** (Sign in painted over the wordmark) | none |

Contrast (computed from the token values): utility text `navy-700` on near-white **10.08:1**; call
number `navy-950` on the sky-200→sky-400 gradient **13.12 → 8.18:1**; call label `navy-900`
**11.34 → 7.07:1** — all AAA. Cart count `navy-950` on gold **11.09 → 6.66:1** (AA+).

## 4. What was implemented (build spec)

| File | What it does |
|---|---|
| `components/landing/site-header.tsx` | The one bar, two rows: utility row (location · hours + call button), main row (brand · short links · grouped `Plan ahead` · Sign in · cart icon + count), skip link. `SITE_NAV_LINKS` is the approved short list; `PLAN_AHEAD_LINKS` carries the full names. Stays framework-free (plain `<a>`/`<button>`, no router) for the node tests and the staff editor. |
| `components/landing/header-behavior.tsx` | Client-only, renders nothing: scroll compression (after 24 px, never hides) + the Plan ahead disclosure (click, Escape, outside click). |
| `components/landing/phone-action-bar.tsx` | Client-only: the permanent phone bar (`Call 24/7` + `Plan ahead`) and the `role="dialog"` sheet with the full names; Escape/backdrop close, focus returns to the trigger. |
| `components/ui/public-shell.tsx` | Mounts the phone bar on every `(public)` page, adds `id="main"` for the skip link, wraps the page as `has-phonebar` so the fixed bar never covers content. |
| `components/landing/landing-view.tsx` | The home renders the same bar + phone bar, `id="main"` and `has-phonebar` — the nav is identical on the home and the interior pages. |
| `styles/components.css` | The two-layer `anchored-header` block (utility row, call button, compressed state, grouped menu, cart badge, active underline), the `anchored-phonebar` + `anchored-plan-sheet`, the skip link, and `--anchored-header-h` — the one height every sticky surface under the bar reads (home rails, `/services` in-page nav, anchor offsets). |
| `tests/unit/public-nav.test.tsx` | Pins the approved bar: utility row with the client's real number/location, short labels + `aria-current` on the current page only, full names inside Plan ahead, cart icon + count, skip link first, the phone bar's two targets. |
| `tests/unit/landing-view.test.tsx` | The home's chrome test now asserts the approved short labels and the full names inside the Plan ahead menu (footer unchanged). |

**Nothing else moved:** page content, prices, products, the map (both modes), the cart and the
quick menu are untouched; the navigation is the only diff. On phones the call button moves from the
header into the bottom bar — the number is never shown twice.

## 5. Review record

| Round | When | What happened |
|---|---|---|
| Construction | 2026-09-17 | Plan written; bar, bottom bar, menu, sheet and states built in the app's tokens; captures at 1440 / 390 / 320; contrast + target sizes measured; D1–D5 prepared. |
| Round 1 | 2026-09-17 | Session served to the captain (before/after, label options, states, evidence, D1–D5). |
| Decision | 2026-09-17 | **Approved verbatim**: "ok im good please implement that" — the design as presented, all recommended options (D1–D5 = A). No element annotations were queued; the session was closed by the worker after the approval. |

## 6. Files here

```
docs/08-delivery/public-nav-design/
├── README.md                 this contract
├── index.html                the approved Lavish review (plan · before/after · states · D1–D5)
├── nav.css                   the proposed bar — tokens-only reference, vn-* prefix (scratch)
├── nav-core.js               the proposed markup + behaviour reference (scratch)
├── review.css, artifact.js   review-surface chrome only — not product CSS
├── tokens.css, base.css, components.css, utilities.css
│                             review-time snapshots of styles/* (frozen so this artifact renders
│                             exactly as reviewed; the live files are styles/*)
└── shots/                    the captures the artifact shows (before/after, states, crops)
```

The production implementation supersedes `nav.css`/`nav-core.js`: the live rules are the
`anchored-header` / `anchored-phonebar` / `anchored-plan-sheet` blocks in `styles/components.css`,
and the live components are the `components/landing/*` files in §4.
