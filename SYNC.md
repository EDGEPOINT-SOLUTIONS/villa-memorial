# SYNC.md — keeping villa-memorial in step with the real frontend

villa-memorial is a **deployment copy** of the production frontend, whose source
of truth lives in the `in-memoriam` repo (`in-memoriam/web`). The dev merges
changes there (e.g. PR #65 and later frontend work). This repo is refreshed by
re-copying that app in — never by hand-editing feature-by-feature.

## When to sync
- After the dev merges any `web/` change in the `in-memoriam` repo (PR #65 first).
- After contract/fixture updates that the frontend depends on.

## How
```bash
./scripts/sync-from-monorepo.sh                 # default source: ../in-memoriam/web
./scripts/sync-from-monorepo.sh /full/path/to/web
```

## What the sync protects (never overwritten/removed)
| Path | Why |
|---|---|
| `docs/` | The platform snapshot + the villa-local records — the edit and refresh rules live in [`docs/README.md`](docs/README.md) |
| `legacy-mockup/` | The archived blue/gold prototype (design reference) |
| `PORT_PLAN.md`, `SYNC.md`, `FORMS_PLAN.md` | Repo-local plans/decisions |
| `scripts/` | Repo-local tooling (this script) |
| `README.md`, `tsconfig.json`, `eslint.config.mjs` | Carry repo-local edits (migration banner; `legacy-mockup` excludes) — merge upstream changes to these by hand |
| `.env*.local` | Local secrets/live-mode config |
| `node_modules/`, `.next/`, `.git/` | Ignored/local |

If `rsync` is installed the sync is a true mirror (files deleted in the source
are deleted here). Without rsync it falls back to `cp` (updates only; no
deletions) — install rsync (e.g. `winget install rsync` / Git Bash bundle) for
the exact behavior.

## After syncing
```bash
npm ci
npm run typecheck
npm run test      # 105 fixture-contract + unit tests
npm run build
git status        # review the diff
```
Commit with a message like: `sync from in-memoriam/web (PR #65) — <what changed>`.

> Rule: never run the sync with uncommitted repo-local edits to protected files
> you want to keep — they are safe, but review `git status` before committing.
