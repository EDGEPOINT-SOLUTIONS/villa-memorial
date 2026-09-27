# Art direction — the measured audit and what it changed (2026-09-27)

**Brief:** *"I am not happy with all the UI/UX design of this project. Tell me how you would do
it if you would be the best designer in the world."* Direction chosen with the captain:
**memorial care first** — retail browse grammar only where browsing is genuinely deliberative
(`/lots`, `/products`, `/price-list`), and a production audit driven by a real browser rather
than a review of archived screenshots.

This record is the measurement, the corrections, the fixes, and the standing rules. It follows
the design-record convention (`docs/README.md` §2): the record lands with the work.

**The binding brief is [`ART-DIRECTION.md`](ART-DIRECTION.md)** — the thesis, the kill list and
the six page archetypes. Read that first; this file is the evidence behind it.

---

## 1 · How it was measured

Two reusable harnesses, both committed under `scripts/design-audit/`:

| Script | What it does |
|---|---|
| `audit.mjs` | Crawls the running app for real links (183 discovered), then visits **205 routes × 2 viewports = 410 captures**. Per capture: full-page screenshot, WCAG AA contrast, tap-target sizes, gradient elements, accent (gold/brass) density, horizontal overflow, `h1` count/levels, images without `alt`, type below the 12px floor. Signs in per persona through the real BFF (`POST /api/auth/login`), so gated routes are captured as the signed-in surface. |
| `typography.mjs` | Every route's rendered `h1`/`h2`/`h3` sizes vs the role map `styles/tokens.css` declares as settled. |
| `focus.mjs` | The **keyboard path**: up to 30 real `Tab` presses per route (96 routes), recording the first stop, whether it paints a visible focus indicator, whether it lands on a zero-box element, and how many presses it takes to reach `#main`. |
| `color-fingerprint.mjs` | The resolved colour of 13 painting properties for **every element** on 9 representative routes — run before/after a token refactor to *prove* it changed nothing visible. |

Output: `.design-audit/summary.md`, `report.json`, `typography.md` (gitignored).

**Two bugs in the harness itself, found and fixed — worth recording because both produced
confident, wrong numbers:**

1. `browserContext.newPage()` **ignores** `viewport`/`isMobile` — those are context-level options.
   The first run captured "phone" and "desk" as byte-identical PNGs at the default 1280px.
   Fixed with one context per (persona × viewport).
2. `typography.mjs` never signed in, so ~70 gated routes were captured as their **sign-in card**
   and produced 70 bogus "h1 = 28px" findings. Fixed; the clean run is 126/133 h1s at 36px.

**A production build is mandatory for this class of audit.** `next start` on a `next dev`
build hides the defect in §3.1 completely.

---

## 2 · What held up (measured, and better than most funded products)

This matters as much as the defects — the instinct to "fix the design system" would have broken
the strongest part of the codebase.

| Check | Result |
|---|---|
| Font sizes not on the token ladder | **0 of 836** declarations (all `var(--…)`) |
| Text below the 12px floor | **0 across 410 captures** |
| Routes with no `h1` | **0** |
| Routes with more than one `h1` | **0** |
| Images without `alt` | **0** |
| Horizontal overflow | **2** of 410 (16px and 7px) |
| `h1` at the declared 36px | **126 of 133** (the 7: 3 documented 40px public heroes, 4 sign-in cards) |
| Genuine flat-background contrast failures | **0** |
| Tab stops painting NO visible focus indicator | **0 of 96 routes** (the one focus ring works) |
| Tab stops landing on a zero-box element | **0 of 96 routes** |
| Skip link as the first Tab stop | **all** public and portal routes; the 4 sign-in pages correctly start at the email field instead |

The family/agent portal UX writing is the best thing in the product
(*"Nothing else needs you today"*, *"Anything that is not here is ours to carry, not yours"*).

---

## 3 · What was actually wrong

### 3.1 · `/price-list` was dead in production — HTTP 500 on every request

The single worst finding, and invisible to `next dev` **and** to all 2,654 unit tests.

`app/(public)/price-list/page.tsx` is a **Server Component**. It passed
`sheetAction={{ label: "Show the price list", onClick: () => {} }}` into `ListingShell`, which is
`"use client"`. A function cannot cross the server→client boundary; React refuses to serialise it
and the whole route 500s:

```
Error: Event handlers cannot be passed to Client Component props.
  {label: ..., onClick: function onClick}
```

The three sibling listings (`lot-listing.tsx`, `products-listing.tsx`, `gallery-listing.tsx`) pass
the same shape and are all fine — because **they** are client components; the object never crosses
the boundary.

