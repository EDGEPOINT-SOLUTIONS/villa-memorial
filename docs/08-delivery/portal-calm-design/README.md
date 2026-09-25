# Agent & family portals — the calm sweep

**Task:** `villa-ui-renovation-portals` · **Captain, 2026-09-25:** _"the agent and family
portals should be professional looking, not an overwhelming ui/ux"_, on the renovated system
from the foundation lane (`fm/villa-ui-renovation-foundation`, PR #121) — white grounds,
sky confined to controls and the footer, neutral hairlines, sharper radii and shadows.

The foundation whitened the grounds but left the portals' **inner composition** largely as it
was: the shared `ag-*` / `fv-*` kit still opened on a gradient-washed hero box, put a drop
shadow on every card, row, KPI tile and appointment, and marked work rows with heavy 5 px
status edges. This lane is the second half of the captain's rule: the two signed-in portals
are **type and hairlines on white** — a plain page header, one action band separated by a
hairline, flat cards, one accent. No second visual language was introduced, the navigation
bar is untouched, and every fact each screen owes its reader stays.

## What shipped

- **The hero is a page header, not a card.** `.ag-hero` loses its box (border, radius, gold
  radial bloom, drop shadow and the 2 px gold hairline pseudo-element). It is now an eyebrow,
  a title, a lead and the chips on the page ground.
- **One action band, a hairline separator.** `.ag-action` loses its second card chrome; the
  screen's one decision sits under a `1px` neutral top hairline instead of a shadowed box.
- **Flat cards on hairlines.** `.ag-card`, `.ag-work`, `.ag-appt`, `.ag-money`, `.ag-quick`,
  `.ag-commission`, `.ag-deal`, `.ag-lot`, `.ag-material`, `.ag-map`, `.fv-record`, the
  memorial card and the sign-in card drop every `--shadow-card` / `--shadow-raised`. The only
  surviving elevations are functional: the phone tab bar, the map pin, the switch knob and
  the focus ring.
- **No decorative gradients in the portal scope.** The gold radial blooms (`.ag-hero`,
  `.ag-money--hero`, `.ag-signin__aside`), the commission header wash, the record-card wash,
  the monogram plate gradient, the target-fill gradient, the `.memorial-card` paper gradient
  and the two brass/gold top bars on the shells are gone. The loading skeleton's shimmer is
  the one functional gradient kept.
- **Quieter status.** The work list's four 5 px coloured left edges are gone; the tone still
  reads in the icon disc, the kind label and the stage chip. The rail's help block is neutral,
  not a gold ornament.
- **Consistent spacing, tokens only.** Repeated inline flex rows became `.ag-actions` /
  `.ag-actions--center`; the record-page grid uses `.ag-grid-2`; the field label/hint spacing,
  a `.ag-divider`, `.ag-list--tight`, `.ag-self-start`, `.ag-note--error` / `--center` and
  `.ag-photo__body` now live in the stylesheet instead of ad-hoc inline styles.
- **Honest states complete.** `/agent/dashboard` gains its empty work-list and empty-stops
  states (the daily "today" screen had none).
- **One office number.** The agent pages and rail read the office line from
  `lib/family/contact.ts` (`FAMILY_HELP`) instead of typing `0917 617 8489` — the one contact
  module, per the repo rule.

## Measured before / after (no screenshots — declaration measurements)

`styles/components.css`, portal scope (`.ag-*`, `.fv-*`, `.portal-*`, `.signin-*`,
`.family-shell`, `.memorial-card`), measured with a brace-aware walk of the declarations:

| | before | after |
|---|---:|---:|
| decorative gradients | **11** | **0** |
| functional gradients (skeleton shimmer) | 1 | 1 |
| card/list drop shadows | **16** | **0** |
| heavy 5 px status edges | **4** | **0** |
| sky background declarations (product-wide) | 34 | 34 |

The sky count is unchanged: this lane removes _decoration_, not the brand. Sky stays on the
primary button, the pressed/selected states, the call actions, the small data/status
indicators (`--sky-*` target fill, timeline and trail dots, map pins) and the footer — the
same allowlist `tests/unit/page-backgrounds.test.ts` enforces.

## Guards

- **`tests/unit/portal-calm.test.ts` (new, 8 tests)** — declaration-level and named on
  failure: no decorative gradient in the portal scope (the skeleton is the one exception); the
  hero is a plain header (no background/border/radius/shadow, no `::before`); the action band
  is a hairline separator; the named card/list grammar carries no drop shadow; the functional
  shadows (map pin, switch knob, focus ring) are kept; no 5 px status edges; the portal rails
  and content stay white. It asserts a non-vacuous rule count (≥ 80) so a rename cannot make it
  pass silently.
- The foundation's `page-backgrounds` (white grounds + sky allowlist), `typography-system`,
  `public-layout`, `broken-pages`, `accessibility-craft`, `reading-budget`,
  `family-reading-budget`, `portal-kit`, `family-ui`, `family-pages` and `phone-layout` all
  stay green.

## Full check set (all green)

```
npm run lint       # clean
npm run typecheck  # clean
npm test           # 210 files, 2,490 tests passed
npm run build      # production build passed (91/91 static pages)
```

## Scope notes

- **Navigation bar untouched.** No `.anchored-*` rule changed; the public bar and its
  grouped "Explore more" menu are byte-identical. The portal rails were already whitened by
  the foundation lane.
- **No copy was dropped.** Where a page's prose is an honesty fact, it stays; this lane
  changes the treatment (flat cards, hairline separators, quieter status), not the record.
  The family reading budget and the public/lead reading budget both stay green.
- **No screenshots** (captain's instruction). Evidence is the declaration measurements above,
  the guard output, and the full check set.
