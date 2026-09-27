import { chromium } from "@playwright/test";
import fs from "node:fs";

/**
 * PHASE 2'S PROOF: a staff page edit survives a server restart.
 *
 * This is the claim the change exists to make, and a unit test cannot show it â€” a unit
 * test shares one process, which is exactly the illusion the old `globalThis` store
 * created: the edit was visible to the request that saved it and to nothing after a
 * restart.
 *
 * Run in two modes with a real restart in between (the caller restarts :4000):
 *
 *   node .design-audit/phase2-restart-proof.mjs save     # writes the edit, prints the stamp
 *   <kill the server, start a new one>
 *   node .design-audit/phase2-restart-proof.mjs verify --stamp "<the stamp>"
 *
 * `save` also confirms the edit is ON DISK, so a `verify` failure can be attributed to the
 * restart rather than to a save that never happened.
 *
 * Plain JS on purpose â€” this is a diagnostic, not app code, so it carries no TypeScript.
 */
const BASE = "http://localhost:4000";
const PAGES_STORE = ".data/content-pages.json";
const mode = process.argv[2];
const stampArg = process.argv.includes("--stamp") ? process.argv[process.argv.indexOf("--stamp") + 1] : null;
const STAMP = stampArg ?? `Restart proof ${Date.now()}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: BASE });
const login = await ctx.request.post(`${BASE}/api/auth/login`, {
  data: { email: "admin@vm.demo", password: "Demo-Passw0rd!" },
});
if (login.status() !== 200) {
  console.error(`FAIL â€” staff sign-in answered HTTP ${login.status()}`);
  await browser.close();
  process.exit(1);
}

async function documents() {
  const res = await ctx.request.get(`${BASE}/api/content/pages`);
  if (!res.ok()) throw new Error(`GET /api/content/pages -> HTTP ${res.status()}`);
  return (await res.json()).documents;
}

async function parkHeadline() {
  const docs = await documents();
  const park = docs.find((d) => d.key === "park");
  return park ? park.hero.headline : null;
}

if (mode === "save") {
  console.log(`  headline before the edit : ${JSON.stringify(await parkHeadline())}`);
  const park = (await documents()).find((d) => d.key === "park");
  const save = await ctx.request.post(`${BASE}/api/content/pages`, {
    data: { key: "park", document: { ...park, hero: { ...park.hero, headline: STAMP } } },
  });
  console.log(`  POST /api/content/pages -> HTTP ${save.status()}`);
  if (save.status() !== 200) {
    console.error(`    server said: ${(await save.text()).slice(0, 200)}`);
    await browser.close();
    process.exit(1);
  }
  // Same process: the read must see it (the part globalThis also achieved).
  console.log(`  served back in the same process : ${JSON.stringify(await parkHeadline())}`);
  // And it must be ON DISK (the part globalThis never did).
  const onDisk = fs.existsSync(PAGES_STORE) && fs.readFileSync(PAGES_STORE, "utf8").includes(STAMP);
  console.log(`  present in ${PAGES_STORE} : ${onDisk}`);
  console.log(`\nSTAMP=${STAMP}`);
  await browser.close();
  process.exit(onDisk ? 0 : 1);
}

if (mode === "verify") {
  if (!stampArg) {
    console.error("FAIL â€” verify needs --stamp");
    await browser.close();
    process.exit(1);
  }
  const headline = await parkHeadline();
  console.log(`  headline after the restart : ${JSON.stringify(headline)}`);
  await browser.close();
  const survived = headline === STAMP;
  console.log(
    `\n${survived ? "PASS" : "FAIL"} â€” a staff page edit ${survived ? "SURVIVED" : "did NOT survive"} a server restart.`,
  );
  console.log(
    survived
      ? "  Before this change the same edit lived on globalThis and would have reverted to the seed here."
      : "  The edit was lost â€” the store is still not durable.",
  );
  process.exit(survived ? 0 : 1);
}

console.error("usage: phase2-restart-proof.mjs save | verify --stamp <stamp>");
await browser.close();
process.exit(2);
