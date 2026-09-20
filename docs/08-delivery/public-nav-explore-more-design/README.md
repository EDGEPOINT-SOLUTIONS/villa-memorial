# Public navigation — five chips + "Explore more" (2026-09-21)

**Status:** implemented and shipped (captain's direction, 2026-09-21).
**Supersedes** the nav-label/group decisions of
[`../public-nav-design/README.md`](../public-nav-design/README.md) (D1) — the bar's
two-row grammar, phone bar and disclosure behaviour are unchanged.

## Captain's direction, verbatim

> *"in the navigation bar, remove the lot because that is already in the Villa Memorial
> Park and also remove the plan ahead drop down instead put a new dropdown in navigation
> page called 'Explore more' the idea is put all of this pages: Builder, Facilities,
> Gallery, Memorials."*

## What changed

| Before | After |
|---|---|
| Top-level chips: Home · Funeraria Memorial Services · **Builder** · Villa Memorial Plan · **Lots** · Villa Memorial Park · **Facilities** · **Gallery** · **Memorials** · Contact | Top-level chips: **Home · Funeraria Memorial Services · Villa Memorial Plan · Villa Memorial Park · Contact** |
| Dropdown **"Plan ahead"**: Villa Memorial Plan · Senior benefits · Funeraria Memorial Services · Smart Service Builder · Villa Memorial Park | Dropdown **"Explore more"**: **Builder · Facilities · Gallery · Memorials** |
| Phone bar third target + sheet: **Plan ahead** | Phone bar third target + sheet: **Explore more** |
| Mobile quick-menu flyout: standalone **Lots** link | Lots link removed (the park page owns lots) |

One source of truth: `SITE_NAV_LINKS` (five top-level) and `EXPLORE_MORE_LINKS` (four
grouped) in `components/landing/site-header.tsx`. `PLAN_AHEAD_LINKS` is retired (the
`/plans` page keeps its own Senior-benefits link). The internal `anchored-header__plan*`
/ `anchored-plan-sheet*` / `anchored-phonebar__btn--plan` names are renamed to
`explore` so the code cannot lie about what it renders.

**Current-page cue is preserved.** The four grouped pages have no top-level chip, so
while one of them is open the Explore-more trigger is marked (`aria-current="true"`, the
same gold underline) and the open menu item carries `aria-current="page"` with a gold
rule — the bar never loses its wayfinding.

## The pre-existing bug this pass also fixed

The 2026-09-21 "full nav names" commit added `overflow-x: auto` to
`.anchored-header__nav` so the wide page names could scroll. That made the nav a scroll
container, which **clipped the absolutely-positioned dropdown menu** — on the base
revision the "Plan ahead" panel was in the DOM (`hidden="false"`,
`getBoundingClientRect()` at y ≈ 119) but `document.elementFromPoint()` at that spot
returned the hero: it was never visible. See `shots/before-1440-open.png` (trigger open,
no panel).

Fix: the chips now scroll inside their own `.anchored-header__nav-track`, and the
Explore-more trigger (and its menu) stays outside that overflow, so the panel is never
clipped. The panel is also right-aligned under its trigger (`right: 0`), because the
five full-name chips push the trigger far enough right that a centred panel would run
past the viewport edge.

## Evidence

Viewport 1440 × 900 (DIP 1) and 390 × 844, home page, fixtures mode.

| Shot | Shows |
|---|---|
| `shots/before-1440-closed.png` | Base bar: ten chips incl. Lots, plus Plan ahead |
| `shots/before-1440-open.png` | Base dropdown **clipped** (chevron up, no panel) |
| `shots/after-1440-closed.png` | New bar: five chips + Explore more |
| `shots/after-1440-open.png` | New dropdown open, right-aligned, four items visible |
| `shots/before-390-closed.png` | Base phone bar: Call 24/7 · Get help · Plan ahead |
| `shots/before-390-sheet.png` | Base phone sheet "Plan ahead" |
| `shots/after-390-closed.png` | New phone bar: Call 24/7 · Get help · Explore more |
| `shots/after-390-sheet.png` | New phone sheet "Explore more" with the four pages |

At 390 the document width equals the viewport (`scrollWidth === innerWidth === 390`): no
horizontal overflow. The 44 px targets and the wordmark ellipsis are unchanged.

## Tests

- `tests/unit/public-nav.test.tsx` — pins the exact five top-level destinations, the
  exact four Explore-more items, the Lots removal and the phone bar's three targets.
- `tests/unit/landing-view.test.tsx` — the home renders the same top-level set + grouped
  menu.
- `tests/unit/facilities-page.test.tsx` — Facilities is linked from the grouped menu.
- `tests/unit/composition-pass.test.tsx` — the renamed dropdown rule keeps its elevation.
