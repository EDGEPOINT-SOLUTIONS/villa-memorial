# Portal restyle — the agent and family portals

> ## ⚠ THIS WORK IS NO LONGER IN THE STYLESHEET
>
> **Read this before trusting anything below.** The CSS this record describes was written into
> `styles/components.css` and then **destroyed later the same day**, during the `/services` redesign.
> The cause, in full, is §8 of
> [`docs/08-delivery/services-redesign/README.md`](../services-redesign/README.md): a PowerShell
> `Get-Content -Raw` / `Set-Content -Encoding UTF8` round-trip double-encoded the file, a hand-written
> reversal made it worse, and the `git checkout HEAD` that fixed the encoding also discarded the
> session's uncommitted work — this restyle among it.
>
> **What came back:** the parts a guard or the audit could see. The full test suite is green and the
> audit is clean across 208 routes × 2 viewports, including the portal contrast that a stale run had
> reported at 1.99:1.
>
> **What did not:** everything the audit cannot measure — that `.ag-list--grid` two-ups a list, that
> `.ag-kv` lost the UA `dl` margin, that a portal band has the right padding and ground. The audit
> sees overflow, text size, contrast, gradients and alt text; it cannot see composition.
>
> So this record is now **a specification to re-derive from**, not a description of shipped code. The
> measured before/after tables below are still good evidence of what the work achieved and what it
> should achieve again. The declarations are gone.

> Captain, 2026-09-27: *"the structure of everything in ui/ux how everything looks and position
> redo it all for all the pages including the agent and family portal, they look so suck. we have
> to restyle everything"*

The agent portal (11 routes) and the family portal (14 routes) had **never been through a design
pass**. This records the first one, and it starts from measurement rather than taste.

## 1 · The baseline, measured

`scripts/design-audit/portal-recon.mjs` captures every portal route and records the opening band in
use, the `h1`, the type steps actually painted, the container width and the signature.

| Finding | Before |
|---|---|
| Opening band | **`.ag-hero` on 25 of 25 routes** — one legacy band, zero use of the settled primitives |
| The signature (prompt 07) | **0 of 25** — the whole portal layer had none |
| One `h1` per route | 25 of 25 ✓ |
| Text under the 12px floor | 0 ✓ |
| Horizontal overflow | 0 ✓ |

So the portals were not *broken*. They were structurally uniform and **entirely outside the settled
language** — which is what "they look so suck" describes.

## 2 · The root cause: a stale decision, not bad taste

`components.css` painted the portal frame, the sidebar **and** the content all as
`--color-bg-surface-raised`:

```
div.portal-frame    = rgb(255, 255, 255)   1440 x 2318
main.portal-content = rgb(255, 255, 255)   1229 x 2318
aside.portal-sidebar= rgb(255, 255, 255)    211 x 1000
section.ag-hero     = rgb(255, 255, 255)    794 x  350
body                = rgb(250, 247, 242)   <- the warm ground, hidden
```

The comment explaining it is honest and dated:

> *Captain (2026-09-25): the agent + family portals get the same white-ground treatment as every
> other surface — the light-sky rail/content wash read as a template … every ground is white.*

That was written when the page ground **was** a pale wash, so "every ground is white" meant "stop
washing the screen". The token rebuild has since made `--color-bg-page` a warm bone and
`--color-bg-surface-raised` pure white — so the same declaration turned the portals into the **only**
surfaces in the product with no ground at all, and left the opening band (also white) with no
contrast to sit against. A designed band read as a faint outlined rectangle.

**The decision was re-applied, not reversed.** Same intent — no wash, not a template — fulfilled
against the current palette: the ground is the product's ground, and the surfaces that should read
as *raised* are the white ones.

| | Before | After |
|---|---|---|
| `.portal-frame` ground | `#ffffff` | `--color-bg-page` (warm bone) |
| `.portal-content` ground | `#ffffff` | `--color-bg-page` |
| `.portal-sidebar` | `#ffffff` | `--color-bg-surface` (a raised panel) |
| Opening band contrast | white on white | white on warm ground |

## 3 · Two structural defects found on the way

