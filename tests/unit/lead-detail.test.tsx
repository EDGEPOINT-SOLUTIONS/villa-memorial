import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { textOf } from "../helpers/prose";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";
import { FAMILY_HELP } from "@/lib/family/contact";
import workspace from "@/lib/fixtures/agent/workspace.json";

/**
 * The lead record (F-09) — pinned on the REAL page component.
 *
 * The brief's four questions must be answerable in the first screenful and the
 * record must never invent what it does not carry:
 *   who they are (name, contact, how/when they came in, who handles them),
 *   where they are (stage in agent words + the RECORDED stage movement),
 *   what was said (recorded calls/visits/notes with dates), and
 *   what happens next (the recorded next step + the contact action).
 *
 * The office number is pinned against lib/family/contact.ts (the one contact
 * module) so a re-typed number fails the suite, and the one honest line names
 * the customer-records service exactly once.
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
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/agent/prospects/prospect-cecilia",
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "agent@vm.demo", scopes: [] }),
}));

const { default: AgentLeadPage } = await import("@/app/(agent)/agent/prospects/[id]/page");

type LeadPage = (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;

async function renderLead(id: string): Promise<string> {
  return renderToStaticMarkup(
    await (AgentLeadPage as LeadPage)({ params: Promise.resolve({ id }) }),
  );
}

/** The lead's own phone, digits only, for tel:/sms: href checks. */
function phoneDigits(phone: string): string {
  return phone.replace(/\s/g, "");
}

describe("the lead record answers the four questions", () => {
  it("renders exactly one h1 and says who the person is, how and when they came in, and who handles them", async () => {
    const html = await renderLead("prospect-cecilia");
    const headings = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? [];
    expect(headings, "lead record must have exactly one h1").toHaveLength(1);
    expect(headings[0]).toContain("Cecilia Ramos");

    expect(html).toContain("Walk-in · came in Sep 8 · handled by Alex Agent");
    expect(html).toContain("+63 917 654 0091");
    expect(html).toContain("cecilia.ramos@example.com");
  });

  it("shows the stage in the agent's words and the recorded movement, not a bare badge", async () => {
    const html = await renderLead("prospect-cecilia");
    // The PRD pipeline, in the portal's words (agent-view stageMeta).
    for (const label of ["New", "Contacted", "Qualified", "Meeting planned", "Ready to close"]) {
      expect(html, `pipeline trail is missing ${label}`).toContain(label);
    }
    // The recorded moves with their dates — the fixture's own stage_history.
    expect(html).toContain("Moved to New");
    expect(html).toContain("Moved to Contacted");
    expect(html).toContain("Moved to Qualified");
    expect(html).toContain("Sep 8 · Alex Agent");
    expect(html).toContain("Sep 12 · Alex Agent");
    expect(html).toContain("Sep 14 · Alex Agent");
    expect(html).toContain("First call; asked for the monthly amount in writing.");
  });

  it("renders the recorded contact history with its kind and date", async () => {
    const html = await renderLead("prospect-cecilia");
    expect(html).toContain("Call · Sep 12 · 4:30 PM");
    expect(html).toContain("Visit · Sep 8 · 6:30 PM");
    expect(html).toContain("Link opened · Sep 14 · 7:42 PM");
    expect(html).toContain("Called about the Bronze 2 monthly");
  });

  it("carries the recorded next step and the contact action built from the record's phone", async () => {
    const html = await renderLead("prospect-cecilia");
    expect(html).toContain("Call about Bronze 2");
    expect(html).toContain(`href="tel:${phoneDigits("+63 917 654 0091")}"`);
    expect(html).toContain(`href="sms:${phoneDigits("+63 917 654 0091")}"`);
    expect(html).toContain("Best time: After 4 PM, by call");
  });

  it("reads the office number from the contact module rather than typing it", async () => {
    const html = await renderLead("prospect-cecilia");
    expect(html).toContain(`href="${FAMILY_HELP.phoneHref}"`);
    expect(html).toContain(`>${FAMILY_HELP.phone}</a>`);
  });

  it("states the one honest limitation in exactly one line, in plain words", async () => {
    const html = await renderLead("prospect-cecilia");
    // One short line on screen — disabled controls do not repeat it in tooltips.
    expect(html.match(/customer-records service/g) ?? []).toHaveLength(1);
    const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    const honest = paragraphs.filter((p) => p.includes("customer-records service"));
    expect(honest).toHaveLength(1);
    expect(honest[0]).toContain("enquiry capture");
    expect(honest[0]).toContain("customer sync");
    expect(honest[0]).toContain("lead assignment");
    expect(honest[0]).toContain(FAMILY_HELP.phone);
  });

  it("never invents an activity entry for a lead with none recorded", async () => {
    const html = await renderLead("prospect-boyet");
    expect(html).toContain("No contact yet");
    expect(html).not.toContain("Called about the Bronze 2 monthly");
    expect(html).not.toContain("Sent the 2026 price list");
  });

  it("keeps the conversation timeline entries equal to the recorded fixture", async () => {
    const recorded = (
      workspace as unknown as {
        prospect_activity: Record<string, Array<{ title: string; detail: string }>>;
      }
    ).prospect_activity["prospect-cecilia"];
    const html = await renderLead("prospect-cecilia");
    const timeline = html.slice(
      html.indexOf('aria-label="Stage history"'),
      html.indexOf("Move them forward"),
    );
    expect(recorded.length).toBeGreaterThan(0);
    for (const entry of recorded) {
      expect(timeline, `recorded activity missing: ${entry.title}`).toContain(entry.title);
      expect(timeline).toContain(entry.detail.replace(/&/g, "&amp;"));
    }
  });

  it("uses the shared portal grammar, one h1 and no nested paragraphs", async () => {
    const html = await renderLead("prospect-cecilia");
    expect(html).toContain('class="ag-hero"');
    expect(html).toContain('class="ag-sec"');
    expect(html).toContain('class="ag-grid-2"');
    assertNoParagraphNesting(html, "lead record");
  });

  it("presents the acquisition as steps and offers the real forward move", async () => {
    const html = await renderLead("prospect-cecilia");
    // The seven PRD steps, with the current one marked and explained.
    expect(html).toContain('aria-label="Acquisition steps"');
    expect(html).toContain("Current step");
    expect(html).toContain(
      "They are a fit. Book the presentation so they can see the plan or the plot.",
    );
    // The real action for her current stage, and where it moves her.
    expect(html).toContain("Book the presentation");
    expect(html).toContain("Moves to Meeting planned");
    // The move control is live: a real submit button, not the old placeholder.
    expect(html).toContain(
      'class="btn btn--primary ag-btn-xl" type="submit">Book the presentation',
    );
    expect(html).toContain('class="ag-move"');
    // The writes that still have no store stay honestly disabled.
    expect(html).toContain("Ask the office to hold a lot");
    expect(html).toContain("Take a payment");
    expect(html).toContain("File a document");
  });

  it("404s a lead that is not in the record", async () => {
    await expect(renderLead("prospect-nobody")).rejects.toThrow("NEXT_NOT_FOUND");
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
