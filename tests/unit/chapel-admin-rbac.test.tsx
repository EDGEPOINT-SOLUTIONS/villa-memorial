import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { getChapelSchedule, reserveChapelStay } from "@/lib/api-client/chapel-reservations";
import { getChapelAdminView } from "@/lib/api-client/chapel-admin";
import { listBookings } from "@/lib/api-client/scheduling";
import type { Session } from "@/lib/auth/types";

/**
 * RBAC gating for the staff chapel screens and their BFF routes:
 *  - every write (chapel save, closure add/remove, booking confirm/cancel) needs
 *    `scheduling:write` and answers 401/403 without touching the store;
 *  - the Schedule page itself renders the chapel sections read-only with only
 *    `scheduling:read` (graceful ForbiddenState without it);
 *  - a `scheduling:write` session's changes land in the SAME store the customer
 *    booking step reads, which is the promise the screen makes.
 *
 * Cookies are mocked and every test gets its own throwaway CHAPEL_STORE_PATH.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const chapelsRoute = await import("@/app/api/schedule/chapels/route");
const chapelRoute = await import("@/app/api/schedule/chapels/[id]/route");
const blocksRoute = await import("@/app/api/schedule/chapels/[id]/blocks/route");
const blockRoute = await import("@/app/api/schedule/chapel-blocks/[id]/route");
const confirmRoute = await import("@/app/api/schedule/bookings/[id]/confirm/route");
const cancelRoute = await import("@/app/api/schedule/bookings/[id]/cancel/route");
const { default: SchedulePage } = await import("@/app/(staff)/staff/schedule/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const CHAPEL_A = "10000000-0000-4000-8000-0000000000c1";
const HEARSE = "10000000-0000-4000-8000-0000000000c4";

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

function signInAs(scopes: string[], displayName = "Sam Staff") {
  cookieJar.values.im_at = accessToken(scopes);
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({
      id: USER_ID,
      tenant_id: TENANT_ID,
      email: "sam.staff@vm.demo",
      display_name: displayName,
    }),
    "utf8",
  ).toString("base64");
}

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

function post(path: string, body?: unknown): Promise<Response> {
  return Promise.resolve(
    chapelsRoute.POST(
      new Request(`http://localhost${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    ),
  );
}

function patchChapel(id: string, body: unknown): Promise<Response> {
  return chapelRoute.PATCH(
    new Request(`http://localhost/api/schedule/chapels/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function postBlock(id: string, body: unknown): Promise<Response> {
  return blocksRoute.POST(
    new Request(`http://localhost/api/schedule/chapels/${id}/blocks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function deleteBlock(id: string): Promise<Response> {
  return blockRoute.DELETE(new Request(`http://localhost/api/schedule/chapel-blocks/${id}`), {
    params: Promise.resolve({ id }),
  });
}

function postBooking(id: string, suffix: string, body?: unknown): Promise<Response> {
  const request = new Request(`http://localhost/api/schedule/bookings/${id}/${suffix}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return suffix === "confirm"
    ? confirmRoute.POST(request, { params: Promise.resolve({ id }) })
    : cancelRoute.POST(request, { params: Promise.resolve({ id }) });
}

/** The chapel form's payload (what the client sends). */
function chapelBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Chapel C",
    chapel_class: "private",
    capacity: 40,
    active: true,
    notes: "",
    ...overrides,
  };
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-chapel-rbac-"));
  process.env.CHAPEL_STORE_PATH = path.join(dir, "chapels.json");
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
  const mutated = (globalThis as { __imFixtureBookings?: unknown[] }).__imFixtureBookings;
  if (Array.isArray(mutated)) mutated.length = 0;
});

