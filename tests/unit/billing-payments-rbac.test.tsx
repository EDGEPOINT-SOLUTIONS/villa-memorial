import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { listFixtureInvoices, listFixturePayments } from "@/lib/api-client/billing-store";
import { listDocuments } from "@/lib/api-client/documents";
import type { Session } from "@/lib/auth/types";

/**
 * RBAC gating for the counter's payment write and the screen that performs it:
 *  - the BFF route needs `billing:write` (the scope the frozen payments endpoint names) and
 *    answers 401/403 without touching the store;
 *  - the screen needs `billing:read` to be seen at all and `billing:write` to be used, with
 *    the graceful forbidden state for each;
 *  - a real session's recording steps the invoice the BILLING LIST shows on the next request,
 *    and issues the receipt the DOCUMENTS repository lists — the two promises the screen makes.
 *
 * Cookies are mocked and every test gets its own throwaway journal.
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

const paymentsRoute = await import(
  "@/app/api/billing/invoices/[number]/payments/route"
);
const { default: RecordPaymentPage } = await import(
  "@/app/(staff)/staff/billing/record-payment/page"
);

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const INVOICE = "INV-2026-00003";

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

function post(number: string, body?: unknown): Promise<Response> {
  return Promise.resolve(
    paymentsRoute.POST(
      new Request(`http://localhost/api/billing/invoices/${number}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { params: Promise.resolve({ number }) },
    ),
  );
}

function cash(amount_cents: number) {
  return {
    amount_cents,
    method: "cash",
    reference: "",
    received_on: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-billing-rbac-"));
  process.env.PAYMENTS_STORE_PATH = path.join(dir, "finance-payments.json");
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.PAYMENTS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the payment route is scope-gated", () => {
  it("answers 401 for an anonymous caller and records nothing", async () => {
    expect((await post(INVOICE, cash(1000))).status).toBe(401);
    expect(await listFixturePayments()).toEqual([]);
  });

  it("answers 403 for a read-only session and records nothing", async () => {
    signInAs(["billing:read"]);
    expect((await post(INVOICE, cash(1000))).status).toBe(403);
    expect(await listFixturePayments()).toEqual([]);
  });

  it("rejects a non-JSON body with 400 for a writer", async () => {
    signInAs(["billing:write"]);
    expect((await post(INVOICE, undefined)).status).toBe(400);
  });

  it("answers 404 for an invoice that does not exist", async () => {
    signInAs(["billing:write"]);
    expect((await post("INV-2026-99999", cash(1000))).status).toBe(404);
  });
});

describe("a billing:write session takes money at the counter", () => {
  beforeEach(() => {
    signInAs(["billing:read", "billing:write"], "Ada Admin");
  });

  it("records the payment, steps the invoice and hands back its official receipt", async () => {
    const response = await post(INVOICE, cash(50_000));
    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      invoice: { paid_cents: number; status: string };
      payment: { id: string; recorded_by: string; receipt_document: { document_number: string } };
    };
    expect(payload.invoice.paid_cents).toBe(50_000);
    expect(payload.invoice.status).toBe("partial");
    // The actor comes from the session, never from the body.
    expect(payload.payment.recorded_by).toBe("Ada Admin");
    expect(payload.payment.receipt_document.document_number).toBe("DOC-2026-00007");

    // The billing LIST the staff screen reads shows the new balance on the next request.
    const listed = (await listFixtureInvoices()).find((i) => i.invoice_number === INVOICE)!;
    expect(listed.paid_cents).toBe(50_000);

    // …and the receipt the counter printed is the row the documents repository lists.
    const receipts = await listDocuments({ document_type: "receipt" });
    expect(receipts.map((d) => d.document_number)).toContain("DOC-2026-00007");
  });

  it("reports a refusal per control and changes nothing", async () => {
    const over = await post(INVOICE, cash(180_001));
    expect(over.status).toBe(422);
    const overPayload = (await over.json()) as { fieldErrors: Record<string, string> };
    expect(overPayload.fieldErrors.amount).toMatch(/not credited/i);

    const junk = await post(INVOICE, { ...cash(1000), method: "", received_on: "2026-02-30" });
    expect(junk.status).toBe(422);
    const junkPayload = (await junk.json()) as { fieldErrors: Record<string, string> };
    expect(junkPayload.fieldErrors.method).toBeTruthy();
    expect(junkPayload.fieldErrors.received_on).toBeTruthy();

    expect(await listFixturePayments()).toEqual([]);
    expect((await listFixtureInvoices()).find((i) => i.invoice_number === INVOICE)!.paid_cents).toBe(0);
  });

  it("refuses a second payment once the invoice is settled", async () => {
    expect((await post(INVOICE, cash(180_000))).status).toBe(201);
    const again = await post(INVOICE, cash(1));
    expect(again.status).toBe(422);
    const payload = (await again.json()) as { fieldErrors: Record<string, string> };
    expect(payload.fieldErrors.amount).toMatch(/paid in full/i);
    expect((await listFixturePayments()).length).toBe(1);
  });
});

describe("the record-payment screen renders under its scopes", () => {
  it("renders the graceful forbidden state without billing:read", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await RecordPaymentPage({ searchParams: Promise.resolve({ invoice: INVOICE }) }),
    );
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain('id="pay-amount"');
  });

  it("renders the graceful forbidden state for a read-only session", async () => {
    setSession(["billing:read"]);
    const html = renderToStaticMarkup(
      await RecordPaymentPage({ searchParams: Promise.resolve({ invoice: INVOICE }) }),
    );
    expect(html).toContain("permissions this screen needs");
    expect(html).toContain("billing:write");
    expect(html).not.toContain('id="pay-amount"');
  });

  it("resolves the invoice the link named, shows what is owed and the form", async () => {
    setSession(["billing:read", "billing:write"]);
    const html = renderToStaticMarkup(
      await RecordPaymentPage({ searchParams: Promise.resolve({ invoice: INVOICE }) }),
    );
    expect(html).toContain("INV-2026-00003");
    expect(html).toContain("Liwayway Cruz");
    expect(html).toContain("Outstanding");
    expect(html).toContain('id="pay-amount"');
  });

  it("resolves the order link the Orders admin uses, and says when a reference matches nothing", async () => {
    setSession(["billing:read", "billing:write"]);
    const byOrder = renderToStaticMarkup(
      await RecordPaymentPage({ searchParams: Promise.resolve({ order: "ORD-2026-00003" }) }),
    );
    expect(byOrder).toContain("INV-2026-00003");

    const missing = renderToStaticMarkup(
      await RecordPaymentPage({ searchParams: Promise.resolve({ order: "ORD-2026-99999" }) }),
    );
    expect(missing).toContain("No invoice matches that reference");
    expect(missing).toContain("ORD-2026-99999");
    expect(missing).not.toContain('id="pay-amount"');
  });
});
