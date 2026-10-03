import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/* --- test-only demo fixture (clean start, captain 2026-10-03) --- */
vi.mock("@/lib/fixtures/chat/threads.json", async () => ({
  default: (await import("../fixtures/chat-threads-demo.json")).default,
}));
/* --- end test-only demo fixture --- */

/**
 * The three chat screens render for real: the Admin Inbox list, the office conversation,
 * and the family/agent own-thread page — one h1 each, the composed thread on screen, and
 * the composer with its Attach/Send controls. Stores use the shared test throwaway dirs.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/staff/inbox",
}));

const staffHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => staffHolder.current,
}));

const portalHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => portalHolder.current,
}));

const { default: InboxPage } = await import("@/app/(staff)/staff/inbox/page");
const { default: ConversationPage } = await import("@/app/(staff)/staff/inbox/[id]/page");
const { default: FamilyMessagesPage } = await import("@/app/(family)/client/messages/page");
const { default: AgentMessagesPage } = await import("@/app/(agent)/agent/messages/page");

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function session(over: Partial<Session>): Session {
  return {
    userId: "00000000-0000-4000-8000-000000000012",
    tenantId: TENANT_ID,
    scopes: ["cases:read", "cases:write"],
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    ...over,
  };
}

function h1s(html: string): string[] {
  return [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
}

beforeEach(() => {
  staffHolder.current = session({});
  portalHolder.current = session({});
});

describe("Admin Inbox", () => {
  it("lists every conversation, one h1", async () => {
    const html = renderToStaticMarkup(await InboxPage());
    expect(h1s(html)).toEqual(["Inbox"]);
    expect(html).toContain("Santos family");
    expect(html).toContain("Cory Customer · Dela Cruz family");
    expect(html).toContain("Alex Agent");
    expect(html).toContain("chat-thread-list");
  });

  it("shows the office conversation with its attachments and composer", async () => {
    const html = renderToStaticMarkup(
      await ConversationPage({ params: Promise.resolve({ id: "family-00000000-0000-4000-8000-000000000201" }) }),
    );
    expect(h1s(html)).toEqual(["Santos family"]);
    expect(html).toContain("Here is the signed application and the ID.");
    expect(html).toContain("application-santos.pdf");
    expect(html).toContain("schedule.xlsx");
    expect(html).toContain("Attach");
    expect(html).toContain("Send");
  });

  it("drops the composer for a read-only session", async () => {
    staffHolder.current = session({ scopes: ["cases:read"] });
    const html = renderToStaticMarkup(
      await ConversationPage({ params: Promise.resolve({ id: "family-00000000-0000-4000-8000-000000000201" }) }),
    );
    expect(html).not.toContain("chat-composer");
    expect(html).toContain("not write to it on this sign-in");
  });

  it("shows a graceful 403 without the cases:read scope", async () => {
    staffHolder.current = session({ scopes: [] });
    const html = renderToStaticMarkup(await InboxPage());
    expect(html).toContain("don");
    expect(html).not.toContain("Santos family");
  });
});

describe("the two participant screens", () => {
  it("renders the family's own thread with the composer", async () => {
    portalHolder.current = session({
      userId: "00000000-0000-4000-8000-000000000014",
      email: "customer@vm.demo",
      displayName: "Cory Customer",
      scopes: ["tenancy:modules:read", "catalog:read"],
    });
    const html = renderToStaticMarkup(await FamilyMessagesPage());
    expect(h1s(html)).toEqual(["Messages"]);
    expect(html).toContain("Good morning — is the viewing still on for Friday?");
    expect(html).toContain("chat-composer");
  });

  it("renders the agent's own thread with the composer", async () => {
    portalHolder.current = session({
      userId: "00000000-0000-4000-8000-000000000013",
      email: "agent@vm.demo",
      displayName: "Alex Agent",
      scopes: ["tenancy:modules:read", "catalog:read", "orders:read", "property:read"],
    });
    const html = renderToStaticMarkup(await AgentMessagesPage());
    expect(h1s(html)).toEqual(["Messages"]);
    expect(html).toContain("The Mendoza family wants the corner lot");
    expect(html).toContain("chat-composer");
  });

  it("keeps a staff preview read-only", async () => {
    portalHolder.current = session({ portal: "staff", displayName: "Sam Staff" });
    const html = renderToStaticMarkup(await FamilyMessagesPage());
    expect(html).toContain("staff preview");
    expect(html).not.toContain("chat-composer");
  });
});
