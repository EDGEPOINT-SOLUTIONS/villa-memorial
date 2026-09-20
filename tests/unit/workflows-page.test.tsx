import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { assertNoParagraphNesting } from "@/tests/helpers/paragraph-nesting";

/**
 * Workflows (`/staff/workflows`, S31), rendered as the real page over the
 * recorded fixtures. What this pins:
 *
 *  · the four processes and their real steps are on the page, with the engine's
 *    absence named in one line (never a + New button that cannot work);
 *  · the in-flight tables are REAL records at their recorded step, with the
 *    recorded owner of the next step — a case's coordinator, an application's
 *    agent — and "Not recorded" where no owner exists;
 *  · a module that cannot answer (property live mode) marks only its own
 *    process unavailable, never the whole screen;
 *  · graceful 403 without `tenancy:tenants:manage`;
 *  · one h1, no skipped heading level, no nested paragraphs, no write controls.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const propertyLive = vi.hoisted(() => ({ current: false }));
vi.mock("@/lib/api-client/property", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/property")>();
  return {
    ...actual,
    propertyLiveModeEnabled: () => propertyLive.current,
  };
});

const { default: WorkflowsPage } = await import("@/app/(staff)/staff/workflows/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_SCOPES = [
  "identity:users:manage",
  "tenancy:tenants:manage",
  "cases:read",
  "scheduling:read",
  "property:read",
];

function signIn(scopes: string[]) {
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
  return renderToStaticMarkup(await WorkflowsPage());
}

beforeEach(() => {
  sessionHolder.current = null;
  propertyLive.current = false;
});

describe("the processes the office runs", () => {
  it("is forbidden without the administration scope", async () => {
    signIn(["cases:read"]);
    const html = await render();
    expect(html).toContain("have access to this area");
    expect(html).not.toContain("Funeral service");
  });

  it("names the four processes, their steps and the missing engine", async () => {
    signIn(ADMIN_SCOPES);
    const html = await render();
    for (const name of [
      "Funeral service",
      "Lot purchase application",
      "Lot transfer",
      "Chapel booking",
    ]) {
      expect(html, `missing process ${name}`).toContain(name);
    }
    expect(html).toContain("The workflow engine is not built.");
    expect(html).toContain(
      "No service lets the office define steps, assign owners or enforce order",
    );
    // The contract's stage order is printed as the service steps.
    for (const stage of [
      "Inquiry",
      "Retrieval",
      "Preparation",
      "Viewing",
      "Ceremony",
      "Interment",
      "Completed",
    ]) {
      expect(html, `missing stage ${stage}`).toContain(stage);
    }
  });

  it("shows recorded cases at their stage with the coordinator of the next step", async () => {
    signIn(ADMIN_SCOPES);
    const html = await render();
    expect(html).toContain("CASE-2026-0001");
    expect(html).toContain("Pedro Santos");
    expect(html).toContain("Elena Villanueva");
    expect(html).toContain('/staff/cases/00000000-0000-4000-8000-000000000C01');
    expect(html).toContain("CASE-2026-0006");
    // The contract's own default is shown as recorded, not renamed.
    expect(html).toContain("Unassigned");
  });

  it("shows the other recorded records moving through their own processes", async () => {
    signIn(ADMIN_SCOPES);
    const html = await render();
    expect(html).toContain("A-002 · Marites Santos");
    expect(html).toContain("Lot reserved");
    expect(html).toContain("A-002 · Marites Santos → Alyanna Santos");
    expect(html).toContain("Submitted");
    expect(html).toContain("Chapel A · Wake — Day 1");
    expect(html).toContain("Chapel B · Memorial service");
    // No owner is recorded on the transfer — the screen says so instead.
    expect(html).toMatch(/Not recorded/);
  });

  it("has no write controls", async () => {
    signIn(ADMIN_SCOPES);
    const html = await render();
    expect(html).not.toContain("<form");
    expect(html).not.toMatch(/<button\b/);
  });
});

describe("honest states", () => {
  it("marks only the property-backed process unavailable in live mode", async () => {
    signIn(ADMIN_SCOPES);
    propertyLive.current = true;
    const html = await render();
    expect(html).toContain("This process cannot be read right now");
    // The other three processes still render their records.
    expect(html).toContain("CASE-2026-0001");
    expect(html).toContain("A-002 · Marites Santos → Alyanna Santos");
    expect(html).toContain("Chapel A · Wake — Day 1");
  });

  it("never links a record the reader cannot open", async () => {
    signIn(["tenancy:tenants:manage"]);
    const html = await render();
    expect(html).not.toMatch(/href="\/staff\/cases\//);
    expect(html).not.toMatch(/href="\/staff\/schedule/);
    expect(html).not.toMatch(/href="\/staff\/property\//);
    // The records themselves are still shown.
    expect(html).toContain("CASE-2026-0001");
  });
});

describe("house rules", () => {
  it("keeps one h1 and never skips a heading level", async () => {
    signIn(ADMIN_SCOPES);
    const html = await render();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(
        levels[i] - levels[i - 1],
        `heading ${levels[i]} follows ${levels[i - 1]}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("never nests a paragraph inside another", async () => {
    signIn(ADMIN_SCOPES);
    assertNoParagraphNesting(await render(), "/staff/workflows");
  });
});