afterEach(async () => {
  delete process.env.CHAPEL_STORE_PATH;
  delete process.env.ORDERS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("chapel write routes are scope-gated", () => {
  it("answers 401 for an anonymous caller and writes nothing", async () => {
    const responses = await Promise.all([
      post("/api/schedule/chapels", chapelBody()),
      patchChapel(CHAPEL_A, chapelBody({ name: "Renamed" })),
      postBlock(CHAPEL_A, { from: "2026-10-01", to: "2026-10-02", reason: "Maintenance" }),
      deleteBlock("block-1"),
      postBooking("any", "confirm"),
      postBooking("any", "cancel", { reason: "x" }),
    ]);
    for (const res of responses) expect(res.status).toBe(401);
    expect((await getChapelAdminView()).chapels.map((c) => c.name)).toEqual([
      "Chapel A",
      "Chapel B",
    ]);
    expect((await getChapelSchedule()).blockedDates).toEqual([]);
  });

  it("answers 403 for a read-only session and writes nothing", async () => {
    signInAs(["scheduling:read"]);
    const responses = await Promise.all([
      post("/api/schedule/chapels", chapelBody()),
      patchChapel(CHAPEL_A, chapelBody({ active: false })),
      postBlock(CHAPEL_A, { from: "2026-10-01", to: "2026-10-02", reason: "Maintenance" }),
      deleteBlock("block-1"),
      postBooking("any", "confirm"),
      postBooking("any", "cancel", { reason: "x" }),
    ]);
    for (const res of responses) expect(res.status).toBe(403);
    expect((await getChapelAdminView()).chapels.find((c) => c.id === CHAPEL_A)!.active).toBe(true);
  });
});

describe("a scheduling:write session runs the park's chapels", () => {
  beforeEach(() => {
    signInAs(["scheduling:read", "scheduling:write"], "Sam Staff");
  });

  it("adds, renames and deactivates chapels", async () => {
    const created = await post("/api/schedule/chapels", chapelBody());
    expect(created.status).toBe(201);
    const { chapel } = (await created.json()) as { chapel: { id: string } };

    const renamed = await patchChapel(chapel.id, chapelBody({ name: "Chapel C (annex)", notes: "Rear" }));
    expect(renamed.status).toBe(200);

    const deactivated = await patchChapel(chapel.id, chapelBody({ name: "Chapel C (annex)", active: false }));
    expect(deactivated.status).toBe(200);

    const view = await getChapelAdminView();
    expect(view.chapels.map((c) => [c.name, c.active])).toContainEqual(["Chapel C (annex)", false]);
    // The storefront only ever sees what is active and correctly classed.
    expect((await getChapelSchedule()).chapels.map((c) => c.name)).toEqual(["Chapel A", "Chapel B"]);
  });

  it("refuses a POST that carries an id, a duplicate name and an unknown id", async () => {
    expect((await post("/api/schedule/chapels", chapelBody({ id: CHAPEL_A }))).status).toBe(422);
    expect((await post("/api/schedule/chapels", chapelBody({ name: "Chapel A" }))).status).toBe(422);
    expect((await patchChapel("nope", chapelBody())).status).toBe(404);
    expect((await post("/api/schedule/chapels", chapelBody({ name: "X" }))).status).toBe(422);
  });

  it("closes and re-opens dates, and the customer step follows", async () => {
    const closed = await postBlock(CHAPEL_A, {
      from: "2026-10-10",
      to: "2026-10-12",
      reason: "Repainting",
    });
    expect(closed.status).toBe(201);
    const { block } = (await closed.json()) as { block: { id: string } };

    const schedule = await getChapelSchedule();
    expect(schedule.blockedDates.map((entry) => entry.date)).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
    ]);
    // The customer flow refuses a stay that touches the closure.
    await expect(
      reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2026-10-11", days: 3 }),
    ).rejects.toMatchObject({ status: 409 });

    // A closure without a reason, an inverted range and an overlapped range are refused.
    expect((await postBlock(CHAPEL_A, { from: "2026-11-01", to: "2026-11-02" })).status).toBe(422);
    expect(
      (await postBlock(CHAPEL_A, { from: "2026-11-02", to: "2026-11-01", reason: "x" })).status,
    ).toBe(422);
    expect(
      (await postBlock(CHAPEL_A, { from: "2026-10-12", to: "2026-10-14", reason: "y" })).status,
    ).toBe(422);

    const opened = await deleteBlock(block.id);
    expect(opened.status).toBe(200);
    expect((await getChapelSchedule()).blockedDates).toEqual([]);
    await expect(
      reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2026-10-11", days: 3 }),
    ).resolves.toMatchObject({ resource_id: CHAPEL_A });
    expect((await deleteBlock(block.id)).status).toBe(404);
  });

  it("confirms a cart hold and cancels a chapel stay with a recorded reason", async () => {
    const held = await reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2027-02-01", days: 4 });

    const confirmed = await postBooking(held.id, "confirm");
    expect(confirmed.status).toBe(200);
    const confirmPayload = (await confirmed.json()) as { admin_state: { by: string } };
    expect(confirmPayload.admin_state.by).toBe("Sam Staff");

    const toCancel = await reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2027-02-10", days: 3 });
    // A chapel cancellation without a reason is refused, reason included.
    const refused = await postBooking(toCancel.id, "cancel");
    expect(refused.status).toBe(422);
    expect(((await refused.json()) as { error: string }).error).toContain("why");

    const cancelled = await postBooking(toCancel.id, "cancel", { reason: "Family changed plans" });
    expect(cancelled.status).toBe(200);
    const payload = (await cancelled.json()) as { status: string; admin_state: { reason: string } };
    expect(payload.status).toBe("cancelled");
    expect(payload.admin_state.reason).toBe("Family changed plans");

    const row = (await getChapelAdminView()).bookings.find((b) => b.id === toCancel.id)!;
    expect(row).toMatchObject({ status: "cancelled", reason: "Family changed plans" });

    // Cancelling freed the dates for the next customer.
    await expect(
      reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2027-02-10", days: 3 }),
    ).resolves.toBeTruthy();
  });

  it("keeps the generic cancel path untouched for non-chapel resources", async () => {
    const hearse = (await listBookings()).find((b) => b.resource_id === HEARSE)!;
    const res = await postBooking(hearse.id, "cancel");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("cancelled");
  });
});

describe("the Schedule page renders the chapel surfaces under its scopes", () => {
  it("renders every chapel section, the placeholder notice and read-only controls", async () => {
    setSession(["scheduling:read"]);
    const html = renderToStaticMarkup(await SchedulePage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("Chapels on the books");
    expect(html).toContain("Placeholder chapel list");
    expect(html).toContain("Chapel A");
    expect(html).toContain("Chapel availability");
    expect(html).toContain("Chapel bookings");
    // Read-only: no write controls.
    expect(html).not.toContain("Add chapel");
    expect(html).not.toContain("Close these dates");
    expect(html).toContain("not change it");
  });

  it("offers the write controls to a scheduling:write session", async () => {
    setSession(["scheduling:read", "scheduling:write"]);
    const html = renderToStaticMarkup(await SchedulePage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Add chapel");
    expect(html).toContain("Close these dates");
  });

  it("renders the graceful forbidden state without scheduling:read", async () => {
    setSession(["catalog:read"]);
    const html = renderToStaticMarkup(await SchedulePage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Chapels on the books");
  });
});