**Fixed** by removing the prop. It was never needed: `ListingShell`'s own contract says a nav rail
closes its phone sheet on the anchor's `hashchange`, and `/price-list`'s rail *is* a `ListingNav`.
Verified: `HTTP 200`, 145,759 bytes rendered (was 500 on both viewports).

**Why it survived, and the two guards added for it:**

- **`/price-list` had no row in the living route index**
  (`docs/08-delivery/notes/demo-web-route-coverage.md`), so the route-by-route check that note
  exists to drive never opened it. It was nevertheless in `PUBLIC_PAGES` at `priority: 0.9` and in
  the live `sitemap.xml` — the site was telling search engines to crawl a dead page at the
  second-highest priority on the site. Row added.
- `tests/unit/seo.test.ts` asserts a public page is **listed** in `PUBLIC_PAGES`; nothing asserted
  it **renders**. New `scripts/smoke-public-routes.mjs` (`npm run smoke`) reads the live
  `sitemap.xml` and requests every advertised URL against a **production** build, failing on a
  non-200 or a suspiciously small body. It reads the sitemap rather than `lib/seo.ts` on purpose:
  the sitemap *is* the promise the site makes, so no import can drift. Current run: **60/60
  advertised routes render.**

### 3.2 · The public **call controls** carried the sheen the composition pass removed elsewhere

The client's president had already called the product *"so generic"* and *"so noticeable that it's
built by AI"*, and the 2026-09-18 composition pass measured the cause (30–42 gradient elements per
public page) and flattened `.btn--accent` and `.btn--primary`.

But that pass checked a **hand-picked selector list**, and it explicitly declared
*"the remaining gradients are the ones with a job"*. Three public controls were never in the list
and never had a job:

| Selector | Where a family meets it | Treatment before |
|---|---|---|
| `.anchored-phonebar__btn--call` | the fixed bottom bar's **Call 24/7** — the emergency tap | `linear-gradient(180deg, sky-200, sky-400)` |
| `.quick-call` | the call card inside the phone flyout | `linear-gradient(135deg, sky-700, sky-900)` |
| `.quick-menu-fab` | the floating menu button | `linear-gradient(135deg, gold-300, gold-500)` + glow |

