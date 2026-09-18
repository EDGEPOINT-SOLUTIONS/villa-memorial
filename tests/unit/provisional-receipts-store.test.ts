import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";
import {
  getFixtureProvisionalReceipt,
  issueFixtureProvisionalReceipt,
  listFixtureProvisionalReceipts,
  provisionalReceiptsStorePath,
} from "@/lib/api-client/provisional-receipts-store";
import { recordFixturePayment } from "@/lib/api-client/billing-store";
import { getProvisionalReceiptView } from "@/lib/api-client/provisional-receipts";

/**
 * The counter's provisional-receipt journal: durable, append-only and validated under the
 * lock against the CURRENT invoice. These tests pin the round trip, that a refusal writes
 * nothing, and that a billing payment's official receipt replaces the slip in the display
 * state — the promise the screen makes.
 */

const NOW = new Date("2026-09-18T04:00:00Z");
const ACTOR = "Sam Staff";

/** INV-2026-00003: ₱1,800.00 owed, nothing paid. */
function cashInput(over: Record<string, unknown> = {}) {
  return {
    invoice_number: "INV-2026-00003",
    case_number: "CASE-2026-0001",
    payer: "Liwayway Cruz",
    amount_cents: 50_000,
    instrument: "cash",
    reference: "",
    received_on: "2026-09-18",
    notes: "initial payment",
    ...over,
  };
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-provisional-store-"));
  process.env.PROVISIONAL_RECEIPTS_STORE_PATH = path.join(dir, "receipts.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("issuing a provisional receipt", () => {
  it("stamps the recorded fields, actor and an opaque address — never a receipt number", async () => {
    const record = await issueFixtureProvisionalReceipt({ input: cashInput(), actor: ACTOR, now: NOW });
    expect(record.id).toMatch(/^prov-[0-9a-f-]{36}$/);
    expect(record.invoice_number).toBe("INV-2026-00003");
    expect(record.order_number).toBeNull();
    expect(record.case_number).toBe("CASE-2026-0001");
    expect(record.payer).toBe("Liwayway Cruz");
    expect(record.amount_cents).toBe(50_000);
    expect(record.instrument).toBe("cash");
    expect(record.received_on).toBe("2026-09-18");
    expect(record.received_by).toBe(ACTOR);
    expect(record.issued_at).toBe(NOW.toISOString());
    expect(record.id).not.toContain("OR-");
    expect(record.id).not.toContain("DOC-");
  });

  it("takes the order from the invoice as the recorded data reports it", async () => {
    const record = await issueFixtureProvisionalReceipt({
      input: cashInput({ invoice_number: "INV-2026-00002", amount_cents: 2_000 }),
      actor: ACTOR,
      now: NOW,
    });
    expect(record.order_number).toBe("ORD-2026-00002");
  });

  it("is durable: the journal folds back on every read, oldest first", async () => {
    const first = await issueFixtureProvisionalReceipt({
      input: cashInput({ amount_cents: 10_000 }),
      actor: ACTOR,
      now: NOW,
    });
    const second = await issueFixtureProvisionalReceipt({
      input: cashInput({ amount_cents: 20_000, payer: "Ana Cruz" }),
      actor: "Other Clerk",
      now: new Date("2026-09-18T05:00:00Z"),
    });

    const listed = await listFixtureProvisionalReceipts();
    expect(listed.map((r) => r.id)).toEqual([first.id, second.id]);
    expect(listed[1].payer).toBe("Ana Cruz");
    expect(listed[1].received_by).toBe("Other Clerk");

    const fetched = await getFixtureProvisionalReceipt(first.id);
    expect(fetched?.amount_cents).toBe(10_000);
    expect(await getFixtureProvisionalReceipt("prov-nope")).toBeNull();
  });

  it("refuses a bad payer, an over-amount and a paid invoice — and nothing is written", async () => {
    await expect(
      issueFixtureProvisionalReceipt({ input: cashInput({ payer: " " }), actor: ACTOR, now: NOW }),
    ).rejects.toMatchObject({ status: 422 });

    await expect(
      issueFixtureProvisionalReceipt({
        input: cashInput({ amount_cents: 180_001 }),
        actor: ACTOR,
        now: NOW,
      }),
    ).rejects.toMatchObject({ status: 422 });

    // INV-2026-00001 is recorded as paid in full.
    await expect(
      issueFixtureProvisionalReceipt({
        input: cashInput({ invoice_number: "INV-2026-00001", amount_cents: 100 }),
        actor: ACTOR,
        now: NOW,
      }),
    ).rejects.toMatchObject({ status: 422 });

    expect(await listFixtureProvisionalReceipts()).toEqual([]);
  });

  it("refuses an invoice that names no recorded record with a 404, writing nothing", async () => {
    await expect(
      issueFixtureProvisionalReceipt({
        input: cashInput({ invoice_number: "INV-2026-99999" }),
        actor: ACTOR,
        now: NOW,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(await listFixtureProvisionalReceipts()).toEqual([]);
  });

  it("refuses a record with no invoice chosen at all", async () => {
    await expect(
      issueFixtureProvisionalReceipt({
        input: cashInput({ invoice_number: "" }),
        actor: ACTOR,
        now: NOW,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("treats a corrupt journal as a 500, never a guess", async () => {
    await writeFile(provisionalReceiptsStorePath(), "{ not json", "utf8");
    await expect(listFixtureProvisionalReceipts()).rejects.toBeInstanceOf(ApiError);
    await expect(
      issueFixtureProvisionalReceipt({ input: cashInput(), actor: ACTOR, now: NOW }),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe("the official receipt replaces the slip", () => {
  it("shows the slip while no receipt exists, then the receipt's figures after a payment", async () => {
    const record = await issueFixtureProvisionalReceipt({
      input: cashInput({ invoice_number: "INV-2026-00003", amount_cents: 100_000 }),
      actor: ACTOR,
      now: NOW,
    });

    const before = await getProvisionalReceiptView(record.id);
    expect(before?.official).toBeNull();
    expect(before?.record.id).toBe(record.id);

    // The office records the payment through the merged billing flow; the fixture-mode store
    // issues the official receipt the documents repository also lists.
    await recordFixturePayment({
      invoiceNumber: "INV-2026-00003",
      input: {
        amount_cents: 100_000,
        method: "cash",
        reference: "",
        received_on: "2026-09-18",
        notes: "",
      },
      actor: ACTOR,
      now: NOW,
    });

    const after = await getProvisionalReceiptView(record.id);
    expect(after?.official?.document_number).toMatch(/^DOC-2026-\d{5}$/);
    expect(after?.official?.figures?.amount).toBe("₱1,000.00");
    expect(after?.official?.figures?.payer).toBe("Liwayway Cruz");
  });

  it("names the seeded repository receipt for the invoice it covers", async () => {
    const record = await issueFixtureProvisionalReceipt({
      input: cashInput({ invoice_number: "INV-2026-00001", amount_cents: 100 }),
      actor: ACTOR,
      now: NOW,
    }).catch(() => null);
    expect(record).toBeNull(); // the seeded invoice is paid in full — capture refuses it

    // A record issued earlier (when the invoice still owed) still matches the repository row.
    await writeFile(
      provisionalReceiptsStorePath(),
      JSON.stringify({
        version: 1,
        events: [
          {
            kind: "provisional_receipt_issued",
            at: NOW.toISOString(),
            receipt: {
              id: "prov-earlier",
              invoice_number: "INV-2026-00001",
              order_number: "ORD-2026-00001",
              case_number: null,
              payer: "Marites Santos",
              amount_cents: 10_000,
              instrument: "cash",
              reference: "",
              received_on: "2026-07-01",
              received_by: ACTOR,
              notes: "",
              issued_at: "2026-07-01T04:00:00Z",
            },
          },
        ],
      }),
      "utf8",
    );

    const view = await getProvisionalReceiptView("prov-earlier");
    expect(view?.official?.document_number).toBe("DOC-2026-00002");
    expect(view?.official?.figures).toBeNull();
  });
});
