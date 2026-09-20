import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The Accounting screen.
 *
 * It leads with a real trial balance derived from the recorded journal, names the
 * missing staff-facing API once, and stays read-only: no posting control exists.
 * The period filter applies to both halves; a period with no entries is an honest
 * empty state. Case/order references only become links when the session can open
 * the screen behind them.
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

async function renderAccounting(params: { from?: string; to?: string } = {}): Promise<string> {
  return renderToStaticMarkup(await AccountingPage({ searchParams: Promise.resolve(params) }));
}

describe("staff Accounting page gating", () => {
  it("renders the graceful forbidden state without accounting:read", async () => {
    setSession(["billing:read"]);
    const html = await renderAccounting();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Trial balance");
  });
});

describe("staff Accounting page — the ledger", () => {
  beforeEach(() => setSession(["accounting:read", "cases:read", "orders:read"]));

  it("names the missing API once, before the first balance", async () => {
    const html = await renderAccounting();
    const stateIndex = html.indexOf("No staff-facing ledger API exists yet");
    expect(stateIndex).toBeGreaterThan(-1);
    expect(stateIndex).toBeLessThan(html.indexOf("Trial balance"));
  });

  it("derives and prints the trial balance with equal sides", async () => {
    const html = await renderAccounting();
    expect(html).toContain("Trial balance");
    expect(html).toContain("Balanced");
    // The recorded ledger's own totals: ₱3,915,140.00 on each side.
    expect(html).toContain("₱3,915,140.00");
    expect(html).toContain("Accounts receivable");
    expect(html).toContain("Funeral service revenue");
    // A net balance carries its side.
    expect(html).toMatch(/₱[\d,]+\.\d\d (Dr|Cr)/);
  });

  it("lists the journal with its amounts and links the case/order it is against", async () => {
    const html = await renderAccounting();
    expect(html).toContain("Journal entries");
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

  it("applies the period to both the trial balance and the journal", async () => {
    const html = await renderAccounting({ from: "2026-03-01", to: "2026-03-31" });
    expect(html).toContain("March office rent");
    expect(html).not.toContain("August payroll");
    expect(html).toContain("of 26 recorded");
    expect(html).toContain("₱1,951,200.00"); // March's own debit total
  });

  it("shows the honest empty state for a period with no entries", async () => {
    const html = await renderAccounting({ from: "2027-01-01", to: "2027-01-31" });
    expect(html).toContain("No entries in this period");
    expect(html).not.toContain("Journal entries");
  });

  it("is read-only: it says so and carries no posting control", async () => {
    const html = await renderAccounting();
    expect(html).toContain("Read-only");
    expect(html).toContain("it does not post to it");
    expect(html).not.toMatch(/>Post\b/);
  });

  it("keeps exactly one h1", async () => {
    const html = await renderAccounting();
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain("<h1>Accounting</h1>");
  });
});
