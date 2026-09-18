import { describe, expect, it } from "vitest";

/**
 * The LIVE branch of the provisional-receipt flow — honestly unimplemented.
 *
 * No frozen contract names a provisional-receipt record or endpoint, so a live deployment
 * answers 503 with the named reason instead of dressing a local journal up as a service.
 * The env var is set before the module graph loads, because `finance.ts` captures the live
 * mode at import time (the same pattern `billing-live-write.test.ts` uses).
 */

process.env.BILLING_BASE_URL = "https://gateway.example.com";

const facade = await import("@/lib/api-client/provisional-receipts");

describe("live mode refuses rather than pretending", () => {
  it("reports the named reason for reads", async () => {
    expect(facade.provisionalReceiptsLiveModeEnabled()).toBe(true);
    await expect(facade.listProvisionalReceipts()).rejects.toMatchObject({
      status: 503,
      message: facade.PROVISIONAL_RECEIPTS_NOT_WIRED,
    });
    await expect(facade.getProvisionalReceipt("prov-x")).rejects.toMatchObject({ status: 503 });
    await expect(facade.listProvisionalReceiptViews()).rejects.toMatchObject({ status: 503 });
  });

  it("refuses to issue a slip, and never touches the fixture store", async () => {
    await expect(
      facade.issueProvisionalReceipt({
        input: {
          invoice_number: "INV-2026-00003",
          case_number: null,
          payer: "Liwayway Cruz",
          amount_cents: 1000,
          instrument: "cash",
          reference: "",
          received_on: "2026-09-18",
          notes: "",
        },
        actor: "Sam Staff",
      }),
    ).rejects.toMatchObject({
      status: 503,
      message: facade.PROVISIONAL_RECEIPTS_NOT_WIRED,
    });

    // The fixture journal stays empty: the reason says why, not a half-applied write.
    const { listFixtureProvisionalReceipts } = await import(
      "@/lib/api-client/provisional-receipts-store"
    );
    expect(await listFixtureProvisionalReceipts()).toEqual([]);
  });
});
