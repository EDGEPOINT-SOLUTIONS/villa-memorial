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
 * The Accounting screen's money half.
 *
 * The receivables view's tiles, the aging buckets and the receipts all read recorded
 * billing/ledger records. A figure with no record is a named blank or a named gap —
 * never a ₱0 that reads as recorded money — and the screen stays read-only.
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

const { default: AccountingPage } = await import("@/app/(staff)/staff/accounting/page");
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

async function renderAccounting(
  params: { from?: string; to?: string; view?: string } = {},
): Promise<string> {
  return renderToStaticMarkup(await AccountingPage({ searchParams: Promise.resolve(params) }));
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-accounting-money-"));
  process.env.PAYMENTS_STORE_PATH = path.join(dir, "payments.json");
  process.env.PROVISIONAL_RECEIPTS_STORE_PATH = path.join(dir, "provisional.json");
  sessionHolder.current = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T12:00:00Z"));
});

afterEach(async () => {
  vi.useRealTimers();
  delete process.env.PAYMENTS_STORE_PATH;
  delete process.env.PROVISIONAL_RECEIPTS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("staff Accounting — the money view", () => {
  beforeEach(() => setSession(["accounting:read", "billing:read", "orders:read", "cases:read"]));

  it("names a blank, never a ₱0, when the counter has recorded nothing", async () => {
    const html = await renderAccounting({ view: "receivables" });
    expect(html).toContain("Received this month");
    expect(html).toContain("no payment recorded this month");
    // The received tile's figure is a named blank, not a zero.
    expect(html).toMatch(/Received this month<\/span><span class="kpi-card__value">—</);
  });

  it("names each reconciliation flag's missing feed and the records not built", async () => {
    const html = await renderAccounting({ view: "reconciliation" });
    expect(html).toContain("unposted");
    expect(html).toContain("unmatched");
    expect(html).toContain("posting-instruction-v1");
    expect(html).toContain("Expenses");
    expect(html).toContain("statements");
    expect(html).toContain("reporting-analytics");
  });

  it("shows the recorded receipt and the derived dues once a payment exists", async () => {
    await recordFixturePayment({
      invoiceNumber: "INV-2026-00006",
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

    const receivables = await renderAccounting({ view: "receivables" });
    // Received this month = the ₱1,000 payment; outstanding falls to ₱19,000.
    expect(receivables).toContain("₱1,000.00");
    expect(receivables).toContain("₱19,000.00");
    expect(receivables).toContain('data-testid="accounting-aging"');

    const receipts = await renderAccounting({ view: "receipts" });
    // The payment issued an official receipt whose number the receipts table prints.
    expect(receipts).toMatch(/DOC-\d{4}-\d{5}/);
    expect(receipts).toContain('href="/staff/documents/');
    // The provisional journal is still honestly empty.
    expect(receipts).toContain("No provisional receipt recorded");
  });

  it("names the billing scope when the session cannot read the money records", async () => {
    setSession(["accounting:read"]);
    const html = await renderAccounting({ view: "receivables" });
    expect(html).toContain("Aging needs billing:read");
    expect(html).toContain("Open invoices need billing:read");
  });

  it("keeps exactly one h1 and stays read-only", async () => {
    const html = await renderAccounting();
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).not.toMatch(/>Post\b/);
  });
});
