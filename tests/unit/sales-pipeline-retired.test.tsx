import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The retired Sales pipeline (captain, 2026-10-03).
 *
 * The audit found two records for one story: `/staff/pipeline` read a recorded
 * lead file the office's convert action never wrote, while the Prospects board
 * read the durable agent journal. The captain's decision: the Prospects board is
 * the one pipeline, the duplicate read is retired, and the old routes redirect
 * there so no link 404s. This pins that retirement and keeps the Customers screen
 * (which used to print a second "Lead records" list) covered.
 */

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const { default: PipelinePage } = await import("@/app/(staff)/staff/pipeline/page");
const { default: LeadRecordPage } = await import("@/app/(staff)/staff/pipeline/[id]/page");
const { default: CustomersPage } = await import("@/app/(staff)/staff/customers/page");

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

beforeEach(() => {
  sessionHolder.current = null;
});

describe("the one pipeline", () => {
  it("redirects the retired sales-pipeline route to the Prospects board", () => {
    expect(() => PipelinePage()).toThrow(/NEXT_REDIRECT:\/staff\/prospects/);
  });

  it("redirects the retired per-lead record to the Prospects board", () => {
    expect(() => LeadRecordPage()).toThrow(/NEXT_REDIRECT:\/staff\/prospects/);
  });
});

describe("the Customers screen after the duplicate read is retired", () => {
  it("lists customers and no longer prints a second lead list", async () => {
    signInAs(["cases:read"]);
    const html = renderToStaticMarkup(
      await CustomersPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("Customers");
    expect(html).not.toContain("Lead records");
    expect(html).not.toContain("/staff/pipeline/");
  });

  it("still gates on cases:read", async () => {
    signInAs([]);
    const html = renderToStaticMarkup(
      await CustomersPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("cases:read");
  });
});
