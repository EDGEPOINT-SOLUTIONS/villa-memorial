import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listInquiries } from "@/lib/api-client/crm";
import { inquiriesStorePath } from "@/lib/api-client/inquiry-store";

/**
 * `POST /api/inquiries` — the promise this route exists to keep.
 *
 * THE DEFECT IT CLOSES. A Request-for-Quote used to be written into the VISITOR'S OWN
 * BROWSER (`lib/demo-inquiry-captures.ts`) and the form said so in as many words:
 * "Nothing was sent to a server". The staff board is a server read, so a family asking
 * for a quotation reached the office only if the office happened to be looking at that
 * device. Reported 2026-09-27 and fixed here.
 *
 * So the test that matters is not "does the route return 201" — it is the second
 * assertion in the first case: after the POST, **the reader the staff page uses finds
 * the enquiry**. If that ever stops being true, the office is blind again.
 *
 * The route is deliberately PUBLIC (a family has no session), so there is no RBAC case
 * here; what is pinned instead is that a malformed or incomplete submission writes
 * NOTHING, and that live mode refuses rather than quietly filing a customer's request
 * into a local file.
 */

const QUOTE = {
  kind: "quote",
  values: {
    full_name: "Maria Dela Cruz",
    email: "maria@example.com",
    phone: "+63 917 000 0000",
    service: "Embalming — 3 days",
    preferred_date: "2026-10-05",
    notes: "Please call after 6pm.",
    consent: true,
  },
};

function post(body: unknown) {
  return new Request("http://localhost/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-inquiries-route-"));
  process.env.INQUIRIES_STORE_PATH = path.join(dir, "inquiries.json");
});

afterEach(async () => {
  delete process.env.INQUIRIES_STORE_PATH;
  delete process.env.CRM_BASE_URL;
  await rm(dir, { recursive: true, force: true });
});

describe("POST /api/inquiries", () => {
  it("records a website quote request where the staff board will find it", async () => {
    const { POST } = await import("@/app/api/inquiries/route");
    const before = await listInquiries();

    const response = await POST(post(QUOTE) as never);
    expect(response.status).toBe(201);
    const body = (await response.json()) as { inquiry: { reference: string; id: string } };
    expect(body.inquiry.reference).toMatch(/^INQ-2026-\d{5}$/);

    // THE PROMISE: the office's own reader sees it, and it is one more than before.
    const after = await listInquiries();
    expect(after).toHaveLength(before.length + 1);
    const recorded = after.find((row) => row.id === body.inquiry.id);
    expect(recorded, "the recorded enquiry must be readable by the staff board").toBeDefined();
    expect(recorded!.person.full_name).toBe("Maria Dela Cruz");
    expect(recorded!.person.email).toBe("maria@example.com");
    expect(recorded!.topic).toBe("Embalming — 3 days");
    // The family's own note travels with the row the board renders.
    expect(recorded!.message).toBe("Please call after 6pm.");
  });

  it("records a contact-form message through the same route", async () => {
    const { POST } = await import("@/app/api/inquiries/route");
    const response = await POST(
      post({
        kind: "contact",
        values: {
          full_name: "Jose Rizal",
          email: "jose@example.com",
          phone: "",
          message: "Do you have lots in section D?",
          consent: true,
        },
      }) as never,
    );
    expect(response.status).toBe(201);
    const rows = await listInquiries();
    const row = rows.find((r) => r.person.full_name === "Jose Rizal");
    expect(row?.message).toBe("Do you have lots in section D?");
    expect(row?.source).toBe("website");
  });

  it("refuses an incomplete submission with the field errors, and writes nothing", async () => {
    const { POST } = await import("@/app/api/inquiries/route");
    const before = await listInquiries();

    const response = await POST(
      post({ kind: "quote", values: { full_name: "", email: "not-an-email", consent: false } }) as never,
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string; fieldErrors: Record<string, string> };
    expect(Object.keys(body.fieldErrors).sort()).toEqual(
      ["consent", "email", "full_name", "service"].sort(),
    );
    expect(body.error).toBeTruthy();

    expect(await listInquiries()).toHaveLength(before.length);
  });

  it("refuses a body that names no form, and one that is not JSON at all", async () => {
    const { POST } = await import("@/app/api/inquiries/route");
    expect((await POST(post({ kind: "whatever", values: {} }) as never)).status).toBe(400);
    expect((await POST(post("}{ not json") as never)).status).toBe(400);
  });

  it("answers the named 503 in live mode instead of filing the enquiry locally", async () => {
    process.env.CRM_BASE_URL = "http://gateway.test";
    const { POST } = await import("@/app/api/inquiries/route");
    const before = await listInquiries().catch(() => []);

    const response = await POST(post(QUOTE) as never);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("CRM_NOT_WIRED");

    // And nothing was written: an office on a real CRM must never get a silent local file.
    delete process.env.CRM_BASE_URL;
    const after = await listInquiries();
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    expect(after.some((r) => r.person.full_name === "Maria Dela Cruz")).toBe(false);
  });

  it("keeps the store path configurable, so tests never touch the repo store", () => {
    expect(inquiriesStorePath()).toBe(path.join(dir, "inquiries.json"));
  });
});
