import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { listAdminCatalogItems, listCatalogItems } from "@/lib/api-client/commerce";
import type { Session } from "@/lib/auth/types";

/**
 * RBAC gating for the staff Catalogue admin and its BFF routes:
 *  - every write (create, edit, publish toggle) needs `catalog:write` and
 *    answers 401/403 without touching the store;
 *  - the list page needs `catalog:read` and renders read-only without the write
 *    scope, with the reason;
 *  - a `catalog:write` session's change is what the public STOREFRONT reader
 *    sees on the next request — the promise the screen makes.
 *
 * Cookies are mocked and every test gets its own throwaway CATALOG_STORE_PATH.
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

const itemsRoute = await import("@/app/api/catalog/items/route");
const itemRoute = await import("@/app/api/catalog/items/[idOrSku]/route");
const { default: CatalogPage } = await import("@/app/(staff)/staff/catalog/page");
const { default: NewCatalogItemPage } = await import("@/app/(staff)/staff/catalog/new/page");
const { default: EditCatalogItemPage } = await import(
  "@/app/(staff)/staff/catalog/[id]/edit/page"
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

/** The create/edit form's payload (what the client sends). */
function draft(overrides: Record<string, unknown> = {}) {
  return {
    sku: "SRV-NEW",
    name: "New memorial service",
    description: "A service the office adds.",
    item_type: "service",
    unit_price_cents: 100000,
    currency: "PHP",
    image: null,
    published: true,
    ...overrides,
  };
}

