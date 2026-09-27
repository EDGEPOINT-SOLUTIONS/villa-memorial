/**
 * portal-recon — the "before" measurement for the agent and family portals.
 *
 * These two surfaces have never been through a design pass, so the first job is
 * to find out HOW they differ from the settled grammar rather than assume. For
 * every route it records the band root in use (the thing that decides the page's
 * opening), the h1's class and size, the type steps actually painted, the
 * container width, overflow, and the painted band order.
 *
 * Usage: node scripts/design-audit/portal-recon.mjs [--tag before|after]
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = "http://localhost:4000";
const tag = process.argv.includes("--tag") ? process.argv[process.argv.indexOf("--tag") + 1] : "before";
const OUT = `.design-audit/portals/${tag}`;
fs.mkdirSync(OUT, { recursive: true });

const PORTALS = [
  {
    name: "agent",
    email: "agent@vm.demo",
    routes: [
      "/agent/dashboard",
      "/agent/prospects",
      // Real fixture ids. The first pass used lead-001/cust-001, which do not
      // exist — those two captures were Next's 404 page wearing the portal
      // chrome, and the recon happily reported `next-error-h1` as their heading.
      // A probe that cannot tell a page from a 404 is not measuring the page.
      "/agent/prospects/prospect-lorna",
      "/agent/clients",
      "/agent/clients/client-marites",
      "/agent/applications",
      "/agent/appointments",
      "/agent/lots",
      "/agent/marketing",
      "/agent/new",
      "/agent/sales",
    ],
  },
  {
    name: "family",
    email: "customer@vm.demo",
    routes: [
      "/client/dashboard",
      "/client/cases",
      "/client/documents",
      "/client/family",
      "/client/memorials",
      "/client/notifications",
      "/client/payments",
      "/client/plans",
      "/client/privacy",
      "/client/profile",
      "/client/property",
      "/client/requests",
      "/client/support",
      "/client/appointments",
    ],
  },
];

const browser = await chromium.launch();
const rows = [];

for (const portal of PORTALS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
  await ctx.request.post("/api/auth/login", {
    data: { email: portal.email, password: "Demo-Passw0rd!" },
  });

  for (const route of portal.routes) {
    const page = await ctx.newPage();
    const rec = { portal: portal.name, route };
    try {
      const res = await page.goto(route, { waitUntil: "networkidle", timeout: 45000 });
      rec.status = res ? res.status() : 0;
      await page.waitForTimeout(200);

      Object.assign(
        rec,
        await page.evaluate(() => {
          const h1 = document.querySelector("h1");
          const cs = h1 ? getComputedStyle(h1) : null;
          // Which band opens the page? These are the families that exist today.
          const BANDS = [
            ["page-header", ".page-header"],
            ["public-hero", ".public-hero"],
            ["ag-hero", ".ag-hero"],
            ["ia-hero", ".ia-hero"],
            ["paper-hero", ".paper-hero"],
            ["hero-premium", ".hero-premium"],
            ["app-shell", ".app-shell"],
          ];
          const band = BANDS.find(([, sel]) => document.querySelector(sel));
          // The distinct type sizes actually painted on text nodes.
          const sizes = new Set();
          let offLadder = 0;
          for (const el of document.querySelectorAll("h1,h2,h3,h4,p,li,td,th,a,span,dd,dt,label,button")) {
            if (!el.textContent || !el.textContent.trim()) continue;
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (!fs) continue;
            sizes.add(Math.round(fs * 10) / 10);
            if (fs < 12) offLadder++;
          }
          const sections = [...document.querySelectorAll("main section, .app-main > section")];
          return {
            h1: h1 ? h1.textContent.trim().slice(0, 44) : null,
            h1count: document.querySelectorAll("h1").length,
            h1cls: h1 ? String(h1.className) : null,
            h1size: cs ? cs.fontSize : null,
            band: band ? band[0] : "(none)",
            sizes: [...sizes].sort((a, b) => a - b),
            under12: offLadder,
            sections: sections.length,
            sectionClasses: sections.slice(0, 6).map((s) => String(s.className).split(" ")[0]),
            width: document.querySelector("main, .app-main")?.getBoundingClientRect().width ?? null,
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            cards: document.querySelectorAll(".card, .kpi-card, .shop-card, .post-card, .item-card").length,
            tables: document.querySelectorAll("table").length,
            // The signature, in all three of its homes: the public kicker's own
            // ::before, and the portals' band head. The first pass only counted
            // `.section-head__kicker`, so it reported 0/25 for portals that DID
            // paint the rule — a metric that cannot see the thing it measures.
            hasSignature:
              [...document.querySelectorAll(".section-head__kicker")].length +
              [...document.querySelectorAll(".ag-sec__head .ag-h2")].filter(
                (e) => getComputedStyle(e, "::before").width !== "auto"
              ).length,
            innerWidth: Math.round(
              (document.querySelector(".portal-content__inner") ?? document.body).getBoundingClientRect().width
            ),
          };
        })
      );
      await page.screenshot({ path: `${OUT}/${route.replace(/\//g, "_").replace(/^_/, "")}.png` });
    } catch (e) {
      rec.error = String(e).slice(0, 80);
    }
    await page.close();
    rows.push(rec);
  }
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/recon.json`, JSON.stringify(rows, null, 1));

const W = 34;
console.log(`${tag.toUpperCase()} — ${rows.length} portal routes\n`);
console.log(
  "route".padEnd(W) + "band".padEnd(14) + "h1".padEnd(7) + "h1cls".padEnd(24) + "sign  sec  cards  ovf"
);
console.log("-".repeat(W + 14 + 7 + 24 + 26));
for (const r of rows) {
  console.log(
    r.route.padEnd(W) +
      String(r.band ?? r.error ?? "?").padEnd(14) +
      String(r.h1count ?? "?").padEnd(7) +
      String(r.h1cls ?? "-").slice(0, 22).padEnd(24) +
      String(r.hasSignature ?? "-").padEnd(6) +
      String(r.sections ?? "-").padEnd(5) +
      String(r.cards ?? "-").padEnd(7) +
      String(r.overflowX ?? "-")
  );
}

const bands = {};
for (const r of rows) bands[r.band] = (bands[r.band] || 0) + 1;
console.log("\nopening band in use:");
for (const [b, n] of Object.entries(bands).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${b}`);

const sig = rows.filter((r) => (r.hasSignature ?? 0) > 0).length;
console.log(`\nroutes with the margin-rule signature: ${sig}/${rows.length}`);
const bad = rows.filter((r) => (r.h1count ?? 1) !== 1);
console.log(`routes without exactly one h1: ${bad.length}${bad.length ? " -> " + bad.map((r) => r.route).join(", ") : ""}`);
const u12 = rows.filter((r) => (r.under12 ?? 0) > 0);
console.log(`routes with sub-12px text: ${u12.length}${u12.length ? " -> " + u12.map((r) => r.route).join(", ") : ""}`);
console.log(`\nshots -> ${OUT}`);
