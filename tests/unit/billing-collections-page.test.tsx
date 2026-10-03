import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/finance/invoices.json", async () => ({
  default: (await import("../fixtures/invoices-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * Billing & collections — the office's collections desk.
 *
 * Figures lead (outstanding, overdue, received, open invoices); the aging strip is derived
 * from each invoice's own due date; each open row carries ONE action (record a payment, or
 * open the record for a reader); the received list pairs every payment with its official
 * receipt. A figure with no record is a named blank, never ₱0.00.
 */

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

const { default: BillingPage } = await import("@/app/(staff)/staff/billing/page");
const { recordFixturePayment } = await import("@/lib/api-client/billing-store");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "ada.admin@vm.demo",
    displayName: "Ada Admin",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

async function renderBilling(params: { status?: string } = {}): Promise<string> {
  return renderToStaticMarkup(await BillingPage({ searchParams: Promise.resolve(params) }));
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-billing-desk-"));
  process.env.PAYMENTS_STORE_PATH = path.join(dir, "payments.json");
  sessionHolder.current = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T12:00:00Z"));
});

afterEach(async () => {
  vi.useRealTimers();
  delete process.env.PAYMENTS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("Billing & collections", () => {
  it("renders the graceful forbidden state without billing:read", async () => {
    setSession(["orders:read"]);
    const html = await renderBilling();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Since when");
  });

  it("leads with the figures and the derived aging strip", async () => {
    setSession(["billing:read", "billing:write"]);
    const html = await renderBilling();
    expect(html).toContain("Outstanding");
    expect(html).toContain("₱20,000.00");
    expect(html).toContain('data-testid="billing-aging"');
    for (const bucket of ["0–30 days", "31–60 days", "61–90 days", "90+ days"]) {
      expect(html, bucket).toContain(bucket);
    }
    // No payment recorded: received is a named blank, not a ₱0.
    expect(html).toMatch(/Received this month<\/span><span class="kpi-card__value">—</);
    expect(html).toContain("no payment recorded this month");
  });

  it("gives each open invoice one action: record a payment for a writer", async () => {
    setSession(["billing:read", "billing:write"]);
    const html = await renderBilling();
    expect(html).toContain('href="/staff/billing/record-payment?invoice=INV-2026-00003"');
    expect(html).toContain('aria-label="Open invoice INV-2026-00003"');
    expect(html).toContain("Liwayway Cruz");
  });

  it("offers Open instead of Record payment to a reader", async () => {
    setSession(["billing:read"]);
    const html = await renderBilling();
    expect(html).not.toContain("/staff/billing/record-payment?invoice=");
    expect(html).toContain(">Open</a>");
  });

  it("pairs a recorded payment with its official receipt", async () => {
    setSession(["billing:read", "billing:write"]);
    await recordFixturePayment({
      invoiceNumber: "INV-2026-00003",
      actor: "Ada Admin",
      now: new Date("2026-09-10T08:00:00Z"),
      input: {
        amount_cents: 100_000,
        method: "cash",
        reference: "",
        received_on: "2026-09-10",
        notes: "",
      },
    });
    const html = await renderBilling();
    expect(html).toContain("Received this month");
    expect(html).toContain("₱1,000.00");
    expect(html).toMatch(/DOC-\d{4}-\d{5}/);
    expect(html).toContain('href="/staff/documents/');
  });
});
