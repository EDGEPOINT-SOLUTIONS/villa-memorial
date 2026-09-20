import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The Inventory screen.
 *
 * It must read as a stock room and not as a stub: the missing inventory service is
 * named once, then the recorded rows lead — catalogue-linked prices resolved from
 * the catalogue, the derived out/low/in-stock state on each line, and the movement
 * history with its case references. Filters and the empty state are part of the
 * screen's contract too.
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

const { default: InventoryPage } = await import("@/app/(staff)/staff/inventory/page");

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

async function renderInventory(
  params: { category?: string; state?: string; q?: string } = {},
): Promise<string> {
  return renderToStaticMarkup(await InventoryPage({ searchParams: Promise.resolve(params) }));
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-inventory-page-"));
  process.env.CATALOG_STORE_PATH = path.join(dir, "catalog.json");
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.CATALOG_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("staff Inventory page gating", () => {
  it("renders the graceful forbidden state without catalog:write", async () => {
    setSession(["orders:read"]);
    const html = await renderInventory();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain("Lumina casket");
  });
});

describe("staff Inventory page — the stock room", () => {
  beforeEach(() => setSession(["catalog:write"]));

  it("names the missing service once, before the first stock row", async () => {
    const html = await renderInventory();
    const stateIndex = html.indexOf("No inventory service exists yet");
    expect(stateIndex).toBeGreaterThan(-1);
    expect(stateIndex).toBeLessThan(html.indexOf("Lumina casket"));
  });

  it("leads with the at-a-glance counts and the state of each row", async () => {
    const html = await renderInventory();
    expect(html).toContain("Items tracked");
    expect(html).toContain("Out of stock");
    expect(html).toContain("Low stock");
    expect(html).toContain("Stock value (at cost)");
    // The out-of-stock and low rows are real fixture rows, with their badges.
    expect(html).toContain("Emperor Flexi casket");
    expect(html).toContain("Noble Full casket");
  });

  it("shows catalogue-linked prices resolved from the catalogue, never typed amounts", async () => {
    const html = await renderInventory();
    expect(html).toContain("₱33,000.00"); // Lumina SRP
    expect(html).toContain("₱150,000.00"); // Emperor Flexi SRP
    expect(html).toContain("Not listed"); // a supply the catalogue does not carry
  });

  it("shows the recorded movement history with its case references", async () => {
    const html = await renderInventory();
    expect(html).toContain("Movement history");
    expect(html).toContain("CASE-2026-0001");
    expect(html).toContain("Received");
    expect(html).toContain("Allocated");
    expect(html).toContain("Adjusted");
    expect(html).toContain("Stock count — expired gloves discarded");
  });

  it("prints a missing supplier or cost as a missing state, never a number", async () => {
    const html = await renderInventory();
    expect(html).toContain("Not recorded");
    // Cotton padding carries no supplier; guest book carries no cost.
    expect(html).toContain("Cotton padding");
  });

  it("answers an unmatched filter with the honest empty state", async () => {
    const html = await renderInventory({ q: "nothing-matches-this" });
    expect(html).toContain("No stock matches your filter");
    // The items table is empty, so its caption is gone; the movement history stays —
    // it is the record, not the filtered list.
    expect(html).not.toContain("Out-of-stock and low rows lead");
    expect(html).toContain("Movement history");
    expect(html).toContain("Every movement sums");
  });

  it("keeps exactly one h1 and reachable scroll areas", async () => {
    const html = await renderInventory();
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain("<h1>Inventory</h1>");
    expect(html).toContain('tabindex="0"');
  });
});
