import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";
import { writeJournalEvents } from "@/lib/api-client/journal";
import {
  createCaseRecord,
  loadStoredCaseFold,
} from "@/lib/api-client/operations-store";
import { listCases } from "@/lib/api-client/operations";
import { listFixtureAdminOrders, orderStorePath } from "@/lib/api-client/order-store";
import { loadChapelAdminState, chapelStorePath } from "@/lib/api-client/chapel-store";
import { catalogStorePath, listCatalogRecords } from "@/lib/api-client/catalog-store";

/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/operations/cases.json", async () => ({
  default: (await import("../fixtures/operations-cases-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */

/**
 * Orphan-events tolerance found on staging (2026-10-03): an ENOSPC-interrupted write
 * left the operations journal holding a task event for a case the store no longer had,
 * and every read of the case store then failed with a 500 — so "Send to case" could not
 * open the case it had just made.
 *
 * What is pinned here:
 *  · an orphan event (a case/task a journal names but the fold does not carry) is SKIPPED
 *    and COUNTED, and every good record still reads;
 *  · the journal is never silently rewritten — the orphan row stays for diagnosis;
 *  · the orphan is named on the server log (kind + referenced parent);
 *  · a genuinely malformed journal still refuses loudly (it is corruption, not an orphan);
 *  · a failed write surfaces the OS reason on the server-side error while the message the
 *    visitor sees stays the generic, plain sentence.
 *
 * The three sibling journals with the same parent-reference pattern (chapel, order,
 * catalogue) get the same treatment; the stores checked and found NOT to share it are
 * listed in docs/08-delivery/store-tolerance-design/README.md.
 */

let dir: string;
let casesStore: string;

const ORPHAN_CASE = "CASE-2026-9999";

/** A journal file with one event, written directly so the store must fold it. */
async function writeJournal(store: string, events: unknown[]): Promise<void> {
  await writeFile(store, JSON.stringify({ version: 1, events }, null, 2) + "\n", "utf8");
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-store-tolerance-"));
  casesStore = path.join(dir, "cases.json");
  process.env.OPERATIONS_STORE_PATH = casesStore;
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  process.env.CHAPEL_STORE_PATH = path.join(dir, "chapel.json");
  process.env.CATALOG_STORE_PATH = path.join(dir, "catalog.json");
});

afterEach(async () => {
  delete process.env.OPERATIONS_STORE_PATH;
  delete process.env.ORDERS_STORE_PATH;
  delete process.env.CHAPEL_STORE_PATH;
  delete process.env.CATALOG_STORE_PATH;
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

function silentConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => undefined);
}

describe("the case store tolerates an orphan event", () => {
  it("skips a task event for an unknown case, keeps every good case, and counts it", async () => {
    await writeJournal(casesStore, [
      {
        kind: "task_status_set",
        at: "2026-10-03T00:00:00.000Z",
        case_number: ORPHAN_CASE,
        task_id: `${ORPHAN_CASE}-t1`,
        status: "done",
      },
    ]);
    const spy = silentConsoleError();

    // The dead screen is gone: the office reads all seven recorded cases.
    const cases = await listCases();
    expect(cases).toHaveLength(7);

    // The count is where a developer reads it, and the event is named on the log.
    const fold = await loadStoredCaseFold();
    expect(fold.cases).toHaveLength(7);
    expect(fold.skipped).toEqual([
      {
        kind: "task_status_set",
        at: "2026-10-03T00:00:00.000Z",
        parent: "case_number",
        reference: ORPHAN_CASE,
      },
    ]);
    expect(
      spy.mock.calls.some(
        ([line]) => String(line).includes("case store") && String(line).includes(ORPHAN_CASE),
      ),
    ).toBe(true);
  });

  it("skips a task event naming a task the case does not carry, and keeps the case", async () => {
    const target = "CASE-2026-0006";
    await writeJournal(casesStore, [
      {
        kind: "task_status_set",
        at: "2026-10-03T00:00:00.000Z",
        case_number: target,
        task_id: `${target}-t99`,
        status: "done",
      },
    ]);
    silentConsoleError();

    const cases = await listCases();
    expect(cases.find((c) => c.case_number === target)).toBeDefined();
    const fold = await loadStoredCaseFold();
    expect(fold.cases).toHaveLength(7);
    expect(fold.skipped).toEqual([
      {
        kind: "task_status_set",
        at: "2026-10-03T00:00:00.000Z",
        parent: "task_id",
        reference: `${target}-t99`,
      },
    ]);
  });

  it("does not silently rewrite the orphan out of the journal on the next write", async () => {
    await writeJournal(casesStore, [
      {
        kind: "task_status_set",
        at: "2026-10-03T00:00:00.000Z",
        case_number: ORPHAN_CASE,
        task_id: `${ORPHAN_CASE}-t1`,
        status: "done",
      },
    ]);
    silentConsoleError();

    await createCaseRecord({ deceased_name: "Diagnosis Test" });

    const raw = JSON.parse(await readFile(casesStore, "utf8")) as {
      events: Array<{ case_number?: string }>;
    };
    expect(raw.events.some((event) => event.case_number === ORPHAN_CASE)).toBe(true);
  });

  it("still refuses loudly on a journal that is not valid JSON", async () => {
    await writeFile(casesStore, "{ not json", "utf8");
    await expect(listCases()).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining("not valid JSON"),
    });
  });
});

