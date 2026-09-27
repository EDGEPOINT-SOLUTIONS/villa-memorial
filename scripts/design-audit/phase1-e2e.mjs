import { chromium } from "@playwright/test";
import fs from "node:fs";

/**
 * THE END-TO-END PROOF for Phase 1.
 *
 * A family submits the real Request-for-Quote form in a real browser, and then the
 * office opens its real Inquiries board in a different session and reads the request.
 *
 * This is the exact journey that was broken: the form wrote into the visitor's own
 * browser and said "Nothing was sent to a server", so the second half of this script
 * could never have found anything. Unit tests cannot prove the pair together â€” they
 * exercise the route and the reader, not a browser POSTing a form and a signed-in staff
 * page rendering the result.
 */
const BASE = "http://localhost:4000";
const STORE = ".data/crm-inquiries.json";

const STAMP = `E2E-${Date.now()}`;
const SUBMISSION = {
  name: `Maria Dela Cruz ${STAMP}`,
  email: "maria.e2e@example.com",
  phone: "+63 917 555 0000",
  service: "Embalming",
  preferred: "2026-10-05",
  notes: `Please call after 6pm. ${STAMP}`,
};

const browser = await chromium.launch();

/* ---------------------------- 1 Â· the family ----------------------------- */

const family = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: BASE });
const page = await family.newPage();
await page.goto("/quote", { waitUntil: "networkidle", timeout: 45000 });

await page.fill("#qr-name", SUBMISSION.name);
await page.fill("#qr-email", SUBMISSION.email);
await page.fill("#qr-phone", SUBMISSION.phone);

// The service field carries a datalist; typing is what a family does.
const service = page.locator("#qr-service");
await service.fill(SUBMISSION.service);
const date = page.locator("#qr-date");
if (await date.count()) await date.fill(SUBMISSION.preferred);
await page.fill("#qr-notes", SUBMISSION.notes);
await page.check("#qr-consent");

const [response] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/inquiries") && r.request().method() === "POST", { timeout: 20000 }),
  page.getByRole("button", { name: /send|request|submit/i }).first().click(),
]);

console.log(`=== 1 Â· the family submits /quote ===`);
console.log(`  POST /api/inquiries -> HTTP ${response.status()}`);

await page.waitForTimeout(700);
const confirmation = (await page.locator("body").innerText()).replace(/\s+/g, " ");
const claimsDelivered = /reached the office/i.test(confirmation);
const stillClaimsBrowser = /nothing was sent to a server|captured in this browser/i.test(confirmation);
console.log(`  confirmation claims the office has it : ${claimsDelivered}`);
console.log(`  still claims nothing was sent          : ${stillClaimsBrowser}   (want false)`);
const reference = /recorded as\s*(INQ-\d{4}-\d{5})/i.exec(confirmation)?.[1] ?? null;
console.log(`  reference shown to the family          : ${reference ?? "NOT SHOWN"}`);

/* ---------------------------- 2 Â· the store ------------------------------ */

console.log(`\n=== 2 Â· the office's store on disk ===`);
const onDisk = fs.existsSync(STORE) ? fs.readFileSync(STORE, "utf8") : "";
console.log(`  ${STORE} exists : ${onDisk.length > 0}`);
// The file is UTF-8; read it as such and look for our stamp.
console.log(`  contains this submission : ${onDisk.includes(STAMP)}`);

/* ---------------------------- 3 Â· the office ----------------------------- */

console.log(`\n=== 3 Â· the office opens its Inquiries board ===`);
const staff = await browser.newContext({ viewport: { width: 1440, height: 1200 }, baseURL: BASE });
const login = await staff.request.post(`${BASE}/api/auth/login`, {
  data: { email: "staff@vm.demo", password: "Demo-Passw0rd!" },
});
console.log(`  sign-in -> HTTP ${login.status()}`);

const board = await staff.newPage();
const boardResponse = await board.goto("/staff/inquiries", { waitUntil: "networkidle", timeout: 45000 });
console.log(`  GET /staff/inquiries -> HTTP ${boardResponse?.status()}`);
await board.waitForTimeout(400);

const boardText = (await board.locator("body").innerText()).replace(/\s+/g, " ");
const found = boardText.includes(STAMP);
console.log(`  the board shows this family's name   : ${boardText.includes(SUBMISSION.name)}`);
console.log(`  the board shows the PREFERRED DATE   : ${boardText.includes("Preferred date: 2026-10-05")}`);
console.log(`  the board shows the REQUIREMENTS     : ${boardText.includes("Please call after 6pm")}`);
console.log(`  (stamp found anywhere on the board)  : ${found}`);

await board.screenshot({ path: ".design-audit/phase1-board.png", fullPage: true });

await family.close();
await staff.close();
await browser.close();

const pass = claimsDelivered && !stillClaimsBrowser && reference && onDisk.includes(STAMP) && boardText.includes("Preferred date: 2026-10-05") && boardText.includes("Please call after 6pm");
console.log(`\n${pass ? "PASS" : "FAIL"} â€” a family's quote request reached the office's board, with its date and requirements.`);
process.exit(pass ? 0 : 1);
