import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/finance/invoices.json", async () => ({
  default: (await import("../fixtures/invoices-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The read-only invoice (client minute 2026-09-21, item 4). The dashboard's red band names
 * a payment; this screen is where that name opens, for ANY `billing:read` session. The fix
 * the review asked for: a reader-level session could not open the payment the alert named,
 * because the only link went to the record-payment form, which needs `billing:write`.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: InvoiceDetailPage } = await import(
  "@/app/(staff)/staff/billing/invoices/[number]/page"
);

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: "00000000-0000-4000-8000-000000000012",
    tenantId: "00000000-0000-4000-8000-000000000001",
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

function params(number: string) {
  return { params: Promise.resolve({ number }) };
}

describe("the read-only invoice view", () => {
  it("renders the graceful forbidden state without billing:read", async () => {
    setSession(["orders:read"]);
    const html = renderToStaticMarkup(
      await InvoiceDetailPage(params("INV-2026-00003")),
    );
    expect(html).toContain("permissions this screen needs");
  });

  it("lets a read-only session open the payment the alert names", async () => {
    setSession(["billing:read"]);
    const html = renderToStaticMarkup(
      await InvoiceDetailPage(params("INV-2026-00003")),
    );
    expect(html).toContain("INV-2026-00003");
    expect(html).toContain("Liwayway Cruz");
    expect(html).toContain("Outstanding");
    // Read-only: no payment form and no record action.
    expect(html).not.toContain("Record payment");
    expect(html).not.toContain('id="pay-amount"');
  });

  it("offers the record action to a session that can write", async () => {
    setSession(["billing:read", "billing:write"]);
    const html = renderToStaticMarkup(
      await InvoiceDetailPage(params("INV-2026-00003")),
    );
    expect(html).toContain("Record payment");
  });

  it("404s an invoice that does not exist", async () => {
    setSession(["billing:read"]);
    await expect(InvoiceDetailPage(params("INV-2026-99999"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