Found on **59 captures each** — the most repeated decorative gradient in the product, sitting on
the highest-stakes controls in the product. Root `AGENTS.md` already forbids it (*"never re-add a
decorative gradient or `--shadow-card-rest` to a public band or button"*); the guard simply did not
cover these three.

**Fixed** — flat fills (`.btn--primary`'s `--sky-300` treatment; `--sky-800` for the deep call card;
`--gold-400`, the fill `.btn--accent` converged on). The fab keeps its shadow: a fixed fab genuinely
floats, which the composition pass allows. Gradients across the stylesheet: **34 → 31**. Gold/brass
references: **149 → 148**.

**Guarded, and the guard was proven non-vacuous** — it fails on all three against `HEAD` and passes
after:

```
--- BEFORE (HEAD) ---
  GRADIENT -> guard FAILS  .quick-call                  (308 chars matched)
  GRADIENT -> guard FAILS  .quick-menu-fab              (479 chars matched)
  GRADIENT -> guard FAILS  .anchored-phonebar__btn--call (160 chars matched)
--- AFTER  (working tree) ---
  flat     -> guard passes  …all three
```

### 3.3 · Internal CRM vocabulary on a grieving family's homepage

`components/landing/landing-view.tsx` rendered `<span className="rail-lead-flag">Lead</span>` on
the public home — the rail's featured tile. The internal concept is `item.featured`; only the
visible word said "Lead", which on a funeral home's homepage reads as a sales lead.

**Fixed** → **"Featured"**. That is also the *honest* word: the flag is a staff editorial choice,
where "Popular"/"Most chosen" would claim data the office has not recorded
(`components/kit/README.md`, honest data only). No test pinned the string; the class name
`rail-lead-flag` is unchanged.

### 3.4 · Two names for one colour — collapsed, and one runtime read nearly broke it

`--brass-300/400/500` carried the **same hex** as `--gold-300/400/500`, and `--brass-600` the same
hex as `--gold-700`. Both ramps were live in `components.css` (31 call sites between them), so
nothing told a reader which to reach for — and `tokens.css` claimed the `--gold-*` family was
*"consumed ONLY by the .app-shell premium rules"*, which was false by 60+ usages.

**Collapsed to the one `--gold-*` ramp**: 31 call sites renamed in `components.css`, the three
`--color-accent*` roles repointed, the `--brass-*` primitives deleted, and the stale comments
corrected (including the dead `brass-` alternates in `typography-system.test.ts`'s gold-as-text
guard).

**The near-miss worth recording.** `components/parks-canvas.tsx` read the token **at runtime** —
`cssToken("--brass-500", "#a8873f")` — to paint the selected plot's outline on the park map.
Deleting the token would not have failed any test; it would have silently fallen back to
`#a8873f` and changed the map's selected colour. A grep for the *name* found it; a search for
`var(--brass-` would not have. There are only **6** runtime token reads in the whole app, all in
that file, and all 6 now resolve.

**Verified visually neutral, not assumed:** `color-fingerprint.mjs` recorded 13 painting
properties for every element on 9 routes — **5,854 elements, 0 differences** before vs after.

### 3.5 · Three sources of truth disagree, so every new session re-decides

| Source | What it says | Status |
|---|---|---|
| `docs/02-architecture/design-system.md` | *"serif headings"*, Iowan/Palatino/Georgia, `app/assets/stylesheets/*.css` | **Describes the retired Rails app and a type system replaced twice.** Platform-owned (`docs/README.md` §1) — not editable here, but `docs/README.md` §5 still lists it as "the token rules" |
| `styles/tokens.css` | Inter only; a debate log carrying ≥3 reversals of the background policy | Current, but argues with its own past |
| Shipped `components.css` | 21,853 lines; overrides tokens.css in places | The real authority |

The duplicate `--brass-*` ramp this section used to flag is now **collapsed** — see §3.4. What
remains is the platform snapshot, which is out of bounds to edit here.

### 3.6 · The design-review archive shows a product that no longer exists

353 screenshots under `docs/08-delivery/**/shots/` render headings in a **serif**. The live app
renders Inter everywhere (`--font-serif` and `--font-sans` both resolve to Inter; verified against
the running build). Those PNGs predate the Inter pass and are the input most reviews have used.
Reviewing them is how "the drift" keeps getting reported and re-fixed.

---

## 4 · The hypotheses the measurement killed

Recorded because a design review that only confirms itself is worthless. **Four** of my own
claims did not survive contact with a browser — including two I had already stated as findings.

**"The type role map has drifted."** *Wrong.* `typography.mjs` first reported 73 h1s and 165 h2s
"off the map". The h2/h3 majority is **intended**: `AGENTS.md` explicitly blesses promoting a tag
for document outline while keeping the ladder size (`class="text-lg"`, `.anchored-footer__col-title`
at 14px, `.capture-section__title` at 22px), and the home deliberately scopes its display roles down
inside `.anchored-page` (section heads 22px, card titles 18px). The role map governs **named role
classes**, not the `h2` tag. There is no drift to fix.

**"Accent inflation — gold is the loudest thing in the product."** *Overstated, and now explained.*
The raw stylesheet count (148 references, the largest colour family — 149 before this pass) is real,
and the worst page measured **118** accent-painted elements. But breaking that 118 down by class
(`/products`, desk) shows what it is:

| Carrier | Count | Verdict |
|---|---|---|
| `btn` — the per-item gold "Add to cart" | 24 (one per casket) | **The approved 3-rung CTA grammar** (`btn--primary` page commitment · **`btn--accent` per item** · `btn--secondary`), not inflation |
| `shop-card__eyebrow` — one collection label per card | 24 | A consistent brand device |
| `public-hero__eyebrow`, `section-head__kicker`, `ledger__eyebrow` | a handful | The same device at page/section level |
| `anchored-footer*`, `next-steps*` | the closing band + footer chrome | Every public page carries it; the median accent count per capture is **6** |

So the accent is not indiscriminate — it is *systematic*. The one refinement worth a captain's eye
is that a catalogue card carries three gold-touched elements at once (eyebrow + action + two
`catalogue-actions__link`), which is the difference between a deliberate grammar and a warm page.

**"Contrast failures on `.paper-hero`."** *False positive.* All 18 flagged items sit on a gradient
or photograph the probe cannot resolve; genuine flat-background failures: **0**.

**"The home's side rails are dead space for most of a 4,000px scroll."** *Wrong, and I asserted it
twice before measuring it.* The rails are `position: sticky` — at 1440 the page is 4,996px, the
middle column 790 × 4,213px, and both 272px rails carry 731/811px of content pinned in view. The
help card and the quick actions follow the reader the whole way. There was no defect here. The
lesson is the same one the harness exists to teach: a claim about layout that has not been measured
in a browser is a guess wearing a finding's clothes.

---

## 5 · What needs a decision (deliberately not changed here)

| Item | Why it is not mine |
|---|---|
| **The brand name is three names.** `lib/seo.ts` `SITE_NAME` and the landing `wordmark` say **"Villa Funeraria"** (7 occurrences) while 48 say **"Villa Memorial Park"** and 179 say bare **"Villa Memorial"**. One page shows two of them. A rename landed in 7 places. | Copy/identity decision, client-facing |
| **The home hero keeps one decorative gradient** — a radial gold glow (`radial-gradient(520px at 96% -6%, gold-300 16%, …)`) on `.hero-home--photo`. The only one left on a public band (2 `.brand-mark` monograms are the documented exception — "the brand mark's mask"). | The hero is captain-reviewed and staff-editable |
| **The public home's three-column shell.** Captain-approved and test-pinned, so not changed — and **measured, it holds**: at 1440 the page is 4,996px, the middle column 790 × 4,213px, and both 272px rails are `position: sticky` (731/811px of content), so they stay in view the whole scroll. The "dead space" claim in an earlier draft of this record was an unmeasured assertion and was wrong. | Captain-pinned structure; measured and left alone |
| **Tap targets.** 204 of 205 phone captures contain something under 44px; 93 contain something under 24px. But the project's stated standard exempts dense link lists via WCAG 2.5.8 spacing, and the largest cluster is the footer link columns (17px tall). | Advisory at 44px, not a defect — needs a stated standard, not a sweep |
| **`docs/02-architecture/design-system.md`** describes the retired Rails app and a serif system, yet `docs/README.md` §5 points readers to it as the token rules. | Platform-owned snapshot — a refresh/ask, not an edit |

---

## 6 · The standing rules this pass adds

1. **A guard is written against a ROLE or a CAPABILITY, never a hand-picked selector list.** The
   composition pass's list is exactly why the *call* controls kept their sheen for months while the
   *accent button* was clean. When you write "no decorative gradient on a public control", enumerate
   the controls, or match the category.
2. **Verify a guard is not vacuous.** Run its check against the previous revision and confirm it
   fails. A guard that has only ever passed proves nothing.
3. **A production build plus a real HTTP request is part of design QA.** The worst defect in this
   audit — a dead public page — passed `next dev`, `tsc`, `lint`, and 2,654 unit tests.
4. **Art direction is decided once and enforced at the seams.** This project's direction has never
   been the problem; it is documented and largely test-pinned. The failures are all *scope* failures
   — each rule written against the selector in front of it — and they land on the highest-stakes
   surfaces. Spend the design budget on enforcement coverage, not on a new palette.
5. **Delete the decision you replace.** Two rules now contradict each other about `.ag-hero` in one
   file — `components.css` line 14535 says *"the page header is type, not a box"* and its rule at
   14538 sets `padding: 0`; then at 21797, six thousand lines later, `.public-hero, .page-header,
   .ag-hero` wraps it in a card with a border, radius, padding and a gold hairline. The later append
   wins by cascade order and the earlier comment survives as a lie.

---

## 7 · Verification

- `npm run lint` → clean. `npm run typecheck` → clean.
- `npm test` → **228 files, 2,654 tests, all pass** (including the widened gradient guard).
- `npm run build` → compiled successfully.
- `npm run smoke` → **60 of 60 advertised routes render.**
- `/price-list` → `HTTP 200`, 145,759 bytes (was `HTTP 500` on both viewports).
- Gradient elements on public **call controls** → **0** (was 59 captures each).
- Public home rail badge → reads `Featured`.
- Focus order → **0** stops with no visible focus indicator, **0** zero-box stops (96 routes).
- Token collapse → `color-fingerprint.mjs`: **5,854 elements, 0 colour differences.**
- Runtime token reads → **6 of 6 resolve** (all in `parks-canvas.tsx`).

### Evidence (`shots/`)

- `home-390-bar.png` — the phone action bar: `Call 24/7` in flat sky.
- `home-390-flyout.png` — the flyout: the call card in flat deep sky.
- `home-390-full.jpg`, `immediate-assistance-390-full.png` — full phone pages (JPEG, the
  composition-pass convention: a 5 MB full-page PNG is not a shot, it is a repo tax).
- `home-1440-featured-rail.png` — the rail tile reading **Featured**.

### The binding brief

[`ART-DIRECTION.md`](ART-DIRECTION.md) — the one-page thesis, the kill list and the six page
archetypes, with every route mapped to one of them. This README is the evidence behind it.
