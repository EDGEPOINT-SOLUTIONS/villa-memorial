# Harness customization for this repo — the instruction budget, and what belongs to the project (2026-09-27)

This record covers **agent-harness customization for this repository**, not product
customization (for that, `docs/01-product/saas-strategy.md` and
`docs/02-architecture/configuration-engine.md` are the authority). It exists because the
harness a session runs under decides whether this repo's own rules reach the model at all.

## 1 · The defect this records

`AGENTS.md` is the repo's governing document — `next-session-plan.md` calls it "the single most
important file for a new session". Under the DeepSeek Harness it was **silently ignored**:

| Measured | Value |
|---|---|
| Root `AGENTS.md` before this change | **156,934 bytes**, 1,963 lines, 54 `##` sections |
| Workspace-instruction budget (`@deepseek-ai/dsh-agent-instructions` `maxBytes`) | **65,536 bytes** |
| What the harness did | "an over-budget broad file is **ignored**" — it is dropped whole, never truncated |
| Observed in a session | the instruction block read `omitted AGENTS.md` |
| `docs/*/AGENTS.md` (nested files) | **loaded normally** — they are more specific, so they survive |
| `CLAUDE.md`'s `@AGENTS.md` | **not an import** — "`@path` imports are not interpreted"; the file contributed the literal text `@AGENTS.md` |

So every session paid nothing for the rules and lost all of them, while the nested `docs/`
files arrived. The file's own rule — *"Keep this file for knowledge useful to almost every
future agent session… point to the authoritative file or command instead"* — was already
violated by the ~120 KB of per-surface detail it carried.

## 2 · What landed in this PR (Tier 0)

The root file was split **mechanically by section boundary**: every section was moved verbatim,
with no rewriting, so no rule could be lost in translation.

| File | Bytes | Sections | Governs |
|---|---:|---:|---|
| `AGENTS.md` (root) | **41,220** | 16 + the new Instruction map | merge blockers, traps, component kit, composition grammar, page copy, layout contract, money, structure, accessibility, papers |
| `app/(public)/AGENTS.md` | 46,829 | 14 | landing/content-model home · services & casket catalogue · gallery · memorials · facilities · forms · `/plans/[sku]` · `/builder` · `/map` · imagery · SEO |
| `app/(staff)/AGENTS.md` | 61,731 | 19 | content catalogue · billing & provisional receipts · orders · catalog admin · cases/ops/preparation/lot records/instruments · chapel admin · commission · copilot · admin platform & data screens |
| `app/(family)/AGENTS.md` | 5,181 | 1 | family portal |
| `app/(agent)/AGENTS.md` | 3,047 | 2 | agent lots map · agent lead record |
| `app/(platform)/AGENTS.md` | 2,049 | 1 | platform operator surface |
| `infra/AGENTS.md` | 1,953 | 1 | AWS deployment shape A |

A nested file is **discovered when a session touches a file in its directory** — a harness
"includes the newly applicable instruction file" after a first-party `read`/`write`/`edit`
reaches that directory. That is also a context saving: a session no longer pays 153 KB upfront
for surfaces it is not touching. Discovery follows structured file tools, **not** shell `cd`.

Also in this PR:

- `AGENTS.md` → "Maintaining this file" gained the **budget** and **overlay** rules, so the
  split cannot be quietly re-merged (the failure mode is not obvious from the file itself).
- `CLAUDE.md` keeps its Claude Code `@AGENTS.md` import but now says plainly that harnesses
  which do not interpret imports read it literally, and that rules must live in `AGENTS.md`.
- `.gitignore` gained `AGENTS.local.md` / `CLAUDE.local.md` — machine-local overlay candidates
  the harness loads after the base files.

## 3 · Evidence

- **Coverage proof (pre-write):** the 54 section bodies, concatenated in document order, were
  compared line-by-line against the source from line 7 to EOF — `1,957 lines accounted for
  exactly once`.
- **Placement proof (post-write, independent):** for each of the 54 sections, its exact body is
  byte-contained in **exactly one** of the seven files — no loss, no duplication.
- **Encoding:** no `U+00C3` / `U+FFFD` markers in any of the seven files; all written CRLF to
  match `core.autocrlf=true` and the rest of the working tree.
- **Only `.md` files were added under `app/`**, and every repo test that walks `app/**`
  (`seo`, `staff-scope-vocabulary`, `admin-portal-sweep`, `admin-portal-naming`,
  `helpers/css-rules.ts`) filters to `/\.tsx?$/`, so none of them sees these files.
