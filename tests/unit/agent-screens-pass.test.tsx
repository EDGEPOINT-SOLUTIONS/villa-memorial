import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { measureProse } from "../helpers/prose";
import { FAMILY_HELP } from "@/lib/family/contact";

/**
 * The remaining agent screens — applications, clients and marketing — on the
 * workbench grammar (captain, 2026-10-02).
 *
 * The portal was rebuilt screen by screen; these three still carried the old
 * wordy design. This guard renders the REAL pages over the recorded fixture and
 * pins the shapes the plan names: applications as a table carrying every
 * recorded file, clients as a table with search and the next amount the agent
 * may see, marketing as the office's own materials grid. Every honest-disabled
 * control names the contract it waits on, no amount is invented, and each page
 * stays inside the paragraph-prose budget the sales page set.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "agent@vm.demo", scopes: [] }),
}));

const { default: AgentApplicationsPage } = await import("@/app/(agent)/agent/applications/page");
const { default: AgentClientsPage } = await import("@/app/(agent)/agent/clients/page");
const { default: AgentMarketingPage } = await import("@/app/(agent)/agent/marketing/page");

const renderApplications = async () => renderToStaticMarkup(await AgentApplicationsPage());
const renderClients = async () =>
  renderToStaticMarkup(await AgentClientsPage({ searchParams: Promise.resolve({}) }));
const renderMarketing = async () => renderToStaticMarkup(await AgentMarketingPage());

/** Every control that a page renders `disabled`, as its `title` sentence. */
function disabledTitles(html: string): string[] {
  return [...html.matchAll(/<button[^>]*disabled[^>]*title="([^"]+)"/g)].map((m) => m[1]);
}

describe("/agent/applications — the plan's table", () => {
  it("renders the six columns the plan names, action last", async () => {
    const html = await renderApplications();
    expect(html).toContain('class="table wb-table"');
    for (const header of ["Family", "Product", "Stage", "Waits on", "Promise"]) {
      expect(html, `${header} column missing`).toContain(`>${header}</th>`);
    }
    expect(html).toContain('aria-label="Applications in flight"');
  });

  it("carries every recorded application and what it waits on", async () => {
    const html = await renderApplications();
    for (const fact of [
      "Jun Villanueva",
      "Senior plan",
      "Waiting on you",
      "Senior ID photo — you asked on 13 Sep",
      "Friday 18 Sep",
      "Upload the photo",
      "Liwayway Cruz",
      "Villa Memorial Plan, Silver 1",
      "Approved",
      "Nothing — the office issued the plan on 12 Sep",
      "The Ramos family",
      "Prime Lot A-005",
      "With the office",
      "Maricel Tan",
      "Garden Niche",
      "Waiting on the family",
    ]) {
      expect(html, `${fact} missing from the table`).toContain(fact);
    }
  });

  it("keeps the real action real and names the wait where none exists", async () => {
    const html = await renderApplications();
    // A prospect file opens its lead record; a client file opens the client; the
    // office-owned file dials the office.
    expect(html).toContain('href="/agent/prospects/prospect-jun"');
    expect(html).toContain('href="/agent/clients/client-liwayway"');
    expect(html).toContain(`href="${FAMILY_HELP.phoneHref}"`);
    // The two writes that do not exist are disabled and name their contract.
    const titles = disabledTitles(html);
    expect(titles).toContain("Document upload waits on the documents object store");
    expect(titles).toContain("Helping the family finish the papers waits on the crm-families write contract");
    expect(titles).toContain("Starting an application waits on the crm/property contracts");
  });

  it("keeps one h1, a keyboard-reachable region, and the prose budget", async () => {
    const html = await renderApplications();
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region"');

    const stats = measureProse(html);
    expect(stats.paragraphWords, `applications paragraph prose ${stats.paragraphWords}`).toBeLessThanOrEqual(150);
    expect(stats.longest.words, stats.longest.text).toBeLessThanOrEqual(30);
    expect(stats.listItems.longestWords, stats.listItems.text).toBeLessThanOrEqual(30);
  });
});

describe("/agent/clients — the book of business as a table", () => {
  it("renders the table columns and the recorded families", async () => {
    const html = await renderClients();
    for (const header of ["Family", "Holds", "Next amount", "Check-in"]) {
      expect(html, `${header} column missing`).toContain(`>${header}</th>`);
    }
    for (const fact of [
      "Marites Santos",
      "Liwayway Cruz",
      "Danilo Reyes",
      "Teodoro Cruz",
      "Gracia Villanueva",
      "Memorial lot A-002",
      "Villa Memorial Plan · Silver 1",
      "Check-in this month",
      "Being served now",
      "No check-in needed",
    ]) {
      expect(html, `${fact} missing from the book`).toContain(fact);
    }
    // The next amount is the only money the agent may see, with its date.
    expect(html).toContain("₱8,500.00");
    expect(html).toContain("₱1,000.00");
  });

  it("searches by name, lot, plan or phone and offers the four filters", async () => {
    const html = await renderClients();
    expect(html).toContain('placeholder="Name, lot, plan or phone"');
    expect(html).toContain('name="q"');
    for (const label of ["All", "Plans", "Lots", "Due a visit"]) {
      expect(html, `${label} filter missing`).toContain(label);
    }
  });

  it("carries open and call on every row, and one h1 with the prose budget", async () => {
    const html = await renderClients();
    expect(html).toContain('href="/agent/clients/client-marites"');
    expect(html).toContain("tel:");
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-label="Your clients"');

    const stats = measureProse(html);
    expect(stats.paragraphWords, `clients paragraph prose ${stats.paragraphWords}`).toBeLessThanOrEqual(150);
    expect(stats.longest.words, stats.longest.text).toBeLessThanOrEqual(30);
    expect(stats.listItems.longestWords, stats.listItems.text).toBeLessThanOrEqual(30);
  });
});

describe("/agent/marketing — the office's materials grid", () => {
  it("renders every recorded material with its own cover and public route", async () => {
    const html = await renderMarketing();
    for (const title of [
      "Villa Memorial Plan",
      "2026 price list",
      "Casket catalogue",
      "Funeraria services",
      "Chapel &amp; facilities",
      "The park &amp; available lots",
    ]) {
      expect(html, `${title} material missing`).toContain(title);
    }
    for (const href of ["/price-list", "/lots/price-list-2026", "/products", "/services", "/map"]) {
      expect(html, `${href} link missing`).toContain(`href="${href}"`);
    }
    // Every tile carries a cover picture (alt = the material title).
    const covers = html.match(/<img class="wb-material__cover"/g) ?? [];
    expect(covers.length).toBe(6);
    expect(html).toContain('alt="Villa Memorial Plan"');
  });

  it("disables the tracking control and names the share service, never inventing a stat", async () => {
    const html = await renderMarketing();
    expect(disabledTitles(html)).toContain("Copying a tracked share link waits on a share service");
    // The example stats are labelled as examples — never a live figure.
    expect(html).toContain("Example: shared 6 · opened 9");
  });

  it("keeps one h1 and the prose budget", async () => {
    const html = await renderMarketing();
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    const stats = measureProse(html);
    expect(stats.paragraphWords, `marketing paragraph prose ${stats.paragraphWords}`).toBeLessThanOrEqual(150);
    expect(stats.longest.words, stats.longest.text).toBeLessThanOrEqual(30);
    expect(stats.listItems.longestWords, stats.listItems.text).toBeLessThanOrEqual(30);
  });
});
