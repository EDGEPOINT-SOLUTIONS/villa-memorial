import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The four lifecycle registers and the shared accounting page.
 *
 * The captain's rules: the members list is a list and nothing else, an empty
 * state starts the flow, the figures lead and almost no prose prints, and a
 * member's page carries the payments, the amortization schedule and the modular
 * notices. This renders the real pages over the real store.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => "/staff/members",
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const { default: MembersPage } = await import("@/app/(staff)/staff/members/page");
const { default: ServicesPage } = await import("@/app/(staff)/staff/services/page");
const { default: ProductsPage } = await import("@/app/(staff)/staff/products/page");
const { default: LotsPage } = await import("@/app/(staff)/staff/lots/page");
const { default: DetailPage } = await import("@/app/(staff)/staff/lifecycle/[id]/page");
const { default: NewPage } = await import("@/app/(staff)/staff/lifecycle/new/page");
const { EngagementRegister } = await import("@/components/staff/engagement-register");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function signInAs(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-lifecycle-pages-"));
  process.env.LIFECYCLE_STORE_PATH = path.join(dir, "commerce-lifecycle.json");
  signInAs(["cases:read", "cases:write"]);
});

afterEach(async () => {
  delete process.env.LIFECYCLE_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

const render = (node: ReactNode) => renderToStaticMarkup(node);
const h1Count = (html: string) => (html.match(/<h1[^>]*>/g) ?? []).length;

describe("the Members register", () => {
  it("gates on cases:read", async () => {
    signInAs(["catalog:read"]);
    const html = render(await MembersPage());
    expect(html).toContain("cases:read");
  });

  it("is the member list and nothing else — one h1, the plan figures leading", async () => {
    const html = render(await MembersPage());
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Rosa Lim");
    expect(html).toContain("Silver 2");
    expect(html).toContain("₱13,440"); // amount
    expect(html).toContain("₱4,480"); // paid
    expect(html).toContain("Outstanding");
    // No KPI band, no notice editor, no awaiting band on the list itself.
    expect(html).not.toContain("kpi-grid");
    expect(html).not.toContain("Notice rules");
    expect(html).not.toContain("Sold, no outcome recorded yet");
  });
});

describe("the empty register", () => {
  it("starts the flow with one action", () => {
    const html = render(createElement(EngagementRegister, { kind: "plan", views: [] }));
    expect(html).toContain("No plan members recorded yet");
    expect(html).toContain("/staff/lifecycle/new?kind=plan");
  });
});

describe("the Services register", () => {
  it("lists the availed service, its price basis and its calendar slot", async () => {
    const html = render(await ServicesPage());
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Nena Bautista");
    expect(html).toContain("Interment");
    expect(html).toContain("Common chapel");
    expect(html).toContain("₱5,000");
  });
});

describe("the Products bought register", () => {
  it("lists a one-time buyer and states where lots record", async () => {
    const html = render(await ProductsPage());
    expect(html).toContain("White Rose Half casket");
    expect(html).toContain("Garden lots are monthly-paid");
    expect(html).toContain("/staff/lots");
  });
});

describe("the Garden lots register", () => {
  it("lists a lot with its section and term", async () => {
    const html = render(await LotsPage());
    expect(html).toContain("Ramon Villanueva");
    expect(html).toContain("Condo-type lot");
    expect(html).toContain("C-7");
  });
});

describe("a member's accounting", () => {
  it("carries the payments, the amortization schedule and the modular notices", async () => {
    const html = render(await DetailPage({ params: Promise.resolve({ id: "eng-plan-0001" }) }));
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Amortization schedule");
    expect(html).toContain("Payments");
    expect(html).toContain("Notices");
    expect(html).toContain("Two days before");
    expect(html).toContain("Rosa Lim");
    // The schedule prints period · amount · status · remaining.
    expect(html).toContain("1 of 12");
    expect(html).toContain("Remaining");
  });

  it("links a service to the calendar day it is booked on", async () => {
    const html = render(await DetailPage({ params: Promise.resolve({ id: "eng-service-0001" }) }));
    expect(html).toContain("On the calendar");
    expect(html).toContain("/staff/calendar?date=2026-10-05");
    expect(html).toContain("Common chapel");
    expect(html).toContain("2026 a-la-carte sheet · Interment");
  });

  it("shows a lot's amortization and coordinates", async () => {
    const html = render(await DetailPage({ params: Promise.resolve({ id: "eng-lot-0001" }) }));
    expect(html).toContain("Amortization schedule");
    expect(html).toContain("Section C · Lot 7");
    expect(html).toContain("1 of 60");
  });

  it("shows a buyer's record and refuses an unknown reference gracefully", async () => {
    const html = render(await DetailPage({ params: Promise.resolve({ id: "eng-product-0001" }) }));
    expect(html).toContain("Carmen Aquino");
    expect(html).toContain("White Rose Half casket");
    expect(html).toContain("Payments");

    const missing = render(await DetailPage({ params: Promise.resolve({ id: "nope" }) }));
    expect(missing).toContain("No record is stored under that reference");
  });
});

describe("the record page", () => {
  it("offers the four kinds and the chosen one's fields", async () => {
    const html = render(await NewPage({ searchParams: Promise.resolve({ kind: "service" }) }));
    expect(html).toContain("Record a service");
    expect(html).toContain("Service date");
    expect(html).toContain("Room / vehicle / chapel");
    // The kind switcher reaches every register's create form.
    for (const kind of ["plan", "service", "lot", "product"]) {
      expect(html).toContain(`/staff/lifecycle/new?kind=${kind}`);
    }
  });
});
