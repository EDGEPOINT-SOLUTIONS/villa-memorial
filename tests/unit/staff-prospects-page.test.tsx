import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { recordProspectAssignment, recordProspectCapture } from "@/lib/api-client/agent-store";
import type { ProspectAssignment } from "@/lib/agent/acquisition";
import type { Prospect } from "@/lib/api-client/agent";

/**
 * The staff Prospects screen and its one detail panel.
 *
 * The captain's rules: the list leads (figures and actions, no prose), an empty
 * state starts the flow, and one detail panel per prospect. The screen must
 * render the SAME record the agent portal folds, gate on the inquiries area's own
 * scope, and offer Call · Email · assign · the state move without inventing a
 * figure. This renders the real page over the real journal.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => "/staff/prospects",
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const { default: ProspectsPage } = await import("@/app/(staff)/staff/prospects/page");
const { ProspectDetailPanel, BlastDialog } = await import(
  "@/app/(staff)/staff/prospects/prospects-board"
);

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
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-prospects-page-"));
  process.env.AGENT_STORE_PATH = path.join(dir, "agent-pipeline.json");
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function renderPage(): Promise<string> {
  return ProspectsPage().then((node) => renderToStaticMarkup(node));
}

describe("the Prospects screen", () => {
  it("gates on cases:read", async () => {
    signInAs(["catalog:read"]);
    const html = await renderPage();
    expect(html).toContain("Prospects");
    expect(html).toContain("cases:read");
  });

  it("starts with the figures, no prose wall, and the empty state that begins the flow", async () => {
    signInAs(["cases:read", "cases:write"]);
    const html = await renderPage();
    expect(html.match(/<h1[^>]*>/g) ?? []).toHaveLength(1);
    expect(html).toContain("No prospects yet");
    expect(html).toContain("Add the first prospect");
    for (const label of ["Prospects", "New", "Contacted", "Converted"]) {
      expect(html).toContain(label);
    }
  });

  it("lists the shared record with its state, agent, source and contact actions", async () => {
    signInAs(["cases:read", "cases:write"]);
    await recordProspectCapture({
      capture: {
        id: "prospect-one",
        name: "Nena Bautista",
        phone: "+63 917 000 0001",
        email: "nena@example.com",
        source: "walk_in",
        interest: "plan",
        want: "A pre-need plan",
        callback: "",
        note: "Walked in.",
        captured_by: "Sam Staff",
      },
    });
    await recordProspectAssignment({
      prospectId: "prospect-one",
      agent: "Alex Agent",
      by: "Sam Staff",
      note: "Please call.",
    });

    const html = await renderPage();
    expect(html).toContain("Nena Bautista");
    expect(html).toContain("Walk-in");
    expect(html).toContain("New");
    expect(html).toContain("Alex Agent");
    expect(html).toContain("A pre-need plan");
    expect(html).toContain("tel:+639170000001");
    expect(html).toContain("mailto:nena@example.com");
  });
});

describe("the one detail panel", () => {
  const prospect: Prospect = {
    id: "prospect-one",
    name: "Nena Bautista",
    phone: "+63 917 000 0001",
    email: "nena@example.com",
    source: "walk_in",
    interest: "plan",
    want: "A pre-need plan",
    stage: "new",
    owner: "Alex Agent",
    possible_value_cents: 0,
    first_contact_at: "2026-10-02T02:00:00Z",
    last_contact_at: "2026-10-02T02:00:00Z",
    stage_history: [
      { stage: "new", at: "2026-10-02T02:00:00Z", by: "Sam Staff", note: "Captured at the desk." },
    ],
    next_action: "Make the first call",
    urgency: "today",
    best_time: "",
    notes: "Wants the monthly amount in writing.",
  };

  const assignments: ProspectAssignment[] = [];
  const agents = [
    { name: "Alex Agent", email: "agent@vm.demo", role_label: "Sales agent", has_portal: true },
  ];

  it("answers who, what, where and the next move without prose", () => {
    const html = renderToStaticMarkup(
      createElement(ProspectDetailPanel, {
        prospect,
        assignments,
        blasts: [],
        agents,
        canWrite: true,
        onClose: () => undefined,
        onChanged: () => undefined,
      }),
    );
    expect(html).toContain("Nena Bautista");
    expect(html).toContain("Mark contacted");
    expect(html).toContain("Assigned agent");
    expect(html).toContain("Alex Agent");
    expect(html).toContain("Wants the monthly amount in writing.");
    expect(html).toContain("Pipeline history");
  });
});

describe("the email blast dialog", () => {
  it("lists the selected recipients and says the transport is the office's own mail app", () => {
    const prospects: Prospect[] = [
      {
        id: "p1",
        name: "Nena Bautista",
        phone: "",
        email: "nena@example.com",
        source: "walk_in",
        interest: "plan",
        want: "",
        stage: "new",
        owner: "",
        possible_value_cents: 0,
        first_contact_at: "2026-10-02T02:00:00Z",
        last_contact_at: "2026-10-02T02:00:00Z",
        stage_history: [],
        next_action: "",
        urgency: "warm",
        best_time: "",
        notes: "",
      },
    ];
    const html = renderToStaticMarkup(
      createElement(BlastDialog, {
        prospects,
        onClose: () => undefined,
        onSent: () => undefined,
      }),
    );
    expect(html).toContain("nena@example.com");
    expect(html).toContain("notification service");
    expect(html).toContain("Send to 1");
  });
});
