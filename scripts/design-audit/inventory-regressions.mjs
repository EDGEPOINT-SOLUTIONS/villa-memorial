import fs from "node:fs";

/**
 * The audit as an inventory of what the lost portal CSS was holding up.
 *
 * The session's portal restyle is gone (the encoding round-trip corrupted the
 * stylesheet, and the restore-from-HEAD that fixed the encoding also discarded the
 * uncommitted work). The compiled copy that could have been mined was overwritten
 * by later builds. So the fixes have to come from evidence rather than from a
 * diff — and the audit carries that evidence route by route.
 */
const rows = JSON.parse(fs.readFileSync(".design-audit/report.json", "utf8"));

const overflow = [];
const tiny = [];
const contrast = [];
for (const r of rows) {
  if (r.overflowX > 0) overflow.push({ route: r.route, vp: r.viewport, by: r.overflowX });
  for (const t of r.smallType ?? []) tiny.push({ route: r.route, vp: r.viewport, ...t });
  for (const c of r.contrast ?? []) contrast.push({ route: r.route, vp: r.viewport, ...c });
}

console.log(`=== HORIZONTAL OVERFLOW: ${overflow.length} captures ===`);
const byAmount = [...overflow].sort((a, b) => b.by - a.by);
for (const o of byAmount.slice(0, 18)) console.log(`  ${String(o.by).padStart(4)}px  ${o.vp.padEnd(6)}  ${o.route}`);

console.log(`\n=== TYPE BELOW 12px: ${tiny.length} captures ===`);
const tinyBy = new Map();
for (const t of tiny) {
  const k = t.selector ?? t.text ?? JSON.stringify(t).slice(0, 60);
  if (!tinyBy.has(k)) tinyBy.set(k, { n: 0, routes: new Set(), size: t.size });
  const e = tinyBy.get(k);
  e.n++;
  e.routes.add(t.route);
}
for (const [k, v] of [...tinyBy.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 14)) {
  console.log(`  ${String(v.n).padStart(3)}x  ${String(v.size).padEnd(7)}  ${k.slice(0, 62)}`);
  console.log(`        routes: ${[...v.routes].slice(0, 4).join(", ")}`);
}

console.log(`\n=== CONTRAST: ${contrast.length} flags, flat ground first ===`);
for (const c of contrast.filter((x) => !x.overImage).slice(0, 16)) {
  console.log(`  ${String(c.ratio ?? "?").padEnd(7)}  ${c.vp.padEnd(6)}  ${String(c.selector ?? "").slice(0, 40).padEnd(42)}  ${c.route}`);
}
