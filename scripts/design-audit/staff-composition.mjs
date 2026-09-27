/**
 * staff-composition — the Admin Portal's use of space, per route.
 *
 * The portals went through `composition-recon`; the Admin Portal has only been
 * checked at `/staff/ops` (its rhythm). It has by far the most routes, so it is
 * where an unreviewed composition problem is most likely to be hiding. This
 * measures the same signals against the staff shell (`.app-main`).
 *
 * Usage: node scripts/design-audit/staff-composition.mjs [--tag before|after]
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = "http://localhost:4000";
const tag = process.argv.includes("--tag") ? process.argv[process.argv.indexOf("--tag") + 1] : "before";
const OUT = `.design-audit/staff-composition/${tag}`;
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  "/staff/dashboard", "/staff/ops", "/staff/cases", "/staff/schedule", "/staff/dispatch",
  "/staff/work-orders", "/staff/hr", "/staff/documents", "/staff/customers", "/staff/inquiries",
  "/staff/pipeline", "/staff/landing", "/staff/catalog", "/staff/pricing", "/staff/inventory",
  "/staff/orders", "/staff/plans/membership", "/staff/billing", "/staff/accounting",
  "/staff/commission", "/staff/reports", "/staff/notifications", "/staff/copilot",
  "/staff/users", "/staff/workflows", "/staff/settings", "/staff/property",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: BASE });
await ctx.request.post("/api/auth/login", { data: { email: "admin@vm.demo", password: "Demo-Passw0rd!" } });

const rows = [];
for (const route of ROUTES) {
  const page = await ctx.newPage();
  try {
    await page.goto(route, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const main = document.querySelector(".app-main");
      const inner = main?.querySelector(".container, .stack-4, .stack-3, div") ?? main;
      const m = main ? main.getBoundingClientRect() : null;
      const i = inner ? inner.getBoundingClientRect() : null;
      const pad = main ? parseFloat(getComputedStyle(main).paddingLeft) * 2 : 0;
      const interior = m ? m.width - pad : 0;
      // the bands: main's own children
      const bands = main ? [...main.children] : [];
      const heights = bands.map((b) => Math.round(b.getBoundingClientRect().height));
      const widest = Math.max(...bands.map((b) => Math.round(b.getBoundingClientRect().width)), 0);
      const doc = document.documentElement.scrollHeight;
      return {
        interior: Math.round(interior),
        column: i ? Math.round(i.width) : null,
        widest,
        dead: Math.round(interior - widest),
        pageHeight: doc,
        bands: bands.length,
        tallest: heights.length ? Math.max(...heights) : 0,
        tallestShare: heights.length ? Math.round((Math.max(...heights) / doc) * 100) : 0,
      };
    });
    rows.push({ route, ...r });
    await page.screenshot({ path: `${OUT}/${route.replace(/\//g, "_").replace(/^_/, "")}.png` });
  } catch (e) {
    rows.push({ route, error: String(e).slice(0, 50) });
  }
  await page.close();
}
await ctx.close();
await browser.close();

fs.writeFileSync(`${OUT}/staff-composition.json`, JSON.stringify(rows, null, 1));

console.log(`${tag.toUpperCase()} — Admin Portal composition\n`);
console.log("route".padEnd(28) + "interior  column  widest  dead  page   bands tallest share%");
console.log("-".repeat(88));
for (const r of rows) {
  if (r.error) { console.log(r.route.padEnd(28) + "ERROR " + r.error); continue; }
  console.log(
    r.route.padEnd(28) + String(r.interior).padEnd(10) + String(r.column).padEnd(8) + String(r.widest).padEnd(8) +
      String(r.dead).padEnd(6) + String(r.pageHeight).padEnd(7) + String(r.bands).padEnd(6) + String(r.tallest).padEnd(8) + r.tallestShare
  );
}
const ok = rows.filter((r) => !r.error);
const avgDead = Math.round(ok.reduce((a, r) => a + r.dead, 0) / ok.length);
console.log(`\naverage dead space right of the widest band: ${avgDead}px`);
const worst = [...ok].sort((a, b) => b.tallestShare - a.tallestShare).slice(0, 5);
console.log("most single-band-dominated pages:");
for (const w of worst) console.log(`  ${String(w.tallestShare).padStart(3)}%  ${w.route.padEnd(30)} tallest ${w.tallest}px of ${w.pageHeight}px`);
console.log(`\nshots -> ${OUT}`);
