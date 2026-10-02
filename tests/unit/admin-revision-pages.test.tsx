import { describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The admin revision's four added surfaces (2026-10-02).
 *
 * The board added Inbox, Memorials, Media library and Preparation to the curated
 * rail. Each must be a REAL screen — one `h1`, a lead, and the record it names —
 * not a dead link. This suite renders the four against a full admin session so a
 * later compile error or a dropped heading fails here by name.
 */

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  usePathname: () => "/staff/inbox",
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
}));

const SESSION: Session = {
  userId: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000001",
  scopes: [
    "cases:read",
    "cases:write",
    "property:read",
    "billing:read",
    "accounting:read",
    "orders:read",
    "documents:read",
    "catalog:write",
    "scheduling:read",
    "hr:read",
    "tenancy:modules:read",
  ],
  email: "admin@vm.demo",
  displayName: "Ada Admin",
  expiresAt: new Date(Date.now() + 900_000).toISOString(),
};

vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async (): Promise<Session> => SESSION,
}));

const { default: InboxPage } = await import("@/app/(staff)/staff/inbox/page");
const { default: MemorialsPage } = await import("@/app/(staff)/staff/memorials/page");
const { default: MediaLibraryPage } = await import("@/app/(staff)/staff/media/page");
const { default: PreparationPage } = await import("@/app/(staff)/staff/preparation/page");

const h1Count = (html: string) => (html.match(/<h1/g) ?? []).length;

describe("the four added admin surfaces render", () => {
  it("Inbox surfaces the conversations, the triaged list and the notification catalogue", async () => {
    const html = renderToStaticMarkup(await InboxPage());
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Inbox");
    expect(html).toContain("chat-thread-list");
    expect(html).toContain("Needs you today");
    expect(html).toContain("Notifications");
    expect(html).toContain('href="/staff/notifications"');
  });

  it("Memorials shows the family's public choices and the safe default", async () => {
    const html = renderToStaticMarkup(await MemorialsPage());
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Memorials");
    expect(html).toContain("Not published");
  });

  it("Media library lists the shipped client assets", async () => {
    const html = renderToStaticMarkup(await MediaLibraryPage());
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Media library");
    expect(html).toContain("Park grounds — golden hour");
    expect(html).toContain('src="/media/composition/thumbs/');
  });

  it("Preparation lists the recorded embalming records with their case links", async () => {
    const html = renderToStaticMarkup(await PreparationPage());
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("Preparation");
    expect(html).toContain("CASE-2026-0001");
    expect(html).toContain("/preparation");
  });
});
