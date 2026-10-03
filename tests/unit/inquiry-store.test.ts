import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";
import {
  inquiriesStorePath,
  listFixtureInquiries,
  receiveInquiry,
  seedInquiries,
} from "@/lib/api-client/inquiry-store";
import { readInquirySubmission } from "@/lib/inquiry-intake";

/**
 * The office's enquiry journal.
 *
 * THE DEFECT THESE TESTS EXIST FOR: until 2026-09-27 both public forms
 * (`/quote`, `/contact`) wrote their submission into the VISITOR'S OWN BROWSER via
 * `lib/demo-inquiry-captures.ts`, and the staff board — a server read — could only ever
 * see rows typed on the device that was looking at it. So a family's Request-for-Quote
 * reached nobody, and two of the five facts the client's minutes name (the preferred date
 * and the additional requirements) were rendered on no staff screen at all.
 *
 * The last test is the one that matters most: it asserts the row is ON DISK, which is
 * what "a restart does not lose it" actually means.
 */

const NOW = new Date("2026-09-27T02:00:00Z");

/** A complete quote submission, exactly as `POST /api/inquiries` receives it. */
const QUOTE = {
  full_name: "Maria Dela Cruz",
  email: "maria@example.com",
  phone: "+63 917 000 0000",
  service: "Embalming — 3 days",
  preferred_date: "2026-10-05",
  notes: "Please call after 6pm.",
  consent: true,
};

function intakeOf(raw: unknown) {
  const verdict = readInquirySubmission("quote", raw);
  if (!verdict.ok) throw new Error(`unexpected refusal: ${JSON.stringify(verdict.errors)}`);
  return verdict.intake;
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-inquiries-"));
  process.env.INQUIRIES_STORE_PATH = path.join(dir, "inquiries.json");
});

