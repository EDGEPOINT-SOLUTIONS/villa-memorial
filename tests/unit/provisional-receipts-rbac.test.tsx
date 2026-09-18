import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { listFixtureProvisionalReceipts } from "@/lib/api-client/provisional-receipts-store";
import { recordFixturePayment } from "@/lib/api-client/billing-store";

/**
 * Scope gating and rendering for the provisional-receipt flow:
 *  - the BFF route needs `billing:write` and answers 401/403 without touching the journal;
 *  - the list and capture screens need `billing:read` / `billing:write`, with the graceful
 *    forbidden state for each;
 *  - the counter's record reaches the list, and the moment a billing payment issues an
 *    official receipt the detail page shows THAT receipt instead of the provisional slip.
 *
 * Cookies are mocked and every test gets its own throwaway journals.
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

const route = await import("@/app/api/billing/provisional-receipts/route");
const { default: ProvisionalReceiptsPage } = await import(
  "@/app/(staff)/staff/billing/provisional-receipts/page"
);
const { default: NewProvisionalReceiptPage } = await import(
  "@/app/(staff)/staff/billing/provisional-receipts/new/page"
);
const { default: ProvisionalReceiptPage } = await import(
  "@/app/(staff)/staff/billing/provisional-receipts/[id]/page"
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

function post(body?: unknown): Promise<Response> {
  return Promise.resolve(
    route.POST(
      new Request("http://localhost/api/billing/provisional-receipts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    ),
  );
}

function slipInput(over: Record<string, unknown> = {}) {
  return {
    invoice_number: INVOICE,
    case_number: null,
    payer: "Liwayway Cruz",
    amount_cents: 50_000,
    instrument: "cash",
    reference: "",
    received_on: "2026-09-18",
    notes: "",
    ...over,
  };
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-provisional-rbac-"));
  process.env.PAYMENTS_STORE_PATH = path.join(dir, "finance-payments.json");
  process.env.PROVISIONAL_RECEIPTS_STORE_PATH = path.join(dir, "provisional-receipts.json");
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.PAYMENTS_STORE_PATH;
  delete process.env.PROVISIONAL_RECEIPTS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the provisional-receipt route is scope-gated", () => {
  it("answers 401 for an anonymous caller and writes nothing", async () => {
    expect((await post(slipInput())).status).toBe(401);
    expect(await listFixtureProvisionalReceipts()).toEqual([]);
  });

  it("answers 403 for a read-only session and writes nothing", async () => {
    signInAs(["billing:read"]);
    expect((await post(slipInput())).status).toBe(403);
    expect(await listFixtureProvisionalReceipts()).toEqual([]);
  });

  it("rejects a non-JSON body with 400 for a writer", async () => {
    signInAs(["billing:write"]);
    expect((await post(undefined)).status).toBe(400);
  });

  it("answers 404 for an invoice that does not exist", async () => {
    signInAs(["billing:write"]);
    expect((await post(slipInput({ invoice_number: "INV-2026-99999" }))).status).toBe(404);
  });
});

describe("a billing:write session issues the counter's paper", () => {
  beforeEach(() => {
    signInAs(["billing:read", "billing:write"], "Ada Admin");
  });

  it("records the slip with the session's actor and no receipt number", async () => {
    const response = await post(slipInput());
    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      receipt: { id: string; received_by: string; invoice_number: string; payer: string };
    };
    expect(payload.receipt.id).toMatch(/^prov-/);
    expect(payload.receipt.id).not.toContain("DOC-");
    expect(payload.receipt.received_by).toBe("Ada Admin");
    expect(payload.receipt.invoice_number).toBe(INVOICE);
    expect(payload.receipt.payer).toBe("Liwayway Cruz");

    const journal = await listFixtureProvisionalReceipts();
    expect(journal.map((r) => r.id)).toEqual([payload.receipt.id]);
  });

  it("reports a refusal per control and changes nothing", async () => {
    const noPayer = await post(slipInput({ payer: "  " }));
    expect(noPayer.status).toBe(422);
    const payerPayload = (await noPayer.json()) as { fieldErrors: Record<string, string> };
    expect(payerPayload.fieldErrors.payer).toMatch(/Name the person/i);

    const over = await post(slipInput({ amount_cents: 180_001 }));
    expect(over.status).toBe(422);
    const overPayload = (await over.json()) as { fieldErrors: Record<string, string> };
    expect(overPayload.fieldErrors.amount).toMatch(/still owed/i);

    expect(await listFixtureProvisionalReceipts()).toEqual([]);
  });
});

describe("the provisional-receipt screens render under their scopes", () => {
  it("renders the graceful forbidden state without billing:read", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(await ProvisionalReceiptsPage());
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Issue a provisional receipt");
  });

  it("renders the empty journal plainly, with the issue action for writers", async () => {
    setSession(["billing:read", "billing:write"]);
    const html = renderToStaticMarkup(await ProvisionalReceiptsPage());
    expect(html).toContain("No provisional receipts issued yet");
    expect(html).toContain("Issue a provisional receipt");
  });

  it("renders the graceful forbidden state on the capture without billing:write", async () => {
    setSession(["billing:read"]);
    const html = renderToStaticMarkup(
      await NewProvisionalReceiptPage({ searchParams: Promise.resolve({ invoice: INVOICE }) }),
    );
    expect(html).toContain("permissions this screen needs");
    expect(html).toContain("billing:write");
    expect(html).not.toContain('id="receipt-amount"');
  });

  it("resolves the invoice the link named, with its recorded fields and the folio capture", async () => {
    setSession(["billing:read", "billing:write"]);
    const html = renderToStaticMarkup(
      await NewProvisionalReceiptPage({ searchParams: Promise.resolve({ invoice: INVOICE }) }),
    );
    expect(html).toContain("What it settles");
    expect(html).toContain(INVOICE);
    expect(html).toContain("Liwayway Cruz");
    expect(html).toContain('id="receipt-amount"');
    expect(html).toContain("Received by");
    expect(html).toContain("Sam Staff");
  });

  it("resolves a case link and says when a reference matches no invoice", async () => {
    setSession(["billing:read", "billing:write", "cases:read"]);
    const byCase = renderToStaticMarkup(
      await NewProvisionalReceiptPage({ searchParams: Promise.resolve({ case: "CASE-2026-09001" }) }),
    );
    expect(byCase).toContain("What it settles");

    const missing = renderToStaticMarkup(
      await NewProvisionalReceiptPage({
        searchParams: Promise.resolve({ invoice: "INV-2026-99999" }),
      }),
    );
    // A reference that names nothing leaves the picker standing in, never a guessed invoice.
    expect(missing).toContain('id="receipt-invoice"');
    expect(missing).not.toContain('value="Liwayway Cruz"');
  });

  it("says plainly when the id names no journal record", async () => {
    setSession(["billing:read", "billing:write"]);
    const html = renderToStaticMarkup(
      await ProvisionalReceiptPage({ params: Promise.resolve({ id: "prov-nope" }) }),
    );
    expect(html).toContain("not in the counter&#x27;s journal");
  });

  it("shows the marked provisional paper, and replaces it with the official receipt", async () => {
    setSession(["billing:read", "billing:write"]);
    signInAs(["billing:read", "billing:write"], "Ada Admin");
    const created = await post(slipInput({ amount_cents: 100_000, case_number: "CASE-2026-0001" }));
    const { receipt } = (await created.json()) as { receipt: { id: string } };

    const listBefore = renderToStaticMarkup(await ProvisionalReceiptsPage());
    expect(listBefore).toContain("Awaiting official receipt");
    expect(listBefore).toContain("Liwayway Cruz");

    const provisional = renderToStaticMarkup(
      await ProvisionalReceiptPage({ params: Promise.resolve({ id: receipt.id }) }),
    );
    expect(provisional).toContain("Provisional receipt");
    expect(provisional).toContain("Not an official receipt — the official receipt will replace this paper.");
    expect(provisional).toContain("Received from");
    expect(provisional).not.toContain("Receipt no.");
    // The family's paper is exportable three ways from the same blocks.
    expect(provisional).toContain("Print");
    expect(provisional).toContain("Word");
    expect(provisional).toContain("PDF");

    // The office records the payment through the merged billing flow; its official receipt
    // now replaces the slip — one state, never both.
    await recordFixturePayment({
      invoiceNumber: INVOICE,
      input: {
        amount_cents: 100_000,
        method: "cash",
        reference: "",
        received_on: "2026-09-18",
        notes: "",
      },
      actor: "Ada Admin",
      now: new Date("2026-09-18T05:00:00Z"),
    });

    const listAfter = renderToStaticMarkup(await ProvisionalReceiptsPage());
    expect(listAfter).toContain("DOC-2026-00007");

    const replaced = renderToStaticMarkup(
      await ProvisionalReceiptPage({ params: Promise.resolve({ id: receipt.id }) }),
    );
    expect(replaced).toContain("Official receipt DOC-2026-00007");
    expect(replaced).toContain("View the official receipt in Documents");
    expect(replaced).not.toContain("Not an official receipt — the official receipt will replace this paper.");
    expect(replaced).not.toContain("Signature:");
  });
});
