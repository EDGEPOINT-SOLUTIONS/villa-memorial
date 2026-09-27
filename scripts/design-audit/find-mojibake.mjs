import fs from "node:fs";
import path from "node:path";

/**
 * Find mojibake introduced by a PowerShell round-trip.
 *
 * `Get-Content -Raw` read a UTF-8 file as the ANSI codepage, so `—` (U+2014, three
 * UTF-8 bytes) came back as the three characters `â€”`, and `Set-Content -Encoding
 * UTF8` then wrote THOSE back as UTF-8 — double-encoding every em-dash, arrow and
 * curly quote in the file. The tests caught it: "/services should contain
 * 'Embalming — quoted by the day'" failed against a page that rendered
 * "Embalming â€” quoted by the day".
 *
 * This scans every file for the signature sequences.
 */
const SIGNATURES = [
  ["â€”", "em dash (—)"],
  ["â€“", "en dash (–)"],
  ["â€™", "right single quote (’)"],
  ["â€˜", "left single quote (‘)"],
  ["â€œ", "left double quote (“)"],
  ["â€\x9d", "right double quote (”)"],
  ["â†’", "right arrow (→)"],
  ["â‰¥", ">="],
  ["âˆ’", "minus (−)"],
  ["Ã©", "é"],
  ["Â·", "middle dot (·)"],
  ["Â ", "non-breaking space"],
];

const roots = ["app", "components", "lib", "styles", "tests", "scripts", "docs"];
const hits = [];
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
    else if (/\.(tsx?|css|md|json|mjs)$/.test(e.name)) {
      const text = fs.readFileSync(p, "utf8");
      for (const [sig, what] of SIGNATURES) {
        const n = text.split(sig).length - 1;
        if (n > 0) hits.push({ file: p, what, n });
      }
    }
  }
}
for (const r of roots) walk(r);

const byFile = new Map();
for (const h of hits) {
  const cur = byFile.get(h.file) ?? { total: 0, kinds: [] };
  cur.total += h.n;
  cur.kinds.push(`${h.n}x ${h.what}`);
  byFile.set(h.file, cur);
}

console.log(`files with mojibake: ${byFile.size}\n`);
for (const [f, v] of [...byFile.entries()].sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${String(v.total).padStart(4)}  ${f}`);
  console.log(`        ${v.kinds.join(", ")}`);
}
