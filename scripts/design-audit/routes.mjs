/**
 * routes — the static route list the design-audit tools measure.
 *
 * WHY THIS EXISTS. Every tool in this folder read `.design-audit/routes.json`, an
 * artifact NOTHING in the repo produced (the folder is gitignored). On a clean
 * checkout the whole audit chain died at its first read — a tool that cannot run
 * is not evidence. The list is derivable from the app tree, so it is derived here:
 * one source, no phantom file.
 *
 * DYNAMIC SEGMENTS (`[id]`) stay in the list and the callers filter them out. The
 * audit's crawl supplies the real detail routes; a `[`-filtered static list alone
 * would mark every detail-only rule as dead, which is how a coverage sweep turns
 * into a wrecking ball (see `css-coverage.mjs`).
 *
 * Usage: node scripts/design-audit/routes.mjs   # writes .design-audit/routes.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Every static URL the App Router serves, from `app/**\/page.tsx`. */
export function staticRoutes() {
  const out = new Set();

  function walk(dir, url) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith("_")) continue;
      if (e.isDirectory()) {
        // Route groups like `(public)` shape the tree but not the URL.
        const segment = /^\(.*\)$/.test(e.name) ? "" : `/${e.name}`;
        walk(path.join(dir, e.name), url + segment);
      } else if (e.name === "page.tsx" || e.name === "page.jsx") {
        out.add(url === "" ? "/" : url);
      }
    }
  }

  walk("app", "");
  return [...out].filter((r) => !r.startsWith("/api")).sort();
}

/** Write the artifact the older callers expected (kept for `focus.mjs`/`typography.mjs`). */
export function writeRoutesFile() {
  fs.mkdirSync(".design-audit", { recursive: true });
  const routes = staticRoutes();
  fs.writeFileSync(
    ".design-audit/routes.json",
    JSON.stringify({ staticRoutes: routes }, null, 1),
  );
  return routes;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invoked) {
  const routes = writeRoutesFile();
  console.log(`wrote .design-audit/routes.json (${routes.length} static routes)`);
}