describe("a failed journal write carries the OS reason", () => {
  it("keeps the visitor message plain and the server-side cause specific", async () => {
    // A directory at the store path makes the atomic rename(2) fail; the real
    // ENOSPC case takes exactly this catch.
    const target = path.join(dir, "target.json");
    await mkdir(target);

    let caught: unknown;
    try {
      await writeJournalEvents(target, "case", []);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const api = caught as ApiError;
    expect(api.status).toBe(500);
    expect(api.message).toBe("the case store could not be written");
    expect((api.cause as NodeJS.ErrnoException).code).toBe("EISDIR");
  });
});

describe("the sibling journals with the same parent-reference pattern", () => {
  it("skips an orphan order status change and names it", async () => {
    await writeJournal(orderStorePath(), [
      {
        kind: "status_changed",
        at: "2026-10-03T00:00:00.000Z",
        number: "ORD-2026-99999",
        event: { status: "confirmed", at: "2026-10-03T00:00:00.000Z", by: "Office" },
      },
    ]);
    const spy = silentConsoleError();

    await expect(listFixtureAdminOrders()).resolves.toEqual([]);
    expect(
      spy.mock.calls.some(
        ([line]) => String(line).includes("order store") && String(line).includes("ORD-2026-99999"),
      ),
    ).toBe(true);
  });

  it("skips an orphan chapel block removal and counts it", async () => {
    await writeJournal(chapelStorePath(), [
      { kind: "block_removed", at: "2026-10-03T00:00:00.000Z", id: "block-not-recorded" },
    ]);
    const spy = silentConsoleError();

    const state = await loadChapelAdminState();
    expect(state.chapels).toHaveLength(2);
    expect(state.skipped).toEqual([
      {
        kind: "block_removed",
        at: "2026-10-03T00:00:00.000Z",
        parent: "block_id",
        reference: "block-not-recorded",
      },
    ]);
    expect(spy.mock.calls.some(([line]) => String(line).includes("block-not-recorded"))).toBe(true);
  });

  it("skips an orphan catalogue update and keeps every item", async () => {
    const before = await listCatalogRecords();
    expect(before.length).toBeGreaterThan(0);
    const sample = before[0];
    await writeJournal(catalogStorePath(), [
      {
        kind: "item_updated",
        at: "2026-10-03T00:00:00.000Z",
        item: { ...sample, item: { ...sample.item, id: sample.item.id + 500000 } },
      },
    ]);
    const spy = silentConsoleError();

    const after = await listCatalogRecords();
    expect(after).toHaveLength(before.length);
    expect(spy.mock.calls.some(([line]) => String(line).includes("catalogue store"))).toBe(true);
  });
});
