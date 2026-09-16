import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "@/lib/fixtures/family/snapshot.json";
import type { FamilySnapshot } from "@/lib/api-client/family";

/**
 * The calm state — the design's page 09 (“Nothing needs you today”), built.
 *
 * The recorded snapshot always carries a balance, so this branch only exists in
 * code; these tests render the real Home, Payments and Papers pages with a
 * settled family so the quiet state cannot silently regress into “₱0 still to
 * pay” or an empty table.
 */
const settled: FamilySnapshot = {
  ...(fixture as unknown as FamilySnapshot),
  balance: { total: "₱42,000", paid: "₱42,000", remaining: "₱0" },
  balance_cents: { total: 4200000, paid: 4200000, remaining: 0 },
  recent_documents: [],
};

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/dashboard",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

vi.mock("@/lib/api-client/family", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/family")>();
  return { ...actual, getFamilySnapshot: async () => settled };
});

const { default: HomePage } = await import("@/app/(family)/client/dashboard/page");
const { default: PaymentsPage } = await import("@/app/(family)/client/payments/page");
const { default: PapersPage } = await import("@/app/(family)/client/documents/page");

describe("the quiet week", () => {
  it("Home says nothing needs you today, with no balance headline", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Nothing needs you today.");
    expect(html).not.toContain("still to pay");
  });

  it("Payments says the plan is fully paid", async () => {
    const html = renderToStaticMarkup(await PaymentsPage());
    expect(html).toContain("Your plan is fully paid. Nothing is due.");
    expect(html).not.toContain("is still to pay");
  });

  it("Papers says nothing has been issued instead of showing an empty list", async () => {
    const html = renderToStaticMarkup(await PapersPage());
    expect(html).toContain("No papers have been issued yet.");
  });
});
