/**
 * Test isolation for the durable fixture stores.
 *
 * `lib/api-client/order-store.ts`, `catalog-store.ts`, `chapel-store.ts`,
 * `pricing-store.ts`, `billing-store.ts`, `membership-store.ts`, `operations-store.ts`,
 * `content-entries.ts` and `product-lines.ts` default their journals
 * to `.data/` under the app's cwd — which for a developer is the running demo store. A
 * suite that reads a store without pointing it at a throwaway path would then depend on
 * whatever the dev server wrote (an edited catalogue price, a created order, an edited
 * plan rate, a payment taken at the counter, a task ticked on the ops board), so every
 * suite gets fresh temp paths unless it sets its own (a test's own assignment, at module
 * scope or in `beforeEach`, runs after this file and wins).
 */
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const dir = mkdtempSync(path.join(os.tmpdir(), "vm-fixture-stores-"));

const STORE_PATH_ENV_VARS = [
  "ORDERS_STORE_PATH",
  "CATALOG_STORE_PATH",
  "CHAPEL_STORE_PATH",
  "PRICING_STORE_PATH",
  "PAYMENTS_STORE_PATH",
  "MEMBERSHIP_STORE_PATH",
  "OPERATIONS_STORE_PATH",
  "PROVISIONAL_RECEIPTS_STORE_PATH",
  "CONTENT_ENTRIES_STORE_PATH",
  "PRODUCT_LINES_STORE_PATH",
  // Added 2026-09-27 with the enquiries journal. Its omission was caught by
  // `tests/fixture-contract/crm.test.ts`, which asserts `listInquiries()` returns
  // exactly the three recorded rows: once `listInquiries` folded the store, a real
  // enquiry submitted through `/quote` against the dev server made that count four.
  "INQUIRIES_STORE_PATH",
  // Added the same day, when the two CONTENT stores became durable. They were the last
  // pair keeping edits on `globalThis`, which is why page edits did not survive a
  // restart — the exact thing Phase 2 of the client-minutes work fixed.
  "LANDING_STORE_PATH",
  "CONTENT_PAGES_STORE_PATH",
  // Added 2026-09-28 with the burial calendar's write path (client minutes item 2).
  "BURIALS_STORE_PATH",
] as const;

for (const name of STORE_PATH_ENV_VARS) {
  if (!process.env[name]) process.env[name] = path.join(dir, `${name.toLowerCase()}.json`);
}

// The editor's media store is a directory, not a journal file. Point it at the
// same throwaway dir so a suite never reads/writes the dev `.data/media-uploads`.
if (!process.env.MEDIA_UPLOAD_DIR) {
  process.env.MEDIA_UPLOAD_DIR = path.join(dir, "media-uploads");
}

// 2026-09-27: the `globalThis` reset that stood here is GONE, because the two seams it
// reset are gone. Landing content and the page documents were the last two stores keeping
// an edit in process memory; both are durable journals now (`LANDING_STORE_PATH` /
// `CONTENT_PAGES_STORE_PATH`, redirected to temp paths above), so isolation is a file
// path rather than a deleted global. Nothing else in the app stores content on globalThis.
