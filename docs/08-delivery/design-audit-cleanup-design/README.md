# Design-audit cleanup — the tool that could not run, the bug it hid, and a measured prune

**Date:** 2026-09-28 · **Owner:** front end (`web`) · **PR:** `fm/dead-css-prune`

Three things came out of running the repo's own design audit for the first time in this repo's
current state. In order of consequence:

1. **The audit toolchain could not run at all** — it read a file nothing produced. Fixed, so the
   chain is self-sufficient on a clean checkout.
2. **A real phone bug had shipped unseen** because of (1): `/staff/dashboard` scrolled 92px
   sideways at 390. Fixed, with a guard.
3. **The dead-CSS pruner was itself unsafe**: its verifier was weaker than its pruner, and its
   parser mis-read comments. Both fixed; the prune then ran and removed **8.2%** of
   `styles/components.css` with **zero** lost runtime selectors.

---

## 1 · `routes.json` was a phantom artifact

`audit.mjs`, `css-coverage.mjs`, `focus.mjs` and `typography.mjs` all read
`.design-audit/routes.json`, an artifact **nothing in the repo produced** (and `.design-audit/` is
gitignored, so it could not even be committed). On a clean checkout the four tools died at their
first read — a tool that cannot run is not evidence, and the whole design-audit folder had quietly
stopped working.

**Fix:** `scripts/design-audit/routes.mjs` **derives** the static route list from the App Router
tree (`app/**/page.tsx`, route groups collapsed, dynamic segments kept for the callers to filter).
The four tools import `staticRoutes()` ; the file dependency is gone. It derives **131** static
routes across all five portals; the crawl adds the 195 linked dynamic routes.

## 2 · The bug that shipped unseen — `/staff/dashboard` +92px at 390

The first successful audit (218 routes × 2 viewports) found exactly one horizontal overflow:

```
/staff/dashboard  phone  →  92px past the viewport
```

**Root cause.** `AlertRow` (`app/(staff)/staff/dashboard/payment-alert-band.tsx`) renders
`<li class="row row--space">` around a `<span class="row nowrap">`. With `white-space: nowrap` that
run (due date + amount + badge + countdown) has a **434px min-content**; `.row` does not wrap and
the alert's own flex child carries `min-width: auto`, so it can never shrink below 434 — the page
gained 92px of sideways scroll. `.app-main` gives the band a 300.4px box at 390.

**Fix** (scoped, phone-only, tokens-only — in the band's own block at the tail of
`styles/components.css`):

```css
@media (max-width: 40rem) {
  .payment-alerts__list .row { flex-wrap: wrap; }
  .payment-alerts__list .nowrap { white-space: normal; }
}
```

**Guard:** `tests/unit/dashboard-payment-alerts.test.tsx` asserts both declarations exist in a
`max-width: 40rem` block, so the measured bug cannot come back silently.

**After:** the audit reports **Horizontal overflow (0)**.

### The rest of the audit was already clean

| Check | Result |
|---|---|
| Routes that did not render | **0** |
| Type below the 12px floor | **0** |
| More than one `h1` / no `h1` | **0** / **0** |
| Images without `alt` | **0** |
| Gradient on an interactive element | **0** |
| WCAG AA contrast | 4 captures, **all `.paper-hero__*`** |

The `.paper-hero` flags are the **documented false positive** (navy paper-hero band over a
gradient/photo the probe cannot resolve; `docs/08-delivery/art-direction-design/README.md:225`,
`portal-restyle/README.md:481`). No action.

## 3 · The pruner was unsafe in two ways

### 3a · The verifier was weaker than the pruner

`prune-dead-css.mjs` checked its own output by **substring of the raw text**. That cried wolf:
an emptied `@media (max-width: 88rem)` block takes its prelude with it, and two selectors that
merely sat next to each other read as one "lost selector" — **20 false alarms** on a prune that
removed none of them.

**Fix:** the parser moved to `scripts/design-audit/css-parse.mjs` (one home, shared by
`dead-css.mjs` and `prune-dead-css.mjs`), and the invariant now compares real **selector sets**
(the squashed comma-parts), which is exact: the prune only ever removes a rule whole.

