import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The LIVE payment branch — a real BFF proxy, not a stub.
 *
 * `billing-list-api-v1` names the endpoint but not its request/response body, so this suite
 * pins the two things that matter most about that gap:
 *  1. the body the app sends (its own `*_cents` naming + the counter's slip fields), so a
 *     contract can be diffed against it rather than guessed at later;
 *  2. that a live payment carries an official receipt ONLY when the service named one — the
 *     null that stops the screen printing a receipt nobody issued.
 *
 * The invoice after the write is always RE-READ from the contract's own read path, so the
 * balance the screen shows is the service's figure and never the request's arithmetic.
 */

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => ({ name, value: "fixture-access-token" }),
  }),
}));

process.env.BILLING_BASE_URL = "https://gateway.example.com";

type Call = { method: string; url: string; body: unknown };
const calls: Call[] = [];

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: { get: () => "application/json" },
  } as unknown as Response;
}

/** The service's invoice as the contract's list/detail shapes carry it. */
function serviceInvoice(paid_cents: number) {
  return {
    id: "00000000-0000-4000-8000-000000000E03",
    number: "INV-2026-00003",
    customer_name: "Liwayway Cruz",
    order_number: "ORD-2026-00003",
    total_cents: 180_000,
    paid_cents,
    currency: "PHP",
    status: paid_cents >= 180_000 ? "paid" : paid_cents > 0 ? "partially_paid" : "issued",
    issued_at: "2026-05-01T08:00:00Z",
    due_at: "2026-05-15T08:00:00Z",
  };
}

function routeFetch(handlers: {
  payment: () => Response;
  invoice: () => Response;
  extra?: Array<{ match: string; respond: () => Response }>;
}) {
  return vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const href = String(input);
    const method = init?.method ?? "GET";
    calls.push({
      method,
      url: href,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    for (const extra of handlers.extra ?? []) {
      if (href.includes(extra.match)) return extra.respond();
    }
    if (href.includes("/payments")) return handlers.payment();
    return handlers.invoice();
  });
}

const INPUT = {
  amount_cents: 50_000,
  method: "cash",
  reference: "",
  received_on: "2026-09-18",
  notes: "counter",
};

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  calls.length = 0;
});

describe("recording a payment in live mode", () => {
  it("posts the app's body to the frozen endpoint and re-reads the invoice", async () => {
    globalThis.fetch = routeFetch({
      invoice: () => jsonResponse(200, serviceInvoice(50_000)),
      payment: () =>
        jsonResponse(201, {
          id: "PMT-0001",
          amount_cents: 50_000,
          method: "cash",
          received_on: "2026-09-18",
          receipt: {
            id: "00000000-0000-4000-8000-900000000000",
            document_number: "DOC-2026-00042",
            title: "Official Receipt — INV-2026-00003",
            file_size_bytes: 678,
          },
        }),
    });

    const { recordPayment } = await import("@/lib/api-client/finance");
    const result = await recordPayment({
      invoiceNumber: "INV-2026-00003",
      input: INPUT,
      actor: "Sam Staff",
    });

    const posted = calls.find((call) => call.method === "POST");
    expect(posted?.url).toBe(
      "https://gateway.example.com/billing/api/v1/invoices/INV-2026-00003/payments",
    );
    expect(posted?.body).toEqual(INPUT);

    // The balance is the SERVICE's figure, derived by the frozen rules.
    expect(result.invoice.paid_cents).toBe(50_000);
    expect(result.invoice.status).toBe("partial");
    // …and the receipt is the one the service named.
    expect(result.payment).not.toBeNull();
    expect(result.payment!.receipt_document!.document_number).toBe("DOC-2026-00042");
    expect(result.payment!.receipt_document!.title).toBe("Official Receipt — INV-2026-00003");
    expect(result.payment!.id).toBe("PMT-0001");
  });

  it("carries NO receipt when the service named none — nothing gets printed", async () => {
    globalThis.fetch = routeFetch({
      invoice: () => jsonResponse(200, serviceInvoice(50_000)),
      payment: () =>
        jsonResponse(201, { id: "PMT-0002", amount_cents: 50_000, method: "cash" }),
    });

    const { recordPayment } = await import("@/lib/api-client/finance");
    const result = await recordPayment({
      invoiceNumber: "INV-2026-00003",
      input: INPUT,
      actor: "Sam Staff",
    });
    expect(result.payment!.receipt_document).toBeNull();
  });

  it("shows no payment at all when the service's answer is not a payment", async () => {
    globalThis.fetch = routeFetch({
      invoice: () => jsonResponse(200, serviceInvoice(50_000)),
      payment: () => jsonResponse(201, { accepted: true }),
    });

    const { recordPayment } = await import("@/lib/api-client/finance");
    const result = await recordPayment({
      invoiceNumber: "INV-2026-00003",
      input: INPUT,
      actor: "Sam Staff",
    });
    expect(result.payment).toBeNull();
    expect(result.invoice.paid_cents).toBe(50_000);
  });

  it("surfaces the service's own refusal instead of a friendlier guess", async () => {
    globalThis.fetch = routeFetch({
      invoice: () => jsonResponse(200, serviceInvoice(0)),
      payment: () => jsonResponse(422, { error: "the invoice is locked for audit" }),
    });

    const { recordPayment } = await import("@/lib/api-client/finance");
    await expect(
      recordPayment({ invoiceNumber: "INV-2026-00003", input: INPUT, actor: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 422, message: "the invoice is locked for audit" });
  });

  it("refuses an overpayment locally, before the service is ever called", async () => {
    globalThis.fetch = routeFetch({
      invoice: () => jsonResponse(200, serviceInvoice(0)),
      payment: () => jsonResponse(500, { error: "should not be reached" }),
    });

    const { recordPayment } = await import("@/lib/api-client/finance");
    await expect(
      recordPayment({
        invoiceNumber: "INV-2026-00003",
        input: { ...INPUT, amount_cents: 180_001 },
        actor: "Sam Staff",
      }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { amount: expect.any(String) } });
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("says so when the payment landed but the invoice cannot be re-read", async () => {
    let invoiceReads = 0;
    globalThis.fetch = routeFetch({
      // The balance read before the write succeeds; the re-read after it does not.
      invoice: () =>
        ++invoiceReads === 1
          ? jsonResponse(200, serviceInvoice(0))
          : jsonResponse(404, { error: "not_found" }),
      payment: () => jsonResponse(201, { id: "PMT-0003", amount_cents: 50_000, method: "cash" }),
    });

    const { recordPayment } = await import("@/lib/api-client/finance");
    await expect(
      recordPayment({ invoiceNumber: "INV-2026-00003", input: INPUT, actor: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 502 });
    // The write really did happen before the re-read failed.
    expect(calls.some((call) => call.method === "POST")).toBe(true);
  });

  it("does not claim an invoice has no payments when the contract has no list", async () => {
    globalThis.fetch = routeFetch({
      invoice: () => jsonResponse(200, serviceInvoice(0)),
      payment: () => jsonResponse(201, {}),
    });
    const { listPaymentsForInvoice } = await import("@/lib/api-client/finance");
    expect(await listPaymentsForInvoice("INV-2026-00003")).toEqual({
      payments: [],
      listed: false,
    });
  });
});
