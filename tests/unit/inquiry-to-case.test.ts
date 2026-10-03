import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getCase, listCases } from "@/lib/api-client/operations";
import { receiveInquiry } from "@/lib/api-client/inquiry-store";
import { readInquirySubmission } from "@/lib/inquiry-intake";

/**
 * `POST /api/inquiries/:id/to-case` — the captain's "Send to case".
 *
 * An inquiry that is done offers one decision, and the case then carries the person
 * AND the inquiry together: one record, no re-typing. This pins that:
 *  · a `cases:write` session's send opens a case stamped with the inquiry's own
 *    `inquiry_reference`, its person fields and its assignee;
 *  · a second send is idempotent — it returns the SAME case, never a twin;
 *  · anonymous / read-only callers are refused and write nothing.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
/** The enquiry the office just received — recorded the way a visitor's form does. */
let INQUIRY_ID = "";
let INQUIRY_REFERENCE = "";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function accessToken(scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
}

function signInAs(scopes: string[]) {
  cookieJar.values.im_at = accessToken(scopes);
}

function send(id: string): Promise<Response> {
  return route.POST(
    new Request(`http://localhost/api/inquiries/${id}/to-case`, { method: "POST" }) as never,
    { params: Promise.resolve({ id }) },
  );
}

const route = await import("@/app/api/inquiries/[id]/to-case/route");

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-inquiry-to-case-"));
  process.env.INQUIRIES_STORE_PATH = path.join(dir, "inquiries.json");
  process.env.OPERATIONS_STORE_PATH = path.join(dir, "cases.json");
  delete cookieJar.values.im_at;
  delete process.env.CRM_BASE_URL;

  // The clean start removed the recorded enquiries, so record one the way the
  // public Contact form does and let the send carry THAT row into a case.
  const verdict = readInquirySubmission("contact", {
    full_name: "Sample Lot Enquiry",
    email: "sample.lot@example.com",
    phone: "+63 917 000 0003",
    message: "Asking about a memorial lot.",
    consent: true,
  });
  if (!verdict.ok) throw new Error("the sample enquiry was refused");
  const inquiry = await receiveInquiry({ intake: verdict.intake });
  INQUIRY_ID = inquiry.id;
  INQUIRY_REFERENCE = inquiry.reference;
});

afterEach(async () => {
  delete process.env.INQUIRIES_STORE_PATH;
  delete process.env.OPERATIONS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("Send to case", () => {
  it("opens one case that carries the person and the enquiry", async () => {
    signInAs(["cases:write"]);
    const before = await listCases();

    const response = await send(INQUIRY_ID);
    expect(response.status).toBe(201);
    const kase = (await response.json()) as {
      id: string;
      case_number: string;
      intake: { client_name: string | null } | null;
      inquiry_reference?: string | null;
      assigned_coordinator: string;
    };
    expect(kase.case_number).toMatch(/^CASE-\d{4}-\d{4}$/);
    expect(kase.inquiry_reference).toBe(INQUIRY_REFERENCE);

    // THE PROMISE: the case screen's own reader finds it, one more than before.
    const after = await listCases();
    expect(after).toHaveLength(before.length + 1);
    const recorded = after.find((row) => row.id === kase.id);
    expect(recorded, "the case the office opens next must be readable").toBeDefined();
    expect(recorded!.inquiry_reference).toBe(INQUIRY_REFERENCE);
    expect(recorded!.intake?.client_name).toBeTruthy();

    // THE FLOW-AUDIT REGRESSION: the office's own "View case" link asks for the
    // case by id. Fixture mode used to check the recorded seed only and answer
    // "Case not found" for the case it had just opened.
    const detail = await getCase(kase.id);
    expect(detail.case_number).toBe(kase.case_number);
    expect(detail.inquiry_reference).toBe(INQUIRY_REFERENCE);
    await expect(getCase("case-not-recorded")).rejects.toThrow();
  });

  it("refuses a case with no contact number and writes nothing", async () => {
    signInAs(["cases:write"]);
    // A family plan/lot ask may arrive with no phone (the gate's contact is
    // optional); the case is where a reachable person is required.
    const verdict = readInquirySubmission("contact", {
      full_name: "No Number",
      email: "no.number@example.com",
      phone: "",
      message: "Asking with no number.",
      consent: true,
    });
    if (!verdict.ok) throw new Error("the sample enquiry was refused");
    const phoneLess = await receiveInquiry({ intake: verdict.intake });
    const before = await listCases();

    const response = await send(phoneLess.id);
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("contact number");
    expect(await listCases()).toHaveLength(before.length);
  });

  it("is idempotent — a second send returns the same case, not a twin", async () => {
    signInAs(["cases:write"]);
    const first = (await (await send(INQUIRY_ID)).json()) as { id: string };
    const secondResponse = await send(INQUIRY_ID);
    expect(secondResponse.status).toBe(200);
    const second = (await secondResponse.json()) as { id: string };
    expect(second.id).toBe(first.id);

    const matching = (await listCases()).filter(
      (row) => row.inquiry_reference === INQUIRY_REFERENCE,
    );
    expect(matching).toHaveLength(1);
  });

  it("refuses an anonymous or read-only caller and writes nothing", async () => {
    const before = await listCases();
    delete cookieJar.values.im_at;
    expect((await send(INQUIRY_ID)).status).toBe(401);

    signInAs(["cases:read"]);
    expect((await send(INQUIRY_ID)).status).toBe(403);
    expect(await listCases()).toHaveLength(before.length);
  });
});
