import fs from "node:fs";
import path from "node:path";

/**
 * Which `.sv-*` classes have any markup at all?
 *
 * Three guards failed when the dead `.sv-chapel*` CSS was removed, because they
 * LISTED those selectors as shipped surfaces. The question that raises: if a test
 * can pin a selector whose markup was deleted, how many of the other `.sv-*`
 * selectors in those same lists are dead too? A guard that names a dead selector
 * keeps dead CSS looking alive to anyone who greps for usages.
 */
const srcFiles = [];
function walk(d) {
  let entries;
  try {
    entries = fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (["node_modules", ".next", ".git", ".design-audit"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx$/.test(e.name)) srcFiles.push(p);
  }
}
for (const d of ["app", "components"]) walk(d);
const source = srcFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

const css = fs.readFileSync("styles/components.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const classes = new Set();
for (const m of css.matchAll(/\.(sv-[a-zA-Z0-9_-]+)/g)) classes.add(m[1]);

const rows = [];
for (const c of [...classes].sort()) {
  const re = new RegExp(`(?<![\\w-])${c.replace(/[-]/g, "\\-")}(?![\\w-])`);
  rows.push({ cls: c, inMarkup: re.test(source) });
}

const dead = rows.filter((r) => !r.inMarkup);
console.log(`.sv-* classes declared in components.css : ${rows.length}`);
console.log(`  referenced in markup                    : ${rows.length - dead.length}`);
console.log(`  NEVER referenced in markup (dead)       : ${dead.length}\n`);
for (const d of dead) console.log(`  .${d.cls}`);
