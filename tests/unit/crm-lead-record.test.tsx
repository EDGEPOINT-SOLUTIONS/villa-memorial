import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";
import { measureProse, textOf } from "../helpers/prose";
import { FAMILY_HELP } from "@/lib/family/contact";

/**
 * The staff lead record (PRD S4, Lead Detail) — pinned on the REAL page component
 * over the recorded fixture.
 *
 * The record must answer, in the first screenful and without prose walls:
 *   who they are and what they asked (the recorded enquiry),
 *   where they are (the shared pipeline words + every recorded stage move),
 *   what was said (the recorded contact history), and
 *   what happens next (the recorded next step + the office's contact action).
 *
 * It must never invent a call, a move or a value; the one honest line names the
 * customer-records service, and the office number is read from
 * lib/family/contact.ts (never typed). The CRM entry points (pipeline and
 * customers) must link into the record and keep their own gating.
 */

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

const { default: LeadRecordPage } = await import("@/app/(staff)/staff/pipeline/[id]/page");
const { default: PipelinePage } = await import("@/app/(staff)/staff/pipeline/page");
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

function renderLead(id: string): Promise<string> {
  return LeadRecordPage({ params: Promise.resolve({ id }) }).then((node) =>
    renderToStaticMarkup(node),
  );
}

/** Short paragraphs, no walls — the product's own reading budget (300 words of
 * paragraph prose, 30 per paragraph or list item; tests/unit/reading-budget.test.tsx).
 * The record's recorded notes are data, but they are paragraphs on the page, so
 * they count like everything else. */
function expectNoProseWall(html: string, where: string) {
  const prose = measureProse(html);
  expect(
    prose.longest.words,
    `${where}: longest paragraph — “${prose.longest.text}”`,
  ).toBeLessThanOrEqual(30);
  expect(prose.listItems.longestWords, `${where}: longest list item`).toBeLessThanOrEqual(30);
  expect(prose.paragraphWords, `${where}: paragraph prose total`).toBeLessThanOrEqual(300);
  assertNoParagraphNesting(html, where);
}

beforeEach(() => {
  sessionHolder.current = null;
});

