import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import lotsFile from "@/lib/fixtures/property/lots.json";
import type { Session } from "@/lib/auth/types";

/**
 * Map-parity contract: the AGENT lots screen and the STAFF property screen must
 * render the SAME shared park map (`components/park-maps-view.tsx`) fed the SAME
 * lot listing — every lot id, status and owner — so the two surfaces can never
 * disagree about the park. The role difference is capability only: the agent
 * (property:read) gets a read-only map, staff (property:write) can plot.
 *
 * The shared map is mocked with a probe component so the test can prove both
 * surfaces mount it and compare exactly what each surface passes down.
 */

type MapProbe = Record<string, unknown>;
const sharedMap = vi.hoisted(() => ({ calls: [] as MapProbe[] }));

vi.mock("@/components/park-maps-view", () => ({
  ParkMapsView: (props: MapProbe) => {
    sharedMap.calls.push(props);
    return <div data-testid="shared-park-map" />;
  },
}));

const sessionHolder = vi.hoisted(() => ({
  staff: null as Session | null,
  agent: null as Session | null,
}));

vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.staff,
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => sessionHolder.agent,
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const { default: AgentLotsPage } = await import("@/app/(agent)/agent/lots/page");
const { default: PropertyPage } = await import("@/app/(staff)/staff/property/page");

const USER_ID = "00000000-0000-4000-8000-000000000013";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function session(scopes: string[], email: string, displayName: string): Session {
  return {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email,
    displayName,
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

/** The recorded agent persona: property:read only — view, never plot or reserve. */
const AGENT = session(["tenancy:modules:read", "catalog:read", "orders:read", "orders:write", "property:read"], "agent@vm.demo", "Alex Agent");
/** The recorded admin persona: holds the write scopes the staff screen gates on. */
const ADMIN = session(["property:read", "property:write", "catalog:write"], "admin@vm.demo", "Ada Admin");

const FIXTURE_LOT_IDS = lotsFile.lots.map((l) => l.id);
const FIXTURE_STATUSES = Object.fromEntries(lotsFile.lots.map((l) => [l.id, l.status]));
const FIXTURE_OWNERS = Object.fromEntries(
  lotsFile.lots.map((l) => [l.id, l.owner_name ?? ""]),
);

function lastMapCall(): MapProbe {
  const call = sharedMap.calls.at(-1);
  expect(call, "the shared park map was never mounted").toBeTruthy();
  return call!;
}

beforeEach(() => {
  sharedMap.calls.length = 0;
  sessionHolder.staff = null;
  sessionHolder.agent = null;
});

describe("agent lots screen — shared park map parity with staff property", () => {
  it("mounts the shared map with the office's full lot listing", async () => {
    sessionHolder.agent = AGENT;
    const html = renderToStaticMarkup(await AgentLotsPage());

    const call = lastMapCall();
    expect(call.liveStatusById).toEqual(FIXTURE_STATUSES);
    expect(call.liveOwnerById).toEqual(FIXTURE_OWNERS);
    expect(Object.keys(call.liveStatusById as object).sort()).toEqual([...FIXTURE_LOT_IDS].sort());
    // The map is the shared component, not a hand-drawn pin layer.
    expect(html).toContain('data-testid="shared-park-map"');
    expect(html).not.toContain("ag-map__pin");
  });

  it("passes the SAME lots, statuses and owners as the staff property screen", async () => {
    sessionHolder.staff = ADMIN;
    renderToStaticMarkup(await PropertyPage({ searchParams: Promise.resolve({}) }));
    const staffCall = lastMapCall();

    sharedMap.calls.length = 0;
    sessionHolder.agent = AGENT;
    renderToStaticMarkup(await AgentLotsPage());
    const agentCall = lastMapCall();

    expect(agentCall.liveStatusById).toEqual(staffCall.liveStatusById);
    expect(agentCall.liveOwnerById).toEqual(staffCall.liveOwnerById);
    // Same park by default — the Villa masterplan the office works from.
    expect(agentCall.initialParkId).toBe("villa");
  });

  it("gates the map's plotting tools by scope: agent read-only, staff write", async () => {
    sessionHolder.agent = AGENT;
    renderToStaticMarkup(await AgentLotsPage());
    expect(lastMapCall().canEdit).toBe(false);

    sharedMap.calls.length = 0;
    sessionHolder.staff = ADMIN;
    renderToStaticMarkup(await PropertyPage({ searchParams: Promise.resolve({}) }));
    expect(lastMapCall().canEdit).toBe(true);
  });

  it("keeps the agent surface's own hold intent (disabled) instead of the public request link", async () => {
    sessionHolder.agent = AGENT;
    const html = renderToStaticMarkup(await AgentLotsPage());
    expect(html).toContain("Ask the office to hold a lot");
    expect(html).toContain("Lot holds await the captain");
    // The customer-facing reserve request never leaks onto the agent surface.
    expect(html).not.toContain("Request to reserve");
  });

  it("shows a graceful 403 when the agent session lacks property:read", async () => {
    sessionHolder.agent = session(["orders:read"], "orders.only@vm.demo", "Olive Orders");
    const html = renderToStaticMarkup(await AgentLotsPage());
    expect(html).toContain("You don’t have access");
    expect(sharedMap.calls).toHaveLength(0);
  });
});