- **Live discovery proof:** in the session that made this change, the first `read` of a file under
  `app/(agent)/` made the harness inject the nested `app/(agent)/AGENTS.md` as additional
  instructions — the file is discovered and reaches the model, which is the whole point of the
  split.
- **Gates:** `npm run lint` (0 errors; 2 pre-existing warnings in `scripts/design-audit/`),
  `npm run typecheck` clean, `npm test` **228 files / 2,653 tests passed**, and `npm run build`
  green (91 static pages, every route built).
- **The build caveat that produced a new trap:** the first in-repo build failed with
  `Cannot find module './5611.js'` because a `npm run dev` server was holding the same `.next`.
  The commit was then built clean in a `git worktree` of it with a junction to `node_modules`
  (exit 0). The dev server was restarted and verified (HTTP 200). The hazard is now a bullet in
  the root `AGENTS.md` under Traps, so the next agent running the gate set does not repeat it.

**Known headroom:** `app/(staff)/AGENTS.md` is at 61,731 / 65,536 bytes (94%). It reaches
agents today, but the next substantial staff section would push it over and the file would be
dropped whole — the original defect, one level down. When that happens, split at
`app/(staff)/staff/AGENTS.md` (the route directory) rather than deleting a rule.

## 4 · Proposed next — what belongs to this project, and where

The harness has **no per-project plugin install**: a bundle installs into the profile and, per
`plugin_manager`, "changes affect every session in that profile". Project scoping therefore has
exactly three homes:

| Home | Real scope | Carries |
|---|---|---|
| Workspace files | truly per-project (project root = nearest `.git`) | `AGENTS.md` chain (done), skills, repo scripts |
| An **agent preset** (`villa`) | roster is profile-wide, **effect is per-session** (opt-in select; recorded as `SessionHeader.agentPreset`) | persona, prompt sections, a scoped tool set |
| A **cwd-gated host plugin** | installed profile-wide, **effect gated on `SessionHeader.cwd`** | custom tools, guards, slash commands, UI |

**Tier 1 — skills (workspace).** Skill roots, in rank order: `<root>/.dsh/skills` (100),
`<root>/.agents/skills` (200), custom (300), `~/.dsh/skills` (400), `~/.agents/skills` (500).
`.claude/skills` is **not** a harness root — this repo's second full copy is invisible to it.
This session's catalog is ~140 skills, ~120 of them the vendored AWS toolkit; frontmatter
supports `disable-model-invocation: true`, which keeps a skill user-invocable while dropping it
from the model catalog (the cost lever). Proposed: budget that catalog, and add
`villa-delivery`, `villa-design-record`, `villa-money`, `villa-fixtures`, `villa-imagery`,
`villa-tokens` — each encodes a rule this repo currently only states in prose.

**Tier 2 — a `villa` preset.** Insert `preset-villa` beside the live `standard`/`ptc`/`minimal`/
`cordis` rows; mount `@deepseek-ai/dsh-persona` with the project persona plus a tool set that
omits `read_image` (this repo forbids screenshots as evidence — "they have wedged sessions").

**Tier 3 — a cwd-gated host plugin,** only for what a preset cannot do. Verified extension
points: `ctx.tools.register` / `guard` (sync deny) / `restrict` (hide), `tools/pre-execute`
(allow/deny/**ask**), `ctx.systemPrompt.section`, `agent.inject`, `ctx.commands.register`.
Candidate tools: `villa_gates` (the four gates), `villa_route_coverage` (every `app/**` route
has its row in `demo-web-route-coverage.md`), `villa_money_audit`, `villa_design_record`.
Candidate guards: deny `read_image`; deny writes under `docs/07-client-villa/paper-forms/`;
ask on `git push` to main or `gh pr merge`.

**Must stay profile-wide:** model routes and credentials, session log, jobs, sandbox/approval
policy, subagents, web access, the skills registry itself — anything that would change another
workspace's behavior. A gated plugin still ships profile-wide code, so version the bundle inside
this repo (e.g. `tools/dsh/`) if it is built.

**Not yet verified (confirm by inspection before implementing):** the exact `ToolGuard` deny
shape for a path-matching rule, and the GUI's preset-selection affordance. Installing a bundle
requires Full access or approval; with approval prompts disabled the install is rejected, and
existing sessions keep the plugin revision they started with, so a preset/plugin change must be
validated in a **new** session.

## 5 · Not done here, deliberately

- No preset, plugin, skill or command was installed — Tiers 1–3 need a decision (and, for the
  plugin, an approval path).
- `docs/README.md` §2's design-record list is a partial roll-call (it does not include
  `page-opening-band-design`, `home-storefront-design` or `storefront-listing-design` either),
  so this record is not added to it.
- No product code, route or contract was touched.