### 3b · The parser mis-read a comment (a real, data-losing bug)

Fixing the verifier exposed the truth behind some of those 20 flags: a "candidate rule" whose
selector was **comment prose** (`the figure keeps the capped body+1 rung…`) with a
**3,304-byte span that swallowed three live rules**.

**Root cause.** The scanner skipped comments on its *forward* pass, but recovered each rule's
selector by scanning *backward* from its `{` to the nearest `;`, `{` or `}` — and the backward
walk knew nothing about comments. The comment above the phone block at line 21542 contains a `;`,
so the captured "selector" began **mid-comment** (no `/*`), the strip regex could not remove it,
and `@media` was no longer recognised as an at-rule. The block became one giant "rule".

**Fix:** `maskComments()` blanks every comment **preserving length and newlines**, so byte offsets
still address the original text and no selector can ever contain comment characters. This removes
the class of bug, not the instance.

## 4 · The prune, measured

```
rules to delete        : 313
bytes removed          : 46,771 of 573,864 (8.2%)
lines                  : 23,134 -> 21,633
empty @media removed   : 18
runtime-used selectors : 1762
  of which this file owns: 1621
  ...that would be LOST  : 0
INVARIANT HOLDS: every selector matched at runtime survives the prune.
```

The pipeline is two-signal by construction: a rule is deleted only when it was **never matched at
runtime** across 218 routes × 3 viewports **and** no class name in it appears anywhere in
`app/`, `components/`, `lib/` or `tests/`. A `:hover`, `[aria-expanded]` or error-state rule fails
the first signal and is kept; a dynamically-built class name fails the second and is kept.

The retired services page's `.sv-*` block was the biggest single contributor: dead `.sv-*` classes
fell **69 → 31**. The remaining 31 are pinned by test/doc guards that still list them as shipped
surfaces (the reason `check-sv-classes.mjs` exists) — a conservative keep, not a miss.

## 5 · Verification

- **Unit suite:** `2,746 passed` (incl. the new guard) — `npm run lint`, `npx tsc --noEmit` clean.
- **Production build** passes; **smoke** 61/61.
- **Re-audit against the pruned production build:** overflow **0**, render failures **0**, and
  only the documented `.paper-hero` contrast flags remain.
- **The prune's own invariant** is the direct proof nothing live was removed: `...that would be
  LOST: 0` before it wrote. The CSS-declaration gates in the unit suite (typography, phone-layout,
  broken-pages, composition-pass, page-backgrounds, public-layout) stay green, and every selector
  the tests name is kept by the second signal (`tests/` is scanned).
- **Coverage re-run, completed.** `css-coverage.mjs` could itself hang (see below); once its sweep
  was bounded it finished all 654 loads and re-classifying the pruned stylesheet against the fresh
  coverage returns **0 deletion candidates** with `...LOST: 0` — the prune left nothing dead and
  removed nothing live.

### A note on the tooling

`css-coverage.mjs` awaited `res.text()` inside a `page.on("response")` handler and then awaited
`page.close()` **outside** its try/catch; a response that never finished streaming stalled the
sweep at 300/654 with nothing to bound it. Every await in the sweep is now bounded (a per-route
`withTimeout`, a bounded `close`, a fire-and-forget handler) and a route that will not cooperate is
**skipped and named** rather than silently ending the run — a tool that stops without saying so is
worse than one that reports what it could not measure.

## Files

| File | Change |
|---|---|
| `scripts/design-audit/routes.mjs` | **new** — derives the static route list from the app tree |
| `scripts/design-audit/css-parse.mjs` | **new** — the shared parser + `maskComments` + `selectorParts` |
| `scripts/design-audit/{audit,css-coverage,focus,typography}.mjs` | use the derived route list |
| `scripts/design-audit/{dead-css,prune-dead-css}.mjs` | share the parser; set-based invariant |
| `styles/components.css` | phone wrap fix for the payment-alert band; 313 dead rules pruned |
| `tests/unit/dashboard-payment-alerts.test.tsx` | guard for the phone wrap fix |
| `CONTINUATION.md` | stale burial/edit-delete and `demo-inquiry-captures` notes corrected |
