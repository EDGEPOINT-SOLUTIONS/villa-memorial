import { describe, expect, it } from "vitest";
import { getLot, listLots, reserveLot } from "@/lib/api-client/property";
import lotsFile from "@/lib/fixtures/property/lots.json";

/**
 * Module D fixture-contract tests. NO frozen API exists yet (property-gis is
 * unbuilt), so these pin the UI demo data to the documented domain shapes
 * (docs/04-modules/memorial-property-gis.md blueprint §15–16) so screens can't
 * drift silently from the spec vocabulary.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("property fixtures follow the documented domain shapes", () => {
  it("lots carry hierarchy + status + pricing fields", async () => {
    const lots = await listLots();
    expect(lots.length).toBeGreaterThan(0);
    for (const l of lots) {
      expect(l.id).toMatch(UUID_RE);
      expect(l.lot_number.length).toBeGreaterThan(0);
      expect(l.section.length).toBeGreaterThan(0);
      expect(l.block.length).toBeGreaterThan(0);
      expect(["individual", "family", "estate"]).toContain(l.type);
      expect([
        "available",
        "reserved",
        "sold",
        "occupied",
        "for_transfer",
        "on_hold",
        "maintenance_hold",
      ]).toContain(l.status);
      expect(l.area_sqm).toBeGreaterThan(0);
      expect(l.price_cents).toBeGreaterThan(0);
      expect(l.currency).toBe("PHP");
    }
    expect(lotsFile.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("lot by id returns a single record", async () => {
    const lot = await getLot("00000000-0000-4000-8000-000000000D01");
    expect(lot.lot_number).toBe("A-001");
    expect(lot.status).toBe("available");
  });

  it("unknown lot id → not_found error", async () => {
    await expect(getLot("00000000-0000-4000-8000-00000000dead")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("reserved lots have owner_name and reserved_at", async () => {
    const lots = await listLots();
    const reserved = lots.filter((l) => l.status === "reserved");
    expect(reserved.length).toBeGreaterThan(0);
    for (const l of reserved) {
      expect(l.owner_name).not.toBeNull();
      expect(l.reserved_at).not.toBeNull();
    }
  });

  it("sold lots have owner_name and sold_at", async () => {
    const lots = await listLots();
    const sold = lots.filter((l) => l.status === "sold");
    expect(sold.length).toBeGreaterThan(0);
    for (const l of sold) {
      expect(l.owner_name).not.toBeNull();
      expect(l.sold_at).not.toBeNull();
    }
  });
});

describe("reserving a lot behaves the same in fixture mode as on the service", () => {
  // property-gis is the authority (KEB-D3-01). Fixture mode has to mirror its rules, or
  // the demo teaches a flow the real service rejects.
  const AVAILABLE = "00000000-0000-4000-8000-000000000D01";

  it("available → reserved, stamping owner and reserved_at", async () => {
    const lot = await reserveLot(AVAILABLE, "  Juan Dela Cruz  ");
    expect(lot.status).toBe("reserved");
    expect(lot.owner_name).toBe("Juan Dela Cruz");
    expect(lot.reserved_at).not.toBeNull();

    // The mutation is visible to later reads, as it would be through the service.
    const reread = await getLot(AVAILABLE);
    expect(reread.status).toBe("reserved");
    expect((await listLots()).find((l) => l.id === AVAILABLE)?.status).toBe("reserved");
  });

  it("reserving it twice is rejected with the service's 422", async () => {
    await expect(reserveLot(AVAILABLE, "Someone Else")).rejects.toMatchObject({ status: 422 });
  });

  it("an empty owner name never reaches the service", async () => {
    await expect(reserveLot(AVAILABLE, "   ")).rejects.toMatchObject({ status: 422 });
  });

  it("unknown lot id → not_found", async () => {
    await expect(
      reserveLot("00000000-0000-4000-8000-00000000dead", "Nobody"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
