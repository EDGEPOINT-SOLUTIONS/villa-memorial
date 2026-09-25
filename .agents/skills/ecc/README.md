# ECC skill subset — reference and audit only

This folder holds a **bounded, attributed subset of plain-Markdown skills from
[`affaan-m/ECC`](https://github.com/affaan-m/ECC)**. They are here as **reference
and audit material only**. **They are not a style authority.** They never override
`AGENTS.md`, the design tokens (`styles/tokens.css`), the typography system or the
reading budget, and no product code depends on them.

ECC's recommended posture in this project is Option A of the adoption study
(`data/villa-ecc-adoption-plan/report.md`): vendor a small subset, install nothing.

## Source

| | |
|---|---|
| Repository | `affaan-m/ECC` (https://github.com/affaan-m/ECC) |
| Pinned commit | `e482e579415fde18357cafce70f177ae19fd7f03` (2026-09-24, repo `VERSION` 2.2.2) |
| License | MIT — Copyright (c) 2026 Affaan Mustafa (full text in [`LICENSE`](./LICENSE)) |
| Read | cloned read-only, checked out at the pinned commit. Nothing was installed or executed. |

Every `SKILL.md` here carries two provenance lines directly under its frontmatter:

> **ECC reference only — not a style authority.** … never overrides `AGENTS.md`, the design tokens, the typography system or the reading budget.

and the MIT attribution + commit hash. `manifest.json` is the machine-readable
authority for this folder: the skill list, the ECC source path, the ECC source
file's SHA-256 at the pinned commit, and the vendored file's own SHA-256.

## The vendored set (10 skills)

| Vendored skill | ECC source | Bytes |
|---|---|---:|
| `ecc-make-interfaces-feel-better` | `skills/make-interfaces-feel-better/SKILL.md` | 5,215 |
| `ecc-design-slop-check` | `skills/design-system/SKILL.md` — *Mode 3: AI Slop Detection only* | 1,257 |
| `ecc-frontend-a11y` | `skills/frontend-a11y/SKILL.md` | 13,142 |
| `ecc-react-patterns` | `skills/react-patterns/SKILL.md` | 11,829 |
| `ecc-nextjs-turbopack` | `skills/nextjs-turbopack/SKILL.md` | 3,382 |
| `ecc-browser-qa` | `skills/browser-qa/SKILL.md` — *re-pointed at `chrome-devtools-axi`* | 4,172 |
| `ecc-click-path-audit` | `skills/click-path-audit/SKILL.md` | 8,224 |
| `ecc-architecture-decision-records` | `skills/architecture-decision-records/SKILL.md` | 7,462 |
| `ecc-article-writing` | `skills/article-writing/SKILL.md` | 3,210 |
| `ecc-brand-voice` | `skills/brand-voice/SKILL.md` (+ `references/voice-profile-schema.md`) | 4,001 |

### Vendoring edits (all declared)

- Frontmatter `name` is prefixed `ecc-` so the skill is namespaced and cannot
  collide with a project skill.
- Frontmatter `description` is shortened to the advertisement budget (see below);
  `metadata.origin`, `metadata.ecc_commit` and `metadata.reference_only` are added.
- The two provenance lines above are prepended; the ECC body is otherwise verbatim,
  except:
  - `ecc-design-slop-check` contains **only** ECC `design-system`'s *Mode 3: AI Slop
    Detection* section.
  - `ecc-browser-qa`'s "How It Works"/"Integration" sections are re-pointed from the
    Claude/Playwright/Puppeteer MCPs to this project's `chrome-devtools-axi` tool.

### Deliberately excluded

`tdd-workflow`, `verification-loop`, `security-review` and `rules/common` — they
either duplicate or contradict project gates (test policy, the verification
command set, the scope model, always-on rules). ECC `skills/accessibility` was also
dropped even though it was a candidate: it duplicates `ecc-frontend-a11y` and the
project's own `tests/unit/accessibility-craft.test.tsx` render gate. Nothing here
adds a runtime: no `pi install`, no extension, no hook, no MCP server, no npm
package.

## Advertisement measurement (Pi system prompt)

Pi advertises every discovered skill by name, description and absolute path
(`formatSkillsForPrompt`). Measured by reproducing that formatter exactly
(`<available_skills>` block, name/description/location per skill):

| Set | Skills | Formatted bytes |
|---|---:|---:|
| Before — `.agents/skills/` (AWS agent-toolkit) | 105 | 91,891 |
| **Added — this folder** | **10** | **3,500** |
| Budget (`manifest.json` `advertisementBudgetBytes`) | — | 4,096 |

The addition is **3,500 bytes ≈ 3.4 KB**, under the ~4 KB acceptance budget,
because each vendored description is trimmed. Bodies are not advertised; Pi loads
one only when a task matches. `tests/unit/ecc-skill-vendor.test.ts` recomputes this
added size and fails if it grows past the budget.

## Rollback

This change is deliberately contained. `git rm -r .agents/skills/ecc`, remove the
ten `ecc-*` entries from `skills-lock.json` and the `.claude/skills/ecc-*` links,
and delete `tests/unit/ecc-skill-vendor.test.ts`. Nothing else in the repo refers to
this folder and there is no runtime to unwind.
