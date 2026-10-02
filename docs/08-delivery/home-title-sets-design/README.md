# Gateway title sets — implementation record (2026-10-02)

**Brief (the captain, 2026-10-02):** *"What if the title in homepage can be unlimited title set
in admin homepage editor, like you will ad a new set, and they will carousel or change every 5s
or depends on what you set it in the admin"* — and the follow-up, *"make sure the title carousel
is working in homepage"*.

The home gateway band used to render exactly one headline/promise pair ("We're here for you" /
"any hour, any day."). It now renders an **unlimited, ordered set of title pairs**, one at a time,
cross-fading to the next on an interval the office sets. Everything else in the band — the place
line, both actions, the fact ribbon — and the rest of the home are untouched.

## The data — one editable list

`lib/fixtures/landing/content.json` → `content.home.gateway` (the one home document; the page
renders it and `/staff/landing/home` edits it):

| field | type | meaning |
|---|---|---|
| `titleSets` | `{ id, headline, promise }[]` | The ordered pairs the band rotates through. Unlimited. |
| `titleIntervalSeconds` | `number` | Whole seconds each set stays on screen. Default `5`, valid `1`–`120`. |

The seed carries **three demo title pairs** so the rotation is visible in fixture mode — the
current pair first, then two calm alternates drawn from the band's own recorded copy:

| # | headline | promise | source of the words |
|---|---|---|---|
| 1 | We're here for you | any hour, any day. | the shipped band (unchanged) |
| 2 | We come to you | and stay until the burial is done. | the gateway lead already in the document |
| 3 | The first park in Basilan | family-run, in Isabela City. | the "first park" trust fact |

They are **demo seeds the office will edit**: no price, claim or phone number was invented. The
fixture's `comment` block marks them, and the office adds, removes and reorders sets in the editor.
`headline`/`promise` were removed from the model; a document saved before this feature folds its
one pair into the first set (tolerant reader, below).

## The model — `lib/api-client/landing.ts`

- `HomeTitleSet` type + `HomeGatewaySection.titleSets` / `.titleIntervalSeconds`.
- The tolerant reader builds `titleSets` from the recorded list, or — for a pre-feature document —
  from its one raw `headline`/`promise` pair, or falls back to the seed's sets. `readTitleInterval`
  clamps a hand-edited interval to `1`–`120` and rounds to a whole second.
- The save validator refuses an empty list, a blank headline line, an interval outside `1`–`120`
  whole seconds, and (through the existing `authoredText` gate) any emoji in a set's words.

## The rotation

**Timing is a plain module**: `lib/home-title-rotation.ts` (`createTitleRotation`) starts on the
first set, advances in order, loops back to the first after the last, never rotates a single set,
and — when `still` is set — shows the first set and never starts the timer. `pause()` clears the
timer and keeps the shown set; `resume()` starts a fresh interval from that set, so a pointer resting
on the band does not skip a title when it leaves.

**The markup is a client component**: `components/public/home-title-rotator.tsx`. It renders ONE
`<h1 id="home-gateway-title">` (the band's `aria-labelledby` target) with every set stacked in the
same grid cell; only the active set is opaque, and the cross-fade is the opacity transition in
`styles/components.css`. It wires the controller to the real events:

- a pointer resting **anywhere on the band** pauses the rotation — the controller's timer is
  cleared from the `.home-gateway` section, found from the title's ref;
- a **hidden tab** pauses; a visible one resumes;
- `prefers-reduced-motion: reduce` passes `still`, so the first set is shown and the timer never
  starts (the base stylesheet already collapses the transition duration).

**Stability and accessibility.** The sets share one grid cell, so the band's height is the tallest
set's from the first paint — no layout jump as the shown set changes. The type scale is untouched
(the headline is still `.home-gateway__title` at `--text-hero`; the promise still
`.home-gateway__promise` in the sky ink). Inactive sets are `aria-hidden`, so the heading's
accessible name is always the set on screen, and there is **no assertive live region** — the text
is never announced unprompted.

## The editor — `/staff/landing/home`, section 1

The old Headline / Promise fields are replaced by a **Title sets** list: each set edits its
headline and supporting line, with the shared move-up / move-down / remove buttons, an
**Add a title set** button, and a **Rotation interval (seconds)** number field (`1`–`120`). The
editor runs the same model, so the preview and the page cannot disagree.

## Evidence

Shots are the production build on `:4000` (fixture mode), captured at least one interval (5 s)
apart, with the band paused by a synthetic `pointerenter` so each shot is the intended set.

| viewport | set 1 | set 2 (one interval later) |
|---|---|---|
| 1440 | [`after-set-1-we-are-here-1440.png`](after-set-1-we-are-here-1440.png) | [`after-set-2-we-come-to-you-1440.png`](after-set-2-we-come-to-you-1440.png) |
| 390 | [`after-set-1-we-are-here-390.png`](after-set-1-we-are-here-390.png) | [`after-set-2-we-come-to-you-390.png`](after-set-2-we-come-to-you-390.png) |

The pre-carousel band ("before") is the single-set shot in the sibling record:
[`../gateway-copy-design/after-v2-1440.png`](../gateway-copy-design/after-v2-1440.png).

**The band height does not move between sets** — measured with
`document.querySelector('.home-gateway').getBoundingClientRect().height` and the fact ribbon's
`top`:

| viewport | set 1 height / ribbon top | set 2 height / ribbon top |
|---|---|---|
| 1440 | 592.47 px / 621.63 px | 592.47 px / 621.63 px |
| 390  | 379.81 px / 355.95 px | 379.81 px / 355.95 px |

## Gates

| command | result |
|---|---|
| `npm run lint` | 0 errors (4 pre-existing warnings in files untouched here) |
| `npm run typecheck` | clean |
| `npx vitest run tests/unit/home-title-rotation.test.ts tests/unit/home-title-rotator.test.tsx tests/unit/home-editor-title-sets.test.tsx tests/fixture-contract/landing.test.ts tests/unit/home-styles.test.ts` | 5 files · 58 tests passed |
| `npm test` | 281 files · 3112 tests passed |
| `npm run build` | exit 0 (compiled successfully, 98 static pages generated) |

`tests/unit/home-title-rotation.test.ts` drives the controller under **fake timers** and proves the
set advances on the interval, loops, stays on the first set under reduced motion, keeps the shown
set while paused, and floors a sub-second interval. `tests/unit/home-title-rotator.test.tsx` proves
the server markup carries one heading, the first set active, the rest `aria-hidden`, and no live
region. `tests/unit/home-editor-title-sets.test.tsx` proves the editor's set list, add button and
interval field render. The fixture-contract suite pins the three seed sets, the validator's rules,
and the pre-feature fallback.