function post(body?: unknown): Promise<Response> {
  return Promise.resolve(
    itemsRoute.POST(
      new Request("http://localhost/api/catalog/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    ),
  );
}

function patch(idOrSku: string, body: unknown): Promise<Response> {
  return itemRoute.PATCH(
    new Request(`http://localhost/api/catalog/items/${idOrSku}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ idOrSku }) },
  );
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-catalog-rbac-"));
  process.env.CATALOG_STORE_PATH = path.join(dir, "catalog.json");
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.CATALOG_STORE_PATH;
  delete process.env.ORDERS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("catalog write routes are scope-gated", () => {
  it("answers 401 for an anonymous caller and writes nothing", async () => {
    expect((await post(draft())).status).toBe(401);
    expect((await patch("PKG-BASIC", draft({ sku: "PKG-BASIC" }))).status).toBe(401);
    expect((await listAdminCatalogItems()).some((record) => record.item.sku === "SRV-NEW")).toBe(false);
  });

  it("answers 403 for a read-only session and writes nothing", async () => {
    signInAs(["catalog:read"]);
    expect((await post(draft())).status).toBe(403);
    expect((await patch("PKG-BASIC", draft({ sku: "PKG-BASIC" }))).status).toBe(403);
    expect((await listAdminCatalogItems()).some((record) => record.item.sku === "SRV-NEW")).toBe(false);
  });

  it("rejects a non-JSON body with 400 for a writer", async () => {
    signInAs(["catalog:write"]);
    expect((await post(undefined)).status).toBe(400);
  });
});

describe("a catalog:write session runs the catalogue", () => {
  beforeEach(() => {
    signInAs(["catalog:read", "catalog:write"], "Ada Admin");
  });

  it("creates an item and the STOREFRONT reader sees it on the next request", async () => {
    const created = await post(draft());
    expect(created.status).toBe(201);
    const payload = (await created.json()) as { item: { item: { sku: string; id: number } } };
    expect(payload.item.item.sku).toBe("SRV-NEW");

    const storefront = await listCatalogItems();
    const seen = storefront.find((item) => item.sku === "SRV-NEW");
    expect(seen).toBeDefined();
    expect(seen!.name).toBe("New memorial service");
    expect(seen!.unit_price_cents).toBe(100000);

    // The public BFF read the cart hydrates from carries it too.
    const publicRead = await itemsRoute.GET();
    const publicPayload = (await publicRead.json()) as { items: Array<{ sku: string }> };
    expect(publicPayload.items.map((item) => item.sku)).toContain("SRV-NEW");
  });

  it("edits a price, then takes the item off the storefront — deactivate, never delete", async () => {
    const created = await post(draft());
    const createdPayload = (await created.json()) as { item: { item: { id: number } } };
    const id = String(createdPayload.item.item.id);

    const reprice = await patch(id, draft({ unit_price_cents: 125000 }));
    expect(reprice.status).toBe(200);
    expect((await listCatalogItems()).find((item) => item.sku === "SRV-NEW")!.unit_price_cents).toBe(125000);

    const off = await patch(id, draft({ unit_price_cents: 125000, published: false }));
    expect(off.status).toBe(200);
    expect((await listCatalogItems()).some((item) => item.sku === "SRV-NEW")).toBe(false);
    // The admin list still holds it, deactivated.
    const admin = (await listAdminCatalogItems()).find((record) => record.item.sku === "SRV-NEW");
    expect(admin!.published).toBe(false);
  });

  it("reports validation per control and refuses a duplicate SKU", async () => {
    const invalid = await post(draft({ unit_price_cents: 100.5, name: "" }));
    expect(invalid.status).toBe(422);
    const payload = (await invalid.json()) as { error: string; fieldErrors: Record<string, string> };
    expect(payload.fieldErrors.unit_price_cents).toMatch(/integer centavos/i);
    expect(payload.fieldErrors.name).toBeTruthy();

    const duplicate = await post(draft({ sku: "pkg-basic" }));
    expect(duplicate.status).toBe(422);
    const duplicatePayload = (await duplicate.json()) as { fieldErrors: Record<string, string> };
    expect(duplicatePayload.fieldErrors.sku).toMatch(/already used/i);
  });

  it("answers 404 for an unknown item on edit", async () => {
    const res = await patch("999999", draft());
    expect(res.status).toBe(404);
  });
});

describe("the staff catalogue screens render under their scopes", () => {
  it("renders the graceful forbidden state without catalog:read", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await CatalogPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Basic Package");
  });

  it("renders the catalogue read-only for a catalog:read session, with the reason", async () => {
    setSession(["catalog:read"]);
    const html = renderToStaticMarkup(
      await CatalogPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("Basic Package");
    expect(html).toContain("PKG-BASIC");
    expect(html).toContain("₱600.00 / month");
    expect(html).toContain("Read-only");
    expect(html).toContain("catalog:write");
    expect(html).not.toContain("+ New catalog item");
    expect(html).not.toContain("Take off storefront");
    expect(html).not.toContain(">Edit<");
  });

  it("offers create, edit and publish controls to a catalog:write session", async () => {
    setSession(["catalog:read", "catalog:write"]);
    const html = renderToStaticMarkup(
      await CatalogPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("+ New catalog item");
    expect(html).toContain('href="/staff/catalog/101/edit"');
    expect(html).toContain("Take off storefront");
    expect(html).not.toContain("Read-only");
  });

  it("applies the type and published filters server-side", async () => {
    setSession(["catalog:read", "catalog:write"]);
    const packages = renderToStaticMarkup(
      await CatalogPage({ searchParams: Promise.resolve({ type: "package" }) }),
    );
    expect(packages).toContain("PKG-BASIC");
    expect(packages).not.toContain("SRV-DELIVERY");

    const search = renderToStaticMarkup(
      await CatalogPage({ searchParams: Promise.resolve({ q: "imperial" }) }),
    );
    expect(search).toContain("CSK-IMPERIAL-FLEXI");
    expect(search).not.toContain("PKG-BASIC");
  });

  it("shows the empty state when nothing matches", async () => {
    setSession(["catalog:read"]);
    const html = renderToStaticMarkup(
      await CatalogPage({ searchParams: Promise.resolve({ q: "no-such-item" }) }),
    );
    expect(html).toContain("No catalog items match your filter");
  });

  it("gates the new-item page on catalog:write and renders the form for writers", async () => {
    setSession(["catalog:read"]);
    expect(renderToStaticMarkup(await NewCatalogItemPage())).toContain(
      "permissions this screen needs",
    );

    setSession(["catalog:read", "catalog:write"]);
    const html = renderToStaticMarkup(await NewCatalogItemPage());
    expect(html).toContain("New catalog item");
    expect(html).toContain("Unit price");
    expect(html).toContain("Published — offered on the storefront");
  });

  it("prefills the edit page from the durable store and handles an unknown id", async () => {
    setSession(["catalog:read", "catalog:write"]);
    const html = renderToStaticMarkup(
      await EditCatalogItemPage({ params: Promise.resolve({ id: "101" }) }),
    );
    expect(html).toContain("Edit PKG-BASIC");
    expect(html).toContain('value="Basic Package"');
    expect(html).toContain('value="600.00"');

    const missing = renderToStaticMarkup(
      await EditCatalogItemPage({ params: Promise.resolve({ id: "999999" }) }),
    );
    expect(missing).toContain("No catalog item 999999");
  });
});
