import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/finance/accounting.json", async () => ({
  default: (await import("../fixtures/accounting-demo.json")).default,
}));
vi.mock("@/lib/fixtures/finance/invoices.json", async () => ({
  default: (await import("../fixtures/invoices-demo.json")).default,
}));
vi.mock("@/lib/fixtures/operations/cases.json", async () => ({
  default: (await import("../fixtures/operations-cases-demo.json")).default,
}));
vi.mock("@/lib/fixtures/commerce/orders.json", async () => ({
  default: (await import("../fixtures/orders-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The Accounting screen — the four tool views.
 *
 * Books leads with the chart of accounts DERIVED from the recorded journal (every
 * account, movement or not), then the journal. A period with no entries is an honest
 * state, never an "out of balance" verdict. The other views carry the receivables, the
 * receipts and the reconciliation gaps. The screen stays read-only: no posting control.
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

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

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

async function renderAccounting(
  params: { from?: string; to?: string; view?: string } = {},
): Promise<string> {
  return renderToStaticMarkup(await AccountingPage({ searchParams: Promise.resolve(params) }));
}

describe("staff Accounting page gating", () => {
  it("renders the graceful forbidden state without accounting:read", async () => {
    setSession(["billing:read"]);
    const html = await renderAccounting();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Chart of accounts");
  });
});

describe("staff Accounting page — the books", () => {
  beforeEach(() => setSession(["accounting:read", "cases:read", "orders:read"]));

  it("names the missing API once, before the first balance", async () => {
    const html = await renderAccounting();
    const stateIndex = html.indexOf("No staff-facing ledger API exists yet");
    expect(stateIndex).toBeGreaterThan(-1);
    expect(stateIndex).toBeLessThan(html.indexOf("Chart of accounts"));
  });

  it("renders the whole chart of accounts derived from the journal, sides equal", async () => {
    const html = await renderAccounting();
    expect(html).toContain("Chart of accounts");
    expect(html).toContain("Balanced");
    // The recorded ledger's own totals: ₱3,915,140.00 on each side.
    expect(html).toContain("₱3,915,140.00");
    expect(html).toContain("Accounts receivable");
    expect(html).toContain("Funeral service revenue");
    // A net balance carries its side.
    expect(html).toMatch(/₱[\d,]+\.\d\d (Dr|Cr)/);
  });

  it("lists every chart account in the tool view, movement or not", async () => {
    const html = await renderAccounting();
    // 15 recorded accounts; the cash account with no movement still has a row.
    expect((html.match(/table__name/g) ?? []).length).toBeGreaterThanOrEqual(15);
    expect(html).toContain("Cash on hand");
  });

  it("lists the journal with its amounts and links the case/order it is against", async () => {
    const html = await renderAccounting();
    expect(html).toContain("Journal");
    expect(html).toContain("Sale — ORD-2026-00001");
    expect(html).toContain('href="/staff/orders/ORD-2026-00001"');
    expect(html).toContain("Retrieval crew advance — CASE-2026-0002");
    expect(html).toContain('href="/staff/cases/CASE-2026-0002"');
  });

  it("keeps references as plain text when the session cannot open the linked screen", async () => {
    setSession(["accounting:read"]);
    const html = await renderAccounting();
    expect(html).toContain("ORD-2026-00001");
    expect(html).not.toContain('href="/staff/orders/ORD-2026-00001"');
    expect(html).not.toContain('href="/staff/cases/CASE-2026-0002"');
  });

  it("applies the period to both the chart and the journal", async () => {
    const html = await renderAccounting({ from: "2026-03-01", to: "2026-03-31" });
    expect(html).toContain("March office rent");
    expect(html).not.toContain("August payroll");
    expect(html).toContain("of 26 recorded");
    expect(html).toContain("₱1,951,200.00"); // March's own debit total
  });

  it("shows the honest empty state for a period with no entries", async () => {
    const html = await renderAccounting({ from: "2027-01-01", to: "2027-01-31" });
    expect(html).toContain("Nothing posted");
    expect(html).not.toContain("Journal");
  });

  it("is read-only: it says so and carries no posting control", async () => {
    const html = await renderAccounting();
    expect(html).toContain("Read-only");
    expect(html).not.toMatch(/>Post\b/);
  });

  it("keeps exactly one h1", async () => {
    const html = await renderAccounting();
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain("<h1>Accounting</h1>");
  });
});

describe("staff Accounting page — the tool views", () => {
  beforeEach(() => setSession(["accounting:read", "billing:read", "cases:read", "orders:read"]));

  it("opens receivables with aging, open invoices and the client accounts", async () => {
    const html = await renderAccounting({ view: "receivables" });
    expect(html).toContain('data-testid="accounting-aging"');
    expect(html).toContain("Client accounts");
    expect(html).toContain("Open invoices");
  });

  it("opens receipts with the official and provisional journals", async () => {
    const html = await renderAccounting({ view: "receipts" });
    expect(html).toContain("Official receipts");
    expect(html).toContain("Provisional receipts");
  });

  it("opens reconciliation with the two named flag feeds", async () => {
    const html = await renderAccounting({ view: "reconciliation" });
    expect(html).toContain("unposted");
    expect(html).toContain("unmatched");
    expect(html).toContain("posting-instruction-v1");
  });
});
