# ECC skill vendor + `/staff/ops` tick polish — design record

Captain's instruction, 2026-09-25: **"ok implement and close lavish."** That closed
the ECC adoption study and authorised its Option A — vendor a bounded, attributed set
of ECC's plain-Markdown skills as **reference and audit material, never an authority**
(`data/villa-ecc-adoption-plan/report.md` §4.3), with one real page polish as proof the
reference is usable.

## 1 · The vendored set (`.agents/skills/ecc/`, 10 skills)

| Vendored skill | ECC source |
|---|---|
| `ecc-make-interfaces-feel-better` | `skills/make-interfaces-feel-better/SKILL.md` |
| `ecc-design-slop-check` | `skills/design-system/SKILL.md` — *Mode 3: AI Slop Detection only* |
| `ecc-frontend-a11y` | `skills/frontend-a11y/SKILL.md` |
| `ecc-react-patterns` | `skills/react-patterns/SKILL.md` |
| `ecc-nextjs-turbopack` | `skills/nextjs-turbopack/SKILL.md` |
| `ecc-browser-qa` | `skills/browser-qa/SKILL.md` — *re-pointed at `chrome-devtools-axi`* |
| `ecc-click-path-audit` | `skills/click-path-audit/SKILL.md` |
| `ecc-architecture-decision-records` | `skills/architecture-decision-records/SKILL.md` |
| `ecc-article-writing` | `skills/article-writing/SKILL.md` |
| `ecc-brand-voice` | `skills/brand-voice/SKILL.md` (+ `references/voice-profile-schema.md`) |

- Source: `affaan-m/ECC` at `e482e579415fde18357cafce70f177ae19fd7f03` (MIT,
  Copyright (c) 2026 Affaan Mustafa). Cloned read-only; nothing installed or executed.
- Placement follows the repo's convention: `.agents/skills/ecc/<skill>/SKILL.md`,
  a `manifest.json` for the folder, ten `ecc-*` entries in `skills-lock.json`, and ten
  `.claude/skills/ecc-*` symlinks. Everything stays in the one namespace.
- Every file carries the MIT attribution, the pinned commit and the header line
  **"ECC reference only — not a style authority."**
- Excluded: `tdd-workflow`, `verification-loop`, `security-review`, `rules/common`
  (duplicate/contradict project gates). Also dropped ECC `accessibility` — it duplicates
  `ecc-frontend-a11y` and the project's `tests/unit/accessibility-craft.test.tsx` gate.
- Boundaries honoured: no `pi install`, no extension, hook, MCP server or npm runtime;
  no token, typography or reading-budget change; no product code imports the folder.

### Advertisement measurement

Reproduce Pi's `formatSkillsForPrompt` (`<available_skills>` block: name +
description + absolute location), the way report §2.6 measures the context tax:

| Set | Skills | Formatted bytes |
|---|---:|---:|
| Before — `.agents/skills/` (AWS agent-toolkit) | 105 | 91,891 |
| Added — `.agents/skills/ecc/` | 10 | **3,500** |
| Budget | — | 4,096 |

`tests/unit/ecc-skill-vendor.test.ts` recomputes the added size and fails past 4,096
bytes; it also pins the namespace, the attribution/header/named commit, the content
hashes, the lock entries, and that no path under `app/`, `components/`, `lib/` or
`styles/` references the folder.

## 2 · The page polish — `/staff/ops` task tick

The one vendored skill applied here is `ecc-make-interfaces-feel-better`, principle
**"Hit Areas"** (controls should be ≥ 40–44 px; expand when the visible target is
smaller). The board's own design record already states the board gives "44 px touch
targets" at 390 px, but the per-task write control — the "Mark … done" tick — rendered
at the height of a single text line (27 px) because at phone width the title no longer
wraps. The fix is a phone-scoped rule in the ops-board block:

```css
@media (max-width: 40rem) {
  .ops-card__tick { min-height: 44px; align-items: center; }
  .ops-card__tick-box { margin-top: 0; }
}
```

No desktop change: ≥ 40 rem the lanes are narrow and titles wrap, so the tick is
already 46–84 px tall. Measured in Chrome via `chrome-devtools-axi`:

| Measure | 390 × 844 | 1440 × 900 |
|---|---|---|
| Tick height | **27 px → 44 px** | 46–84 px (unchanged) |
| Tick box | 16 px (unchanged) | 16 px (unchanged) |
| Page height | 3,844 → 4,067 px | 1,615 px (unchanged) |
| Page horizontal overflow | 0 → 0 | 0 → 0 |
| Board pan frame `scrollWidth`/`clientWidth` | — | 1,120 / 1,120 (unchanged) |

Before/after pairs: `before/ops-390-tasks.png` ↔ `after/ops-390-tasks.png` (the visible
change), plus full-viewport pairs at 390 and 1440 (`ops-390.png`, `ops-1440.png`).

## 3 · Rollback

`git rm -r .agents/skills/ecc`, drop the ten `ecc-*` lock entries and `.claude/skills`
links, delete `tests/unit/ecc-skill-vendor.test.ts` and this record, and revert the one
media block in `styles/components.css`. No runtime to unwind.
