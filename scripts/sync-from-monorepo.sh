#!/usr/bin/env bash
# ============================================================================
# sync-from-monorepo.sh — refresh this repo (villa-memorial) from the source
# frontend (in-memoriam/web). Run this after the dev merges changes in the
# in-memoriam repo (PR #65 and anything later) so the deployed copy stays in
# step with the real frontend. See SYNC.md.
#
#   ./scripts/sync-from-monorepo.sh                  # uses ../in-memoriam/web
#   ./scripts/sync-from-monorepo.sh /path/to/web     # explicit source
#
# Protected (never touched/removed): docs/, legacy-mockup/, PORT_PLAN.md,
# SYNC.md, FORMS_PLAN.md, .env*.local, node_modules/, .next/, .git/
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SRC="${1:-${IN_MEMORIAM_WEB:-}}"
if [ -z "$SRC" ]; then
  SRC="$(cd .. && pwd)/in-memoriam/web"
fi

if [ ! -f "$SRC/package.json" ] || [ ! -d "$SRC/app" ]; then
  echo "ERROR: source does not look like the frontend app: $SRC" >&2
  echo "Pass the path to in-memoriam/web, e.g. ./scripts/sync-from-monorepo.sh ../in-memoriam/web" >&2
  exit 1
fi

echo "Syncing from: $SRC"
echo "          to: $REPO_ROOT"

EXCLUDES=(
  --exclude='.git/'
  --exclude='node_modules/'
  --exclude='.next/'
  --exclude='.env*.local'
  --exclude='docs/'          # villa-memorial's own docs snapshot + notes
  --exclude='legacy-mockup/' # archived prototype (Gab-controlled, keep)
  --exclude='PORT_PLAN.md'
  --exclude='SYNC.md'
  --exclude='FORMS_PLAN.md'
  --exclude='scripts/'
  # Repo-local edits live in these three files (README migration banner,
  # tsconfig/eslint legacy-mockup excludes) — exclude so a sync cannot revert
  # them. If the source genuinely changes these, merge manually.
  --exclude='README.md'
  --exclude='tsconfig.json'
  --exclude='eslint.config.mjs'
)

if command -v rsync >/dev/null 2>&1; then
  echo "Using rsync (mirror incl. deletions of synced files, protected paths safe)."
  rsync -a --delete "${EXCLUDES[@]}" "$SRC"/ "$REPO_ROOT"/
else
  echo "rsync not found — using cp (newer/updated files only; files removed in the"
  echo "source will NOT be removed here). Install rsync for a true mirror."
  cp -r "${SRC}/app" "${SRC}/components" "${SRC}/lib" "${SRC}/styles" \
        "${SRC}/tests" "${SRC}/public" "${SRC}/stub-gateway" "$REPO_ROOT"/ 2>/dev/null || true
  for f in package.json package-lock.json next.config.mjs \
           vitest.config.ts next-env.d.ts .env.example \
           .gitignore AGENTS.md Dockerfile docker-compose.yml; do
    [ -f "$SRC/$f" ] && cp "$SRC/$f" "$REPO_ROOT/$f"
  done
fi

echo ""
echo "Sync done. Next steps:"
echo "  npm ci            # reinstall if package-lock changed"
echo "  npm run typecheck && npm run test && npm run build"
echo "  git status        # review, then commit with a 'sync from in-memoriam/web' message"
