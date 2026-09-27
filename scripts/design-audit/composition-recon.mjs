/**
 * composition-recon — measure each portal page's USE OF SPACE, not just its look.
 *
 * The shell is unified; what is not yet reviewed is how each screen composes the
 * room it is given. This records, per route: the content area vs the column that
 * actually paints inside it (the dead space), the page's height, how many bands
 * it stacks, and whether the column is one long single track.
 *
 * Usage: node scripts/design-audit/composition-recon.mjs [--tag before|after]
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = "http://localhost:4000";
const tag = process.argv.includes("--tag") ? process.argv[process.argv.indexOf("--tag") + 1] : "before";
const OUT = `.design-audit/composition/${tag}`;
fs.mkdirSync(OUT, { recursive: true });

const PORTALS = [
  {
    name: "agent",
    email: "agent@vm.demo",
    routes: ["/agent/dashboard", "/agent/prospects", "/agent/clients", "/agent/appointments", "/agent/sales", "/agent/lots", "/agent/applications", "/agent/marketing", "/agent/new"],
  },
  {
    name: "family",
    email: "customer@vm.demo",
    routes: ["/client/dashboard", "/client/cases", "/client/documents", "/client/payments", "/client/profile", "/client/family", "/client/plans", "/client/support", "/client/property", "/client/memorials", "/client/privacy", "/client/requests", "/client/notifications", "/client/appointments"],
  },
];

const browser = await chromium.launch();
const rows = [];

for (const portal of PORTALS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: BASE });
  await ctx.request.post("/api/auth/login", { data: { email: portal.email, password: "Demo-Passw0rd!" } });
  for (const route of portal.routes) {
    const page = await ctx.newPage();
    try {
      await page.goto(route, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => {
        const area = document.querySelector(".portal-content");
        const inner = document.querySelector(".portal-content__inner");
        const a = area ? area.getBoundingClientRect() : null;
        const i = inner ? inner.getBoundingClientRect() : null;
        const areaInterior = a ? a.width - parseFloat(getComputedStyle(area).paddingLeft) * 2 : 0;
        // the bands in the page column
        const bands = [...document.querySelectorAll(".ag-page > *")];
        const gaps = [];
        for (let n = 1; n < bands.length; n++) {
          gaps.push(Math.round(bands[n].getBoundingClientRect().top - bands[n - 1].getBoundingClientRect().bottom));
        }
        // the tallest band and its share of the page
        const heights = bands.map((b) => Math.round(b.getBoundingClientRect().height));
        const doc = document.documentElement.scrollHeight;
        // does anything paint in the horizontal space beside a band?
        const widest = Math.max(...bands.map((b) => Math.round(b.getBoundingClientRect().width)), 0);
        return {
          areaInterior: Math.round(areaInterior),
          inner: i ? Math.round(i.width) : null,
          deadRight: i && a ? Math.round(areaInterior - i.width) : null,
          pageHeight: doc,
          bands: bands.length,
          heights,
          tallest: heights.length ? Math.max(...heights) : 0,
          tallestShare: heights.length ? Math.round((Math.max(...heights) / doc) * 100) : 0,
          bandWidth: widest,
          gaps: gaps.slice(0, 8),
        };
      });
      rows.push({ portal: portal.name, route, ...r });
      await page.screenshot({ path: `${OUT}/${route.replace(/\//g, "_").replace(/^_/, "")}.png` });
    } catch (e) {
      rows.push({ portal: portal.name, route, error: String(e).slice(0, 60) });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

fs.writeFileSync(`${OUT}/composition.json`, JSON.stringify(rows, null, 1));

console.log(`${tag.toUpperCase()} — composition\n`);
console.log("route".padEnd(30) + "area  inner dead  page  bands tallest share%  gaps");
console.log("-".repeat(88));
for (const r of rows) {
  if (r.error) { console.log(r.route.padEnd(30) + " ERROR " + r.error); continue; }
  console.log(
    r.route.padEnd(30) +
      String(r.areaInterior).padEnd(6) +
      String(r.inner).padEnd(6) +
      String(r.deadRight).padEnd(6) +
      String(r.pageHeight).padEnd(6) +
      String(r.bands).padEnd(6) +
      String(r.tallest).padEnd(8) +
      String(r.tallestShare).padEnd(7) +
      r.gaps.join(",")
  );
}

const ok = rows.filter((r) => !r.error);
const avgDead = Math.round(ok.reduce((a, r) => a + (r.deadRight ?? 0), 0) / ok.length);
console.log(`\naverage dead space to the right of the column: ${avgDead}px`);
console.log(`tallest page: ${Math.max(...ok.map((r) => r.pageHeight))}px  (${ok.reduce((a, r) => (r.pageHeight > a.pageHeight ? r : a), ok[0]).route})`);
console.log(`single-band pages: ${ok.filter((r) => r.bands <= 1).length}`);
console.log(`\nshots -> ${OUT}`);
