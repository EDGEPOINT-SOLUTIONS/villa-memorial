import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listCases } from "@/lib/api-client/operations";

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
/** A recorded CONVERTED enquiry (INQ-2026-00038) — the "done" state the button shows. */
const INQUIRY_ID = "00000000-0000-4000-8000-000000000303";
const INQUIRY_REFERENCE = "INQ-2026-00038";

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
