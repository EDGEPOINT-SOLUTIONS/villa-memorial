import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getAdminOrder } from "@/lib/api-client/commerce";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/commerce/orders.json", async () => ({
  default: (await import("../fixtures/orders-demo.json")).default,
}));
vi.mock("@/lib/fixtures/finance/invoices.json", async () => ({
  default: (await import("../fixtures/invoices-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * RBAC gating for the staff Orders admin:
 *  - the write route (`POST /api/orders/:number/status`) requires `orders:write` and
 *    returns 401/403 without touching the store;
 *  - the list/detail pages require `orders:read` (graceful ForbiddenState, the same shape
 *    billing uses) and render the transitions read-only without `orders:write`.
 *
 * The route's session cookies are mocked; the pages' scene is the recorded seed with a
 * throwaway ORDERS_STORE_PATH per test.
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

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const { POST } = await import("@/app/api/orders/[number]/status/route");
const { default: OrdersPage } = await import("@/app/(staff)/staff/orders/page");
const { default: OrderDetailPage } = await import(
  "@/app/(staff)/staff/orders/[number]/page"
);

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

function userCookie(displayName: string): string {
  return Buffer.from(
    JSON.stringify({
      id: USER_ID,
      tenant_id: TENANT_ID,
      email: "sam.staff@vm.demo",
      display_name: displayName,
    }),
    "utf8",
  ).toString("base64");
}

function signInAs(scopes: string[], displayName = "Sam Staff") {
  cookieJar.values.im_at = accessToken(scopes);
  cookieJar.values.im_u = userCookie(displayName);
}

async function postStatus(number: string, body: unknown): Promise<Response> {
  const request = new Request(`http://localhost/api/orders/${number}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ number }) });
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

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-orders-rbac-"));
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.ORDERS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("POST /api/orders/:number/status authorization", () => {
  it("rejects an anonymous request with 401 and leaves the order untouched", async () => {
    const res = await postStatus("ORD-2026-00001", { status: "confirmed" });
    expect(res.status).toBe(401);
    expect((await getAdminOrder("ORD-2026-00001"))!.lifecycle_status).toBe("new");
  });

  it("rejects a read-only session with 403 and leaves the order untouched", async () => {
    signInAs(["orders:read"]);
    const res = await postStatus("ORD-2026-00001", { status: "confirmed" });
    expect(res.status).toBe(403);
    expect((await getAdminOrder("ORD-2026-00001"))!.lifecycle_status).toBe("new");
  });

  it("applies the transition for an orders:write session and stamps the actor", async () => {
    signInAs(["orders:read", "orders:write"], "Ada Admin");
    const res = await postStatus("ORD-2026-00001", { status: "confirmed" });
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { lifecycle_status: string };
    expect(payload.lifecycle_status).toBe("confirmed");

    const record = await getAdminOrder("ORD-2026-00001");
    expect(record!.lifecycle_status).toBe("confirmed");
    expect(record!.timeline.at(-1)).toMatchObject({ status: "confirmed", by: "Ada Admin" });
  });

  it("rejects a disallowed transition with 422 (the store's rule wins)", async () => {
    signInAs(["orders:write"]);
    const res = await postStatus("ORD-2026-00001", { status: "fulfilled" });
    expect(res.status).toBe(422);
    expect((await getAdminOrder("ORD-2026-00001"))!.lifecycle_status).toBe("new");
  });

  it("rejects an unknown status value and a cancellation without a reason", async () => {
    signInAs(["orders:write"]);
    expect((await postStatus("ORD-2026-00001", { status: "archived" })).status).toBe(422);
    expect((await postStatus("ORD-2026-00001", { status: "cancelled" })).status).toBe(422);
    expect((await getAdminOrder("ORD-2026-00001"))!.lifecycle_status).toBe("new");
  });
});

describe("staff Orders pages read gating", () => {
  it("renders the graceful forbidden state without orders:read", async () => {
    setSession(["catalog:read"]);
    const html = renderToStaticMarkup(
      await OrdersPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("ORD-2026-00001");
  });

  it("renders the seeded orders for an orders:read session, newest first", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await OrdersPage({ searchParams: Promise.resolve({}) }),
    );
    for (const number of [
      "ORD-2026-00001",
      "ORD-2026-00002",
      "ORD-2026-00004",
      "ORD-2026-00006",
      "ORD-2026-00007",
    ]) {
      expect(html).toContain(number);
    }
    // Newest first: ORD-2026-00006 (2026-08-05) sits above ORD-2026-00001 (2026-07-01).
    expect(html.indexOf("ORD-2026-00006")).toBeLessThan(html.indexOf("ORD-2026-00001"));
  });

  it("applies the status filter server-side", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await OrdersPage({ searchParams: Promise.resolve({ status: "cancelled" }) }),
    );
    expect(html).toContain("ORD-2026-00006");
    expect(html).not.toContain("ORD-2026-00001");
  });

  it("applies the search filter server-side", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await OrdersPage({ searchParams: Promise.resolve({ q: "roberto" }) }),
    );
    expect(html).toContain("ORD-2026-00002");
    expect(html).not.toContain("ORD-2026-00001");
  });

  it("renders the detail read-only without orders:write", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await OrderDetailPage({ params: Promise.resolve({ number: "ORD-2026-00001" }) }),
    );
    expect(html).toContain("ORD-2026-00001");
    expect(html).toContain("can view this order but not change it");
    expect(html).not.toContain("Confirm order");
    expect(html).not.toContain("Cancel order");
  });

  it("offers the legal transitions to an orders:write session", async () => {
    setSession(["orders:read", "orders:write"]);
    const html = renderToStaticMarkup(
      await OrderDetailPage({ params: Promise.resolve({ number: "ORD-2026-00001" }) }),
    );
    expect(html).toContain("Confirm order");
    expect(html).toContain("Cancel order");
    expect(html).not.toContain("Mark fulfilled"); // new → fulfilled is not offered
  });

  it("shows an honest not-found state for an unknown number", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await OrderDetailPage({ params: Promise.resolve({ number: "ORD-1999-99999" }) }),
    );
    expect(html).toContain("No order ORD-1999-99999");
  });
});
