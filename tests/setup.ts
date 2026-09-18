/**
 * Test isolation for the durable fixture stores.
 *
 * `lib/api-client/order-store.ts`, `catalog-store.ts`, `chapel-store.ts`,
 * `pricing-store.ts`, `billing-store.ts`, `membership-store.ts` and `operations-store.ts`
 * default their journals
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
] as const;

for (const name of STORE_PATH_ENV_VARS) {
  if (!process.env[name]) process.env[name] = path.join(dir, `${name.toLowerCase()}.json`);
}
