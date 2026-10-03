import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getEngagementView, listEngagementViews, listNoticeTemplates } from "@/lib/api-client/lifecycle";
import { listNoticeSends } from "@/lib/api-client/lifecycle-store";

/**
 * The lifecycle BFF routes.
 *
 * Every write is guarded by the staff scope and every refusal must change
 * nothing. A legal write reaches the SAME durable journal the registers read; an
 * overpayment is refused rather than silently floored.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const createRoute = await import("@/app/api/staff/lifecycle/route");
const paymentRoute = await import("@/app/api/staff/lifecycle/payments/route");
const templateRoute = await import("@/app/api/staff/lifecycle/templates/route");
const noticeRoute = await import("@/app/api/staff/lifecycle/notices/route");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const STAFF_READ = ["cases:read"];
const STAFF_WRITE = ["cases:write"];
const FAMILY = ["tenancy:modules:read", "catalog:read"];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-lifecycle-route-"));
  process.env.LIFECYCLE_STORE_PATH = path.join(dir, "commerce-lifecycle.json");
  cookieJar.values = {};
});

afterEach(async () => {
  delete process.env.LIFECYCLE_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signInAs(scopes: string[], displayName = "Sam Staff") {
  const now = Math.floor(Date.now() / 1000);
  cookieJar.values.im_at = `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({ id: USER_ID, tenant_id: TENANT_ID, email: "sam.staff@vm.demo", display_name: displayName }),
    "utf8",
  ).toString("base64");
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/staff/lifecycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PLAN_BODY = {
  kind: "plan",
  name: "Test Member",
  item_name: "Silver 2",
  amount: "12000",
  mode: "monthly",
  installments: "12",
  first_due_on: "2026-10-27",
};

describe("the staff gate", () => {
  it("401s without a session and writes nothing", async () => {
    expect((await createRoute.POST(request(PLAN_BODY))).status).toBe(401);
    expect(await listEngagementViews(new Date())).toHaveLength(12);
  });

  it("403s a family session and a read-only staff session", async () => {
    signInAs(FAMILY);
    expect((await createRoute.POST(request(PLAN_BODY))).status).toBe(403);
    signInAs(STAFF_READ);
    expect((await createRoute.POST(request(PLAN_BODY))).status).toBe(403);
    expect(await listEngagementViews(new Date())).toHaveLength(12);
  });
});

describe("recording an outcome", () => {
  it("422s an incomplete record and writes nothing", async () => {
    signInAs(STAFF_WRITE);
    const res = await createRoute.POST(request({ kind: "plan", name: "", item_name: "", amount: "0" }));
    expect(res.status).toBe(422);
    expect(await listEngagementViews(new Date())).toHaveLength(12);
  });

  it("201s a valid record the register reads immediately", async () => {
    signInAs(STAFF_WRITE);
    const res = await createRoute.POST(request(PLAN_BODY));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { engagement: { id: string; reference: string } };
    expect(body.engagement.reference).toBe("VMP-2026-0005");
    expect((await getEngagementView(body.engagement.id, new Date()))?.engagement.client.name).toBe(
      "Test Member",
    );
  });
});

describe("recording a payment", () => {
  it("201s a legal payment and 422s one beyond the balance", async () => {
    signInAs(STAFF_WRITE);
    const before = await getEngagementView("eng-plan-0001", new Date());
    const outstanding = before?.totals.outstanding_cents ?? 0;

    const over = await paymentRoute.POST(
      request({ engagement_id: "eng-plan-0001", amount: String(outstanding / 100 + 1) }),
    );
    expect(over.status).toBe(422);

    const ok = await paymentRoute.POST(
      request({ engagement_id: "eng-plan-0001", amount: "1120", paid_on: "2026-10-03" }),
    );
    expect(ok.status).toBe(201);
    const after = await getEngagementView("eng-plan-0001", new Date());
    expect(after?.totals.paid_cents).toBe((before?.totals.paid_cents ?? 0) + 112_000);
  });
});

describe("modular notices", () => {
  it("201s a template the rules panel reads back", async () => {
    signInAs(STAFF_WRITE);
    const res = await templateRoute.POST(
      request({ label: "One week before", days_before: 7, message: "Hello {member}" }),
    );
    expect(res.status).toBe(201);
    expect((await listNoticeTemplates()).map((template) => template.label)).toContain("One week before");
  });

  it("201s a hand-off and 403s a family session", async () => {
    signInAs(STAFF_WRITE);
    const res = await noticeRoute.POST(
      request({ engagement_id: "eng-plan-0001", template_id: "notice-2-days", seq: 5 }),
    );
    expect(res.status).toBe(201);
    expect(await listNoticeSends()).toHaveLength(1);

    cookieJar.values = {};
    signInAs(FAMILY);
    expect(
      (await noticeRoute.POST(request({ engagement_id: "eng-plan-0001", template_id: "notice-2-days", seq: 5 }))).status,
    ).toBe(403);
  });
});
