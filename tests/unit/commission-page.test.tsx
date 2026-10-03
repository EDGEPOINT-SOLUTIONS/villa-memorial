import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/commerce/orders.json", async () => ({
  default: (await import("../fixtures/orders-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * Staff Commission page (captain checklist F-12):
 *  - graceful 403 without billing:read (the provisional finance gate);
 *  - with it: the not-configured state is the first thing read, every
 *    rate-derived amount is blank + marked (never a zero, never a percentage),
 *    and the real sales come from the order store — the inputs, no rate applied;
 *  - exactly one next step: ask the office.
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

const { default: CommissionPage } = await import("@/app/(staff)/staff/commission/page");

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

async function renderCommission(): Promise<string> {
  return renderToStaticMarkup(await CommissionPage());
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-commission-page-"));
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.ORDERS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("staff Commission page gating", () => {
  it("renders the graceful forbidden state without billing:read", async () => {
    setSession(["catalog:read"]);
    const html = await renderCommission();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("ORD-2026-00002");
  });
});

describe("staff Commission page — the honest state", () => {
  beforeEach(() => setSession(["billing:read"]));

  it("says in the first screenful that rates and targets are not configured", async () => {
    const html = await renderCommission();
    const stateIndex = html.indexOf("Rates and targets are not configured.");
    expect(stateIndex).toBeGreaterThan(-1);
    // The state line precedes the first real sale figure on the page.
    expect(stateIndex).toBeLessThan(html.indexOf("ORD-2026-00002"));
    expect(html).toContain("never a zero");
  });

  it("leaves every rate-derived amount blank and marked — never a zero, never a percentage", async () => {
    const html = await renderCommission();
    expect(html).toContain("₱—");
    expect(html).toMatch(/₱—[\s\S]{0,120}?Not configured/);
    expect(html).not.toContain("₱0");
    expect(html).not.toMatch(/\d+\s*%/);
  });

  it("shows the real sales on record with their real values, and the cancelled order too", async () => {
    const html = await renderCommission();
    expect(html).toContain("ORD-2026-00002"); // confirmed
    expect(html).toContain("ORD-2026-00004"); // fulfilled
    expect(html).toContain("ORD-2026-00006"); // cancelled — never hidden
    expect(html).toContain("₱8,100.00"); // 4,600 + 3,500 real sale value
    expect(html).toContain("2 sales");
    expect(html).toContain("1 cancelled");
  });

  it("names the missing attribution input instead of inventing an agent", async () => {
    const html = await renderCommission();
    expect(html).toContain("Not recorded");
    expect(html).toContain("Attribution");
  });

  it("shows the shape: the decisions, the seven bases and the approval path", async () => {
    const html = await renderCommission();
    for (const word of [
      "Which sales count",
      "Over which period",
      "How the amount is worked out",
      "Against which target",
      "How it is approved and paid",
      "Fixed %",
      "Multi-agent",
      "Pending approval",
      "Paid",
    ]) {
      expect(html, `the shape is missing "${word}"`).toContain(word);
    }
  });

  it("offers exactly one next step: ask the office, on the client's own line", async () => {
    const html = await renderCommission();
    expect(html).toContain("Ask the office about commission rates");
    expect(html).toContain('href="tel:+639176178489"');
    // No control pretends the rate can be configured here.
    expect(html).not.toContain("Configure");
  });

  it("renders exactly one h1", async () => {
    const html = await renderCommission();
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain("<h1>Commission</h1>");
  });
});