**The content column was not using the room.** Measured: the inner column painted **794px inside a
1229px content area** — the same ~134px of dead space on *both* sides, because `62rem` at the 80%
root is 819px while the shell is 1229px wide, and it was centred. It now uses
`--layout-catalogue-w` (the public grammar's own envelope for a browsable surface) and is aligned to
the content gutter rather than centred, like the Admin Portal's `.app-main`. The portals looked
cramped for a reason that had nothing to do with taste.

**`.ag-hero` was declared twice with opposite instructions.** One rule said `padding: 0` under the
comment *"the page header is type, not a box"*; the shared opening band further down the file sets
`padding: clamp(1.5rem, 3vw, 2.25rem)` and dresses `.public-hero`, `.page-header` and `.ag-hero`
together. The band wins, so the `padding: 0` was dead — and a dead declaration that contradicts a
live one is exactly the "one class, one declaration" trap `AGENTS.md` records
(`.chapel-month` vs `.chapel-grid`, `.tier-row`). The band states the surface now; the hero rule
owns only colour.

## 4 · The signature, restored

The margin rule (UI-guide prompt 07) lived only on the public `.section-head__kicker`. The portals'
equivalent section head is `.ag-h2`, so it was the one working surface in the product with no
signature. It now carries the same brass rule.

**24 of 25 routes paint it.** The exception, `/client/privacy`, has a single section and no band
head — recorded rather than forced.

## 5 · Evidence

| Check | Result |
|---|---|
| Portal routes with the signature | **24 of 25** (was 0) |
| Portal routes on the warm ground | **25 of 25** (was 0) |
| One `h1` per portal route | 25 of 25 |
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npm test` | **228 files, 2,650 tests pass** |
| `npm run build` | compiled successfully |
| `npm run smoke` | **61 of 61 advertised routes render** |
| Full audit, 208 routes × 2 viewports | **0 routes failed** · 0 sub-12px · 0 multiple/missing `h1` · 0 images without `alt` · **contrast flags 18, ALL on gradient/photo surfaces — 0 on a flat ground** (down from 20) |

Shots: `before-agent-dashboard.png`, `after-agent-dashboard.png`, `after-family-dashboard.png`.
Recon JSON: `.design-audit/portals/{before,after-2}/recon.json`.

## 6 · The duplicate kit, collapsed

`components/agent/agent-ui.tsx` and `components/portal/portal-ui.tsx` both rendered the same
`ag-*` DOM. Four of the agent file's exports were **character-for-character** the portal kit's:

| Duplicate | The real home |
|---|---|
| `Chip` | `PortalChip` |
| `AgentHero` | `PortalHero` |
| `AgentSection` | `PortalSection` |
| `MoneyCard` | `PortalFigure` |

The only difference was the prop types — `string` here, `ReactNode` there — so the agent file was a
narrower copy of the same component. All four now delegate to the portal kit, and the names are kept
so no call site changed.

**Why this mattered more than tidiness:** two implementations of one house style is how a house
style drifts. The day someone fixes a heading's margin in `PortalSection`, the agent portal keeps
the old one, every test stays green, and the two portals quietly stop matching. That is the same
failure as a duplicated primitive anywhere else in this codebase.

`WorkItemRow` **stays** — it is genuinely the agent's own: a `workKindLabel` line, the `WORK_ICON`
map, a multi-item meta row, and the snooze control that waits on the CRM write contract.
`StageChip`, `TaskRow`, `AgendaCard`, `WeekRow` and `money` stay for the same reason.

**Proving a refactor changed nothing.** A no-op refactor has to be shown to be one, so the recon ran
again and the two runs were diffed field by field:

```
fields compared: 250   differences: 0
```

25 routes × 10 measured fields (`band`, `h1`, `h1count`, `h1cls`, `h1size`, `sections`, `cards`,
`tables`, `overflowX`, `under12`) — identical before and after.

## 7 · One product, one rhythm

The Admin Portal opened its content on `--space-6` (32px) where both signed-in portals use
`--space-7` (51.2px), and closed on `--space-8` against their `--space-9`. Measured: `/staff/ops`
painted a **32px** top pad while `/agent/*` and `/client/*` painted **51.2px** — moving between the
three signed-in surfaces shifted the first line of the page by 19px for no reason a reader could
name.

The Admin Portal is the oldest of the three; the portals were built on the settled scale, so the
staff shell moved. `--color-bg-desk` was already `var(--paper-100)` — the same warm ground as
`--color-bg-page` — so the vertical rhythm was the only real difference.

**After:** `main` padding-top is **51.2px on all six surfaces** (public, agent, family, staff), and
ground, band border, band radius, band padding and the type steps agree across every one.

## 8 · Why this project does NOT adopt a `design/DESIGN.lock.md`

The `design-intent` skill was loaded for this work (the task is UI/UX restructuring, and the project
has no `design/DESIGN.lock.md`). Its diagnosis is *correct and already proven here*:

> The failure mode this prevents is drift: five screens each with their own accent hue because the
> palette was re-invented at every prompt.

That is exactly what this record documents — two kicker classes, two portal kits, four hero
families, and a portal ground that had drifted out from under its own comment.

**But its remedy would make things worse, for two reasons.**

1. **Its procedure generates a palette.** `wb.mjs design-system "<brief>"` searches corpora and
   proposes colours and typefaces, then `tokens --init` freezes them into `design/tokens/source.json`.
   This product's palette is **not ambiguous and not ours to choose**: it is derived from the
   client's own papers, its display face is the client's letterhead face, and every value is pinned
   by `tests/unit/typography-system.test.ts` (the role→step map, one typeface, the 12px floor, a
   contrast resolver) and by `tests/unit/page-backgrounds.test.ts`. Running the generator here would
   propose a second palette and a second typeface for a system that already has one, each with a
   test that would fail it.

2. **A lock file would be a THIRD authority.** This repo already has the authority the skill is
   trying to create, and it is *stronger*: `styles/tokens.css` is declared the single source of
   truth, `lib/public-layout.ts` owns the public grammar's numbers, and both are **enforced by
   tests** rather than frozen in prose. `AGENTS.md` records the cost of competing authorities in
   this exact area — the trap where the same class is declared twice and the next reader cannot tell
   which one the product believes. Adding `design/DESIGN.lock.md` alongside `tokens.css` would
   create the drift the skill exists to prevent.

So the skill's *insight* is adopted and its *artefacts* are declined. What the project takes from it
is the discipline this record already follows: **decide once, write down why, and let a guard — not
a paragraph — enforce it.** The skill's own routing agrees: it excludes "reviewing, fixing or
scoring UI that already exists", which is what a restyle is.

## 9 · Composition: the room each screen was given

The shell was unified in the first pass; what had not been reviewed was how each screen *composes*
the room it is given. `composition-recon.mjs` measures that per route — the content interior versus
the column that actually paints inside it, the page height, the bands it stacks, and the tallest
band's share of the page.

Measured, before:

| Finding | Value |
|---|---|
| Dead space down the right of the column | **205px on every one of 23 routes** |
| `/agent/applications` | one band = **73%** of a 1933px page (1419px) |
| `/agent/new`, `/agent/clients` | one band = 73% / 74% of the page |
| Family portal | 21–40% — already well composed |

### Finding 1 — the column did not use the room (23 routes)

`--layout-catalogue-w` (75rem = 960px at the 80% root) is the public grammar's envelope for a
*browsable* surface. A portal is not a catalogue: it is tables, lists and figure strips, and those
want width. Against a 1165px interior it left 205px dead on the right of **every** portal screen.
It now uses `--layout-folio-w` — the widest envelope in the contract, which on a portal means "fill
the interior" (bounded by the shell, not the token). Prose is unaffected: `.ag-sub` carries its own
46rem measure.

**Before → after: 205px → 0px dead space, on all 23 routes.**

### Finding 2 — `.ag-kv` carried the browser's `dl` margin (a UA default is not a decision)

`CC-14-class defect · `styles/components.css`, `.ag-kv` · mechanism: the rule zeroed the margin on
the `dt`/`dd` but never on the `<dl>` itself, so every facts row silently inherited the UA's
`dl { margin-block: 1em }`.

- **Computed:** `.ag-kv` painted **27px of content inside a 53px box** — 13px above and 13px below
  every row.
- **Why it is wrong:** the mechanism, not a preference — an unreset user-agent default was spending
  vertical space no author asked for, and it compounded. `/agent/applications` showed 3 rows on each
  of 4 cards: **~312px of a 1933px page**.
- **Fix:** `margin: 0` on `.ag-kv`. (`.ag-note` and `.ag-timeline` already reset theirs; this one
  was missed.)

### Measured result

**848px of height removed across 23 portal routes**, with no content changed and no test touched:

| Route | Before | After | Saved |
|---|---:|---:|---:|
| `/agent/applications` | 1933 | 1647 | **−286** |
| `/agent/sales` | 2254 | 2108 | −146 |
| `/client/property` | 1278 | 1142 | −136 |
| `/agent/appointments` | 1569 | 1470 | −99 |
| `/agent/dashboard` | 2255 | 2213 | −42 |
| `/client/documents` | 1405 | 1363 | −42 |
| …16 more | | | −97 |

One route grew (`/agent/marketing`, +30px) because the wider column changed a line wrap. Recorded
rather than hidden.

## 10 · The `design-gate` audit, and what it could and could not verify

`design-gate` is the right skill for this work (reviewing and repairing UI that already exists), and
its procedure was followed: baseline, rendered measurement, findings, fix, re-verify.

**Source score: 100/100, bar 80, 0 blockers** (`portal-ui.tsx`, 12 rules executed).

### What the gate could NOT verify — stated, not glossed

**The portal pixel gate is unverified.** `snapshot --url /agent/dashboard` reported
`documentHeight: 900` at every viewport and found its focus check on an `input` — it measured the
**sign-in page**. The gate holds no session, so it cannot reach any authenticated surface. Per the
skill's own hard rule, that half of the audit is reported as unverified rather than passed; the
portals were covered instead by the project's own harness, which signs in per persona.

The gate also **skipped `G5-token-contrast`** ("no `--color-*` CSS variables found on `:root`"), so
it did not verify contrast anywhere. The project's `audit.mjs` did: 18 flags, **all on
gradient/photo surfaces, 0 on a flat ground**.

### The two findings it did raise, both verified by hand

**`CC-3` small-desktop-body — `G5-body-size`, FAIL.** *"body font-size 13.6px is below the 16px
desktop minimum."*

- **Mechanism, confirmed:** `html { font-size: 80% }` → root **12.8px**; `--text-md` is `1.0625rem`;
  `1.0625 × 12.8 = 13.6px`. This is a direct consequence of the 80% scale the captain asked for.
- **Measured caveat, and it matters:** the gate reads `document.body`'s *computed* size. The first
  real reading paragraph in `<main>` on `/services` computes to **16px**, so the visible reading
  size is not 13.6px. The risk the rule describes is real but narrower than stated: any text with no
  explicit ladder step of its own inherits 13.6px. **Reported as measured, not inflated.**
- **Not fixed unilaterally.** 13.6px body is exactly what a true 80% zoom produces — it is the
  captain's explicit instruction, and it is a legibility trade-off on a site whose readers are often
  older. The one-line lever is `html { font-size: 90% }` (15.3px body). **This is the captain's
  call, not a silent revert.**

**`G5-reflow` — FAIL, 5 elements "with content wider than their box" — a FALSE POSITIVE.**

- Every failing element is `span.visually-hidden` with `position: absolute; clip: inset(50%)` and
  `clientWidth: 1` — the standard screen-reader-only pattern, e.g. `"for Retrieval"` carrying the
  accessible name of a "Request a quote" button. A 1×1px box is intentional.
- A wider sweep of the page found **16** such elements, all the same pattern.
- The heuristic cannot distinguish screen-reader-only text from clipped content, so it reports the
  accessible names as overflow. **Not a defect, and not something to "fix" by removing the names.**

## 11 · The UA-margin sweep: one real defect, and three ways a detector lied

The `.ag-kv` bug was not a one-off; it was an **instance of a class** — a rule that sets a
background, a padding and a font-size but never a margin, so the element silently inherits a browser
default. So the class was swept: `scripts/design-audit/ua-margin-leak.mjs` walks 28 routes across
every surface and finds elements whose computed block margin is non-zero while no author rule
declares one for them.

**Result: 0 leaks.** `dl.ag-kv` was the only one, and it is fixed.

**But getting to a trustworthy zero took four iterations, and three of them were the detector
lying.** Each false positive would have had me "fixing" spacing the project intended:

| Iteration | What it claimed | Why it was wrong |
|---|---|---|
| 1 | **30 "leaks"** across 21 routes | The project spaces its vertical rhythm with sibling-combinator stacks — `.stack-4 > * + * { margin-top: var(--space-4) }`. The selector's subject is `*`, so no class on the element declares the margin and the element looks like a leak while it *is* the intended spacing. `div.listing-layout` was reported at 13px; it is a grid with `gap` and no margin at all. |
| 2 | **3 leaks** on `/price-list` | The tag scan only registered a tag when a rule set its margin to exactly `0`, so `base.css`'s real rule — `p { margin: 0 0 var(--space-3); }` — did not count. A partial margin is still an author decision. |
| 3 | **1 leak** — an `h3` | Two bugs: the scan's `([^}]*)\}` **consumed** each rule's closing brace, so the next rule could never match its own opening `}` and was skipped; and the bare-tag test rejected `base.css`'s heading rule, which is written across three lines — `h2,\n h3,\n h4 { margin: 0 0 var(--space-3); }`. The "leak" was authored, in the file that owns heading type. |

**The discriminator that made it work.** A UA default is **symmetric** (`dl { margin-block: 1em }`
gives the same value top and bottom); an author stack is **one-sided** (`margin-top` only). Requiring
`mt > 0 && mb > 0 && mt == mb`, on a tag that actually carries a UA margin, and undeclared by any
rule, is what separated the real defect from the rhythm.

**And the probe proves it can still fire.** It self-tests against a synthetic `<dl>` with an unstyled
class before it will run at all — a leak detector that reports nothing is worthless unless it can be
shown to catch the bug it exists for. A metric that cannot fail is not a metric.

The lesson is worth keeping: **the first list was plausible, specific, and 90% wrong.** Measuring is
not the same as measuring the right thing, and the difference only shows up when you check a
finding by hand before acting on it.

## 12 · Two things I had recorded as defects that are not

**`/client/privacy` "has no signature" — not a defect.** It is one of four routes that render
`PlannedAnswer`, which composes a hero plus the honesty disclosure. It has no section head because it
has **no sections** — just the page's promise and one disclosure. Adding an `h2` to make a metric
read 25/25 would be chasing the metric.

**There is no second house style in the family portal.** `components/family/family-ui.tsx` already
delegates *everything* to the shared portal kit — `Answer` → `PortalHero`, `Section` →
`PortalSection`, `Rows` → `PortalRows`, `Row` → `PortalRow`, plus `PortalCard`. **The family portal is
the reference implementation**, and `components/agent/agent-ui.tsx` was the file that had drifted from
it — which is what the collapse in §6 fixed. The direction of that fix was right, and this is the
evidence for it.

## 13 · The list pages: one page genuinely wanted two columns, four did not

The agent portal has six screens where the tallest band is 68–74% of the page, and the temptation is
to treat that as one defect. Measured per page, it is four different things:

| Page | What the tall band actually is | Two-up? |
|---|---|---|
| `/agent/applications` | a list of uniform, self-contained `.ag-card`s | **yes** |
| `/agent/prospects` | pipeline-**stage groups** of different sizes | no — pairing them implies a comparison that does not exist |
| `/agent/clients` | a row list of `.ag-work` rows | no — a row wants the full width |
| `/agent/lots` | the park map | no |
| `/agent/new` | a form | no |
| `/agent/marketing` | material tiles | already a tile set |

So `.ag-list` itself was left untouched — it is shared by **18 pages**, and a global change would have
re-laid-out row lists and card groups that are correct. A page asks for the grid by name:

```css
@media (min-width: 64rem) {
  .ag-list--grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
}
```

Applied to `/agent/applications` only.

**Measured:** that page went **1647px → 1216px (−431px, −26%)** and its tallest band fell from
**69% to 58%** of the page. The responsive behaviour was checked at four widths: grid at 1440
(2 × 578px) and 1024 (2 × 370px), stacked at 900 and 390, **no horizontal overflow at any of them**.

**And the modifier is provably opt-in.** Re-running the composition recon across all 23 portal routes
and diffing by page height:

```
routes whose height changed: 1   (only the page that asked for the grid)
```

## 14 · The Admin Portal's composition — measured, and no defect found

The Admin Portal has the most routes and had only ever been checked at `/staff/ops`, so it was swept
properly (`staff-composition.mjs`, 27 routes):

| Signal | Result |
|---|---|
| Dead space right of the widest band | **0px on every route** — the staff shell uses its width |
| Bands per page | 2 (`page-header` + content) on every route |
| Tallest band share | 56%–97% |

That last row looked alarming — `/staff/pricing` at **97%** (an 8234px band in an 8468px page). **It is
a metric artifact, and checking before acting is what showed it.** The "tallest band" is
`.app-main__content` — a *wrapper*, not a block. Inside it:

| Page | sections | cards | tables | h2/h3 |
|---|---:|---:|---:|---|
| `/staff/pricing` | **12** | 12 | 12 | 6 / 4 |
| `/staff/schedule` | **8** | 6 | 2 | 3 / 4 |
| `/staff/users` | 4 | 4 | 1 | 3 / 4 |
| `/staff/catalog` | 1 | 0 | 1 | — |

So the staff screens are properly sectioned; they simply wrap those sections in one content column,
which is what a shell should do. **"One tall band" is not a composition defect** — the same figure
described a card list, a row list, a map, a form and a wrapper holding twelve sections.

**The signature question closed.** The staff portal is not missing it: `.app-shell .app-main
.page-section-title::after` already paints a 3rem × 2px gold rule under every section title. The
product expresses the same idea in two idioms — a rule *before the kicker* on public and portal
surfaces, a rule *under the title* in the staff tool. Whether the two should share one token
(`--color-accent` vs `--gold-400`) is a judgement call, recorded rather than churned.

## 15 · The last audit defect: 17px of horizontal scroll, from one email address

The audit had carried exactly one horizontal overflow for several rounds:

```
/staff/property/00000000-0000-4000-8000-000000000D03/document   phone → 17px past the viewport
```

Traced rather than guessed. The client's purchase application prints
`roberto.santos@example.com` in a printed table cell, and that single token painted **159px of text
inside a 76px box**. `.paper-sheet .paper-table` uses `table-layout: fixed`, which cannot shrink a
column below its longest unbreakable token — so the spill propagated all the way up:

| element | scrollWidth / clientWidth |
|---|---|
| `span.paper-cell__text` | 159 / 76 |
| `td` | 165 / 89 |
| `table.paper-table` | 348 / 273 |
| `div.paper-sheet__sheet` | 361 / 298 |
| `div.app-main__content` | 375 / 326 |
| `main.app-main` | **407 / 390** |

**One email address, one printed table, and every staff page was pannable sideways by 17px.**

**The fix** is the researched rule (`UX Pro Max` #111, "Long Token Wrapping"): `overflow-wrap:
anywhere` — which breaks *only* a token that cannot fit, so ordinary prose still wraps normally. Not
`word-break: break-all`, which is for identifiers and would mangle a sentence. Applied to the paper
table's cells and to `.paper-cell__text`, the element that actually painted the spill.

**Measured after:** document overflow **0px** at 390px.

**And the guard is proven non-vacuous.** `tests/unit/phone-layout.test.tsx` — whose established job is
to pin the *declarations* that make a phone surface work, since vitest runs in `node` and cannot
measure layout — gained three assertions. I then removed the fix and re-ran to check the guard is not
a wish:

```
× the cell text wrapper breaks it too — it is the element that painted the spill
  → expected false to be true
Tests  1 failed | 23 passed
```

It fails without the fix and passes with it. Restored.

### The audit is now clean on every non-contrast check

| Check | Result |
|---|---|
| Routes that did not render | **0** |
| Horizontal overflow | **0** (was 1) |
| Type below the 12px floor | **0** |
| More than one `h1` / no `h1` | **0 / 0** |
| Images without `alt` | **0** |
| Gradient on interactive elements | **0** |
| Contrast failures | 18 flags, **all 18 on gradient/photo surfaces the probe cannot resolve — 0 on a flat ground** (the known `.paper-hero` false positives) |

## 16 · The home's blog band, removed — and why it is safe now

Captain, 2026-09-27: *"remove this part in home page Blog"* — the band that reprinted the three newest
posts with a "See all posts" link.

**This is a reversal of a change made for a reason, so the reason was re-checked before removing it.**
The band was added when the captain asked *"now where are our blogs??"* — the rebuilt home had dropped
the old newsfeed, and `/blog` was in the sitemap but **linked from nowhere**. So the band did two jobs:
it said the place was being cared for, and it made the blog discoverable.

Only the first job goes away with it. Verified after removal, on a live page:

| Check | Result |
|---|---|
| `.home-news` band on `/` | **absent** |
| "See all posts" / the blog intro / a post caption | **absent** |
| `/blog` | h1 "Blog", **4 feed posts still rendering** |
| `/blog` links on `/services` | **2** — one in the header's "Explore more" menu, one in the footer |

So `/blog` is still reachable from every public page without the band. **Nothing became unreachable**,
which is the failure the band was created to fix.

### And the dead weight went with the markup

A band's CSS outliving its markup is exactly the measured-cleanup failure this record exists to stop,
so all of it was removed in one pass and the removal was *counted* rather than assumed:

- `components/public/home-page.tsx` — the band, the `NewsCard` component, its `posts`/`lead`/`rest`
  derivations, and the imports and `blog` destructuring they left unused.
- `styles/components.css` — the whole `/* News from the park */` block: **115 lines, 17 blocks, 17
  `.home-news` references**, leaving **0** in the file. Brace balance re-checked: 0/0.
- `styles/base.css` — `.home-news__media img` was a selector in the ECC image-outline rule pointing
  at markup that no longer exists.
- `tests/unit/public-page-budget.test.tsx` — the home's declared section list dropped `home-news`.

**One mistake worth recording:** the explanatory JSX comment I first wrote contained the words
`` `/* News from the park */` `` — and the inner `*/` **closed the JSX comment early**, so the file
stopped parsing (`Unterminated template literal`). Caught by typecheck, not by eye.

### Measured result

| | Measured |
|---|---|
| Bands on `/` | **5** — hero → qualify → fork → park → feel |
| `/` height | **3,563px** |
| `/` images requested | **4** |
| `/` image weight | **546 KB** |

**Only the after-state is tabulated, deliberately.** I did not take a before-measurement this round, so
there is no honest before-column to print — an earlier draft of this table carried a "before" height I
had never measured, which is exactly the kind of invented number this record exists to avoid.

What the figures do confirm: **3,563px is the home's documented pre-band height**, which is the
evidence that the removal took out the band and nothing else. And the weight can only have fallen —
the band's three post photographs are no longer requested at all.

`content.blog` remains the staff document, `/blog` still renders its full feed, and the landing
editor's Blog zone is untouched — nothing was retired, the home simply no longer reprints three posts.

## 17 · Open, in priority order

1. **`/agent/prospects` is the one list page still unresolved.** Its cards are pipeline-**stage
   groups** of different sizes, so two-up is wrong for them — but the page is still hero → filters →
   four unequal group cards, with the largest group 70% of the page. The composition question there is
   about the *groups*, not about columns, and it needs a decision rather than a class.
2. **The ECC concentric-radius pass.** Nested rounded surfaces inside `.ag-card` and `.ag-money` have
   not been checked against `outer = inner + padding`. The skill is explicit that the point is optical
   coherence, not formula worship, so this wants eyes on the rendered cards — not a blind calc().
   Verified already correct: `tabular-nums` on every figure value, and both transitions explicitly
   scoped with no `transition: all`.
3. **The Staff Portal's section-mark token.** It paints `--gold-400` where public and portal surfaces
   paint `--color-accent`. Same device, two tokens. Unifying is a judgement call, not a bug.
4. **`CC-3` body size is the captain's call.** At the 80% root the body step is 13.6px. Reading
   paragraphs compute to 16px, so the practical impact is narrower than the rule implies — but any
   text without an explicit ladder step inherits 13.6px. `html { font-size: 90% }` is the one-line
   lever. Do not change it without the captain.
5. **`.ag-card` and `.ag-money` carry a `:hover` border change** while being non-interactive
   elements — a mild false affordance. A captain call.

**Closed this round:** the horizontal overflow (§15) — the audit now reports **0** on every
non-contrast check.