afterEach(async () => {
  delete process.env.INQUIRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the enquiry journal", () => {
  it("starts from an empty front-desk seed when nothing has arrived (clean start)", async () => {
    const rows = await listFixtureInquiries();
    // Captain, 2026-10-02: the recorded front-desk enquiries are removed, so the
    // board lists only what the public forms and the family gate actually recorded.
    expect(seedInquiries()).toEqual([]);
    expect(rows).toEqual([]);
  });

  it("records a website enquiry and reads it back at the top of the board", async () => {
    const recorded = await receiveInquiry({ intake: intakeOf(QUOTE), now: NOW });

    expect(recorded.status).toBe("new");
    expect(recorded.assigned_to).toBe("Unassigned");
    expect(recorded.source).toBe("website");
    expect(recorded.topic).toBe("Embalming — 3 days");
    expect(recorded.person.full_name).toBe("Maria Dela Cruz");
    // The reference is minted above every existing one, never a browser-local counter.
    expect(recorded.reference).toMatch(/^INQ-2026-\d{5}$/);
    expect(recorded.reference).toBe("INQ-2026-00001");

    const rows = await listFixtureInquiries();
    // Newest first, so a coordinator sees it without scrolling.
    expect(rows[0].id).toBe(recorded.id);
    expect(rows).toHaveLength(1);
  });

  it("keeps the family's own note in the row the board renders", async () => {
    const recorded = await receiveInquiry({ intake: intakeOf(QUOTE), now: NOW });
    // The family's note travels alone; a free-text request has no structured lines.
    expect(recorded.message).toBe("Please call after 6pm.");
    expect(recorded.lines).toBeUndefined();
  });

  it("stores a basket's structured lines and reads them back (D6-A)", async () => {
    const recorded = await receiveInquiry({
      intake: intakeOf({
        ...QUOTE,
        lines: [
          {
            sku: "SRV-RETRIEVAL",
            name: "Retrieval",
            kind: "service",
            pricingMode: "on_request",
            unitPriceCents: null,
            currency: null,
            quantity: 1,
            detail: "Same week as the burial",
          },
          {
            sku: "LOT-PREMIUM",
            name: "Premium Lots — memorial lot",
            kind: "lot",
            pricingMode: "published",
            unitPriceCents: 11400000,
            currency: "PHP",
            quantity: 1,
            dateRange: "2.5 sqm · 1. Lot Only · lot only",
          },
        ],
      }),
      now: NOW,
    });
    expect(recorded.topic).toBe("Quote request — 2 items");
    expect(recorded.lines).toHaveLength(2);
    expect(recorded.lines?.[0]).toMatchObject({
      sku: "SRV-RETRIEVAL",
      pricingMode: "on_request",
      unitPriceCents: null,
      detail: "Same week as the burial",
    });
    expect(recorded.lines?.[1]).toMatchObject({
      sku: "LOT-PREMIUM",
      pricingMode: "published",
      unitPriceCents: 11400000,
    });

    // A restart does not lose them: the lines fold back out of the journal.
    const rows = await listFixtureInquiries();
    const back = rows.find((row) => row.id === recorded.id);
    expect(back?.lines).toHaveLength(2);
  });

  it("leaves the preferred date out when the family did not give one", async () => {
    const recorded = await receiveInquiry({
      intake: intakeOf({ ...QUOTE, preferred_date: "", notes: "" }),
      now: NOW,
    });
    expect(recorded.message).not.toContain("Preferred date:");
    expect(recorded.message).not.toContain("Additional requirements:");
  });

  it("gives two enquiries recorded in the same instant distinct references", async () => {
    const first = await receiveInquiry({ intake: intakeOf(QUOTE), now: NOW });
    const second = await receiveInquiry({ intake: intakeOf(QUOTE), now: NOW });
    expect(first.reference).not.toBe(second.reference);
    expect(second.reference).toBe("INQ-2026-00002");
  });

  /**
   * THE RESTART TEST. A server restart is a fresh process with empty module state; the
   * only thing that survives is the file. So this asserts the row is physically in the
   * store file, is valid JSON in the documented shape, and is found by a read that shares
   * no in-memory state with the write (the recorded seed is re-derived from the fixture
   * and the journal is re-parsed from disk).
   */
  it("writes the enquiry to disk, so a fresh process still finds it", async () => {
    const recorded = await receiveInquiry({ intake: intakeOf(QUOTE), now: NOW });

    const raw = await readFile(inquiriesStorePath(), "utf8");
    const parsed = JSON.parse(raw) as { version: number; events: Array<{ kind: string; inquiry: { id: string; reference: string } }> };
    expect(parsed.version).toBe(1);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].kind).toBe("inquiry_received");
    expect(parsed.events[0].inquiry.id).toBe(recorded.id);
    expect(parsed.events[0].inquiry.reference).toBe(recorded.reference);

    const rows = await listFixtureInquiries();
    expect(rows.some((r) => r.id === recorded.id)).toBe(true);
  });

  it("refuses a store file that is not valid JSON rather than silently starting empty", async () => {
    await writeFile(inquiriesStorePath(), "{ this is not json", "utf8");
    await expect(listFixtureInquiries()).rejects.toBeInstanceOf(ApiError);
  });

  it("refuses a store file with an unexpected shape", async () => {
    await writeFile(inquiriesStorePath(), JSON.stringify({ version: 2, events: [] }), "utf8");
    await expect(listFixtureInquiries()).rejects.toBeInstanceOf(ApiError);
  });

  it("refuses a journal row whose person is missing, naming the fixture", async () => {
    await writeFile(
      inquiriesStorePath(),
      JSON.stringify({
        version: 1,
        events: [
          { kind: "inquiry_received", at: NOW.toISOString(), inquiry: { id: "x", reference: "INQ-2026-00099" } },
        ],
      }),
      "utf8",
    );
    await expect(listFixtureInquiries()).rejects.toThrow(/malformed inquiries fixture/);
  });
});
