/**
 * color-fingerprint — prove a token refactor changed nothing a person can see.
 *
 * A token rename is supposed to be invisible. This records, for every element on
 * a set of representative routes, the RESOLVED colour of each painting property
 * (in DOM order), and writes a fingerprint. Run it before and after the refactor
 * and diff the two files: any difference is a real visual change.
 *
 * Usage:  node scripts/design-audit/color-fingerprint.mjs <out.json> [--base URL]
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";

const out = process.argv[2];
if (!out) {
  console.error("usage: color-fingerprint.mjs <out.json> [--base URL]");
  process.exit(1);
}
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:4000";

// A spread of surfaces: the token families are used differently on each.
const ROUTES = [
  "/",
  "/lots",
  "/immediate-assistance",
  "/price-list",
  "/services",
  "/staff/dashboard",
  "/staff/pricing",
  "/client/dashboard",
  "/agent/dashboard",
];

const PROPS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "outlineColor",
  "textDecorationColor",
  "columnRuleColor",
  "caretColor",
  "fill",
  "stroke",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
const login = await ctx.request.post("/api/auth/login", {
  data: { email: "admin@vm.demo", password: "Demo-Passw0rd!" },
});
if (!login.ok()) console.error(`login failed: ${login.status()}`);

const fingerprint = {};

for (const route of ROUTES) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(200);
  const rows = await page.evaluate((props) => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      out.push(props.map((p) => cs[p] || "").join("|"));
    }
    return out;
  }, PROPS);
  // a hash per route keeps the file small; the count proves the DOM matched too
  fingerprint[route] = { elements: rows.length, rows };
  await page.close();
}

await browser.close();
fs.writeFileSync(out, JSON.stringify(fingerprint, null, 2));
const total = Object.values(fingerprint).reduce((a, v) => a + v.elements, 0);
console.log(`fingerprinted ${Object.keys(fingerprint).length} routes, ${total} elements → ${out}`);