describe("the staff lead record", () => {
  it("answers who the person is and what they asked in the first screenful", async () => {
    signInAs(["cases:read"]);
    const html = await renderLead("prospect-cecilia");

    const h1s = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? [];
    expect(h1s, "the lead record must have exactly one h1").toHaveLength(1);
    expect(h1s[0]).toContain("Cecilia Ramos");

    expect(html).toContain("Lead · Plan enquiry");
    expect(html).toContain("Walk-in · came in Sep 8 · handled by Alex Agent");
    expect(html).toContain("+63 917 654 0091");
    expect(html).toContain("cecilia.ramos@example.com");
    // The enquiry itself — the recorded reference and what they asked about.
    expect(html).toContain("INQ-2026-00042");
    expect(html).toContain("Advance planning consultation");
    expect(html).toContain("Asked about pre-arrangement packages and payment terms for a parent.");
  });

  it("shows the stage in the shared pipeline words and every recorded move with its date", async () => {
    signInAs(["cases:read"]);
    const html = await renderLead("prospect-cecilia");

    // The same PRD stage words the agent record renders (lead-view stageMeta).
    for (const label of ["New", "Contacted", "Qualified", "Meeting planned", "Ready to close"]) {
      expect(html, `pipeline trail is missing ${label}`).toContain(label);
    }
    expect(html).toContain('aria-label="Pipeline progress"');
    expect(html).toContain("Qualified");

    // The recorded movement: the move, its day, its author and its note.
    expect(html).toContain("Sep 8");
    expect(html).toContain("Sep 12");
    expect(html).toContain("Sep 14");
    expect(html).toContain("Walked in after the Sunday service; wants cover for her mother.");
    expect(html).toContain("First call; asked for the monthly amount in writing.");
    expect(html).toContain("Opened the payment-mode sheet again; senior rate may apply.");
    expect(html).toContain("Alex Agent");
  });

  it("renders the recorded contact history with its kind, date and words", async () => {
    signInAs(["cases:read"]);
    const html = await renderLead("prospect-cecilia");

    expect(html).toContain("Sep 12 · 4:30 PM");
    expect(html).toContain("Sep 8 · 6:30 PM");
    expect(html).toContain("Sep 14 · 7:42 PM");
    expect(html).toContain(">Call<");
    expect(html).toContain(">Visit<");
    expect(html).toContain(">Link opened<");
    expect(html).toContain("Called about the Bronze 2 monthly");
    expect(html).toContain("She opened the payment-mode sheet for the second time");
  });

  it("carries the recorded next step and the contact action built from the record's phone", async () => {
    signInAs(["cases:read"]);
    const html = await renderLead("prospect-cecilia");

    expect(html).toContain("Call about Bronze 2 (or the senior plan for age 68)");
    expect(html).toContain('href="tel:+639176540091"');
    expect(html).toContain('href="sms:+639176540091"');
    expect(html).toContain("Call Cecilia");
    expect(html).toContain("Text");
  });

  it("reads the office number from the contact module rather than typing it", async () => {
    signInAs(["cases:read"]);
    const html = await renderLead("prospect-cecilia");
    expect(html).toContain(`href="${FAMILY_HELP.phoneHref}"`);
    expect(html).toContain(`>${FAMILY_HELP.phone}</a>`);
    expect(html).toContain(FAMILY_HELP.hours);
  });

  it("links what follows for this lead's interest and keeps the one honest line", async () => {
    signInAs(["cases:read"]);
    const planLead = await renderLead("prospect-cecilia");
    expect(planLead).toContain('href="/staff/plans/membership/new"');
    expect(planLead).toContain("Start a membership application");

    const servicesLead = await renderLead("prospect-paolo");
    expect(servicesLead).toContain('href="/staff/cases/new"');
    expect(servicesLead).toContain("Open a case");

    // Exactly one line carries the honest limitation, in plain words.
    expect(planLead.match(/customer-records service/g) ?? []).toHaveLength(1);
    const paragraphs = [...planLead.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
      textOf(m[1]),
    );
    const honest = paragraphs.filter((p) => p.includes("customer-records service"));
    expect(honest).toHaveLength(1);
    expect(honest[0]).toContain("Enquiry persistence");
    expect(honest[0]).toContain("customer sync");
    expect(honest[0]).toContain("lead assignment");
  });

  it("never invents a contact entry for a lead with none recorded", async () => {
    signInAs(["cases:read"]);
    const html = await renderLead("prospect-boyet");

    expect(html).toContain("No contact is recorded yet — the next step above is the first call.");
    expect(html).not.toContain("Called about the Bronze 2 monthly");
    expect(html).not.toContain("Sent the 2026 price list");
    expect(html).not.toContain(">Call<");
    // The record still answers the four questions for this lead.
    expect(html).toContain("Boyet Salazar");
    expect(html).toContain("Messaged the Facebook page about embalming only, no package.");
    expect(html).toContain("First call");
  });

  it("keeps the four questions on one page, with a way back and no prose wall", async () => {
    signInAs(["cases:read"]);
    const html = await renderLead("prospect-cecilia");

    for (const heading of ["Next step", "Where they are", "The enquiry", "Contact history", "What follows"]) {
      expect(html, `missing section ${heading}`).toContain(`<h2>${heading}</h2>`);
    }
    expect(html).toContain('href="/staff/pipeline"');
    expect(html).toContain("Back to pipeline");
    expectNoProseWall(html, "lead record");
  });

  it("404s a lead the record does not carry, and forbids a session without the scope", async () => {
    signInAs(["cases:read"]);
    const missing = await renderLead("lead-nobody");
    expect(missing).toContain("Lead not found");
    expect(textOf(missing)).toContain("We couldn't find that lead record.");

    signInAs([]);
    const forbidden = await renderLead("prospect-cecilia");
    expect(forbidden).toContain("You don’t have access to this area");
    expect(forbidden).not.toContain("Cecilia Ramos");
  });
});

describe("the CRM entry points into a lead record", () => {
  it("lists the recorded leads on the pipeline screen and keeps its own honest note", async () => {
    signInAs(["cases:read"]);
    const html = renderToStaticMarkup(await PipelinePage());

    expect(html).toContain("Recorded lead records");
    expect(html).toContain('href="/staff/pipeline/prospect-cecilia"');
    expect(html).toContain("Open record");
    expect(html).toContain("Cecilia Ramos");
    expect(html).toContain("crm-families");
    expect(html).toContain(">Qualified<");
  });

  it("lists the same recorded leads on the customers screen", async () => {
    signInAs(["cases:read"]);
    const html = renderToStaticMarkup(
      await CustomersPage({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toContain("Customers");
    expect(html).toContain("Lead records");
    expect(html).toContain('href="/staff/pipeline/prospect-cecilia"');
    expect(html).toContain("Marites Santos");
  });

  it("keeps the CRM gating on both entry screens", async () => {
    signInAs([]);
    const pipeline = renderToStaticMarkup(await PipelinePage());
    expect(pipeline).toContain("You don’t have access to this area");
    expect(pipeline).not.toContain("Cecilia Ramos");

    const customers = renderToStaticMarkup(
      await CustomersPage({ searchParams: Promise.resolve({}) }),
    );
    expect(customers).toContain("You don’t have access to this area");
    expect(customers).not.toContain("Cecilia Ramos");
  });
});
