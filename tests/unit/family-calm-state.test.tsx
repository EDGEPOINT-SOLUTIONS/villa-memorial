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
const seedPerson = (fixture as unknown as { loved_ones: Array<Record<string, unknown>> }).loved_ones[0];
const settled: FamilySnapshot = {
  tenant_id: (fixture as unknown as { tenant_id: string }).tenant_id,
  family: (fixture as unknown as { family: FamilySnapshot["family"] }).family,
  loved_one: {
    name: seedPerson.name as string,
    life_dates: seedPerson.life_dates as string,
  },
  plan_summary: seedPerson.plan_summary as FamilySnapshot["plan_summary"],
  balance: { total: "₱42,000", paid: "₱42,000", remaining: "₱0" },
  balance_cents: { total: 4200000, paid: 4200000, remaining: 0 },
  // A settled plan has no open instalments (all four paid), so the quiet week
  // shows no “What’s coming” section and nothing is due soon.
  payment_schedule: {
    reference: "VM-PLAN-2026-0188",
    term: "monthly",
    first_due_on: "2026-07-27",
    installments: [
      { seq: 1, amount_cents: 1050000, paid_cents: 1050000 },
      { seq: 2, amount_cents: 1050000, paid_cents: 1050000 },
      { seq: 3, amount_cents: 1050000, paid_cents: 1050000 },
      { seq: 4, amount_cents: 1050000, paid_cents: 1050000 },
    ],
  },
  recent_documents: [],
  person_id: seedPerson.id as string,
  household: [
    {
      id: seedPerson.id as string,
      name: seedPerson.name as string,
      life_dates: seedPerson.life_dates as string,
    },
  ],
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
  return {
    ...actual,
    getFamilySnapshot: async () => settled,
    // The quiet week is genuinely quiet: no open requests and no unconfirmed
    // visits, so the dashboard's attention strip is empty and nothing but the
    // money state decides the headline.
    listFamilyRequests: async () => [],
    listFamilyAppointments: async () => [],
    getFamilyLotRecord: async () => ({
      plan_name: "",
      park: "",
      section: "",
      lot_number: "",
      owner_name: "",
      owner_note: "",
      kept_by: "",
      record_note: "",
      with_office: [],
    }),
  };
});

const { default: HomePage } = await import("@/app/(family)/client/dashboard/page");
const { default: PaymentsPage } = await import("@/app/(family)/client/payments/page");
const { default: PapersPage } = await import("@/app/(family)/client/documents/page");

describe("the quiet week", () => {
  it("Home says nothing needs you today, with no balance headline", async () => {
    const html = renderToStaticMarkup(await HomePage({}));
    expect(html).toContain("Nothing needs you today.");
    expect(html).not.toContain("still to pay");
  });

  it("Payments says the plan is fully paid", async () => {
    const html = renderToStaticMarkup(await PaymentsPage({}));
    expect(html).toContain("Your plan is fully paid. Nothing is due.");
    expect(html).not.toContain("is still to pay");
  });

  it("Papers says nothing has been issued instead of showing an empty list", async () => {
    const html = renderToStaticMarkup(await PapersPage({}));
    expect(html).toContain("No papers have been issued yet.");
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded records through a test-only copy, so the
// pages keep their content-bearing contract tests without restoring demo data.
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/case.json", async () => ({
  default: (await import("../fixtures/family-case-demo.json")).default,
}));
