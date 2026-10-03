import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getFixtureInquiry, receiveInquiry } from "@/lib/api-client/inquiry-store";
import { readInquirySubmission } from "@/lib/inquiry-intake";

/**
 * The office's moves on a family plan/lot enquiry (flow audit, 2026-10-03).
 *
 * The audit found the hard dead end: the family gate recorded no phone, conversion
 * required one, and the office had no way to add it — so two of the three sample
 * enquiries could never be processed. These pin the fix:
 *  · a phone-less enquiry CONVERTS to a prospect;
 *  · the office can add a contact number on the enquiry;
 *  · an empty number is refused.
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
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({ display_name: "Sam Staff" }),
    "utf8",
  ).toString("base64");
}

function post(id: string, body: unknown): Promise<Response> {
  return route.POST(
    new Request(`http://localhost/api/staff/inquiries/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ id }) },
  );
}

const route = await import("@/app/api/staff/inquiries/[id]/route");

let dir: string;
let INQUIRY_ID = "";

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-inquiry-convert-"));
  process.env.INQUIRIES_STORE_PATH = path.join(dir, "inquiries.json");
  process.env.AGENT_STORE_PATH = path.join(dir, "agent.json");
  cookieJar.values = {};
  delete process.env.CRM_BASE_URL;

  const verdict = readInquirySubmission("quote", {
    full_name: "Cory Customer",
    email: "customer@vm.demo",
    phone: "",
    service: "Silver 1 plan — Monthly",
    consent: true,
  });
  if (!verdict.ok) throw new Error("the sample enquiry was refused");
  const inquiry = await receiveInquiry({ intake: verdict.intake, user_id: "family-1" });
  INQUIRY_ID = inquiry.id;
});

afterEach(async () => {
  delete process.env.INQUIRIES_STORE_PATH;
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("converting a phone-less plan/lot enquiry", () => {
  it("succeeds where the old rule demanded a phone and offered no field", async () => {
    signInAs(["cases:write"]);
    const response = await post(INQUIRY_ID, { action: "convert", need: "plan" });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { inquiry: { status: string } };
    expect(body.inquiry.status).toBe("converted");
  });
});

describe("adding a contact number on the enquiry", () => {
  it("records the number the office adds", async () => {
    signInAs(["cases:write"]);
    const response = await post(INQUIRY_ID, { action: "contact", phone: "0917 111 2222" });
    expect(response.status).toBe(201);
    const updated = await getFixtureInquiry(INQUIRY_ID);
    expect(updated?.person.phone).toBe("0917 111 2222");
  });

  it("refuses an empty number", async () => {
    signInAs(["cases:write"]);
    expect((await post(INQUIRY_ID, { action: "contact", phone: "   " })).status).toBe(422);
    expect((await getFixtureInquiry(INQUIRY_ID))?.person.phone).toBe("");
  });

  it("refuses a caller without cases:write", async () => {
    signInAs(["cases:read"]);
    expect((await post(INQUIRY_ID, { action: "contact", phone: "0917" })).status).toBe(403);
  });
});
