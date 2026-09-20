import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * Staff Notifications (`/staff/notifications`), rendered over the designed catalogue.
 * What this pins:
 *  · the four designed messages and their audiences and channels are on the screen;
 *  · nothing has been sent — the empty sent log says what the service will send and why
 *    it cannot yet, and no fabricated message or delivery state appears;
 *  · the missing notification service is named in one line;
 *  · the gate is `cases:read` (the nav entry's provisional scope); one h1.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const { default: NotificationsPage } = await import("@/app/(staff)/staff/notifications/page");

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

async function render(): Promise<string> {
  return renderToStaticMarkup(await NotificationsPage());
}

beforeEach(() => {
  sessionHolder.current = null;
});

describe("the catalogue answers what will be sent and to whom", () => {
  it("lists the four designed messages with their triggers, audiences and channels", async () => {
    signInAs(["cases:read"]);
    const html = await render();

    for (const message of [
      "Booking confirmation",
      "Payment reminder",
      "Document-ready note",
      "Service reminder",
    ]) {
      expect(html, message).toContain(message);
    }
    expect(html).toContain("A chapel booking is recorded");
    expect(html).toContain("Family");
    expect(html).toContain("Agent");
    expect(html).toContain("Staff");
    expect(html).toContain("SMS");
    expect(html).toContain("In-app");
    expect(html).toContain("Not switched on");
  });

  it("names the missing notification service in one line", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain("No notification service is connected");
  });

  it("counts zero sends without dressing demo notices up as real", async () => {
    signInAs(["cases:read"]);
    const html = await render();

    expect(html).toContain("Nothing has been sent yet");
    expect(html).toContain("no notification rule or event contract is frozen");
    expect(html).not.toContain("Delivered");
    expect(html).not.toContain("Failed");
    // No template instant is rendered — there is no send to date.
    expect(html).not.toContain("Sep 10, 2026");
  });

  it("says what the notification service adds", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain("Template management");
    expect(html).toContain("Event-driven rules");
    expect(html).toContain("Delivery log");
    expect(html).toContain("Consent");
  });
});

describe("the gate", () => {
  it("renders the designed forbidden state without cases:read", async () => {
    signInAs(["property:read"]);
    const html = await render();
    expect(html).toContain("have access to this area");
  });

  it("renders exactly one h1", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect([...html.matchAll(/<h1/g)].length).toBe(1);
  });
});
