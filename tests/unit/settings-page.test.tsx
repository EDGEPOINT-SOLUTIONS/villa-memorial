import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { saveLandingContent } from "@/lib/api-client/landing";
import { assertNoParagraphNesting } from "@/tests/helpers/paragraph-nesting";
import { decodeEntities } from "@/tests/helpers/prose";
import contentFile from "@/lib/fixtures/landing/content.json";

/**
 * Tenant settings (`/staff/settings`, S32), rendered as the real page over the
 * records the product actually holds. What this pins:
 *
 *  · the identity the app publishes comes from the landing content document
 *    (an edit there reaches this page);
 *  · the business rules are the modules' own figures — the three-day filing
 *    deadline, the 3–9 day booking window, the four plan terms — never typed
 *    into the view;
 *  · what is configured, placeholder, waiting or unreadable is stated with its
 *    recorded basis, and nothing claims a value the build cannot read;
 *  · what only the platform can change is named, with no product action;
 *  · graceful 403 without `tenancy:tenants:manage`; one h1; no nested paragraphs.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const { default: SettingsPage } = await import("@/app/(staff)/staff/settings/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

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
  return renderToStaticMarkup(await SettingsPage());
}

/**
 * 2026-09-27: the `globalThis` seam these hooks deleted is GONE.
 *
 * The landing document used to keep an edit in process memory, so a test simulated one by
 * assigning `globalThis.__imLandingContent` directly — which also meant an edit did not
 * survive a restart in production. It is a durable journal now
 * (`lib/api-client/journal.ts`, `LANDING_STORE_PATH`), and `tests/setup.ts` points every
 * suite's journal at a throwaway file. So the edit below is made through the REAL save
 * path, which is both the honest way to arrange it and a stronger test: it proves a save
 * reaches this screen, not just that a global did.
 */
beforeEach(() => {
  sessionHolder.current = null;
});

describe("this park's configuration", () => {
  it("is forbidden without the administration scope", async () => {
    signIn(["cases:read"]);
    const html = await render();
    expect(html).toContain("have access to this area");
    expect(html).not.toContain("Villa Memorial Park");
  });

  it("prints the identity the public pages publish", async () => {
    signIn(["tenancy:tenants:manage"]);
    const html = await render();
    for (const value of [
      "Villa Funeraria",
      "24/7 Assistance Line",
      "0917 617 8489",
      "0917 183 9262",
      "Capilla de San Jose Bldg., Sunrise, Isabela City, Basilan",
      "Sanctuario de Mercedes y Gloria, Purok 3, Begang, Isabela City, Basilan",
      "Isabela City, Basilan",
    ]) {
      expect(html, `missing identity value ${value}`).toContain(value);
    }
    expect(html).toContain('href="tel:+639176178489"');
  });

  it("prints the business rules from the modules that apply them", async () => {
    signIn(["tenancy:tenants:manage"]);
    const html = await render();
    for (const value of [
      "Within 3 days of the contract date",
      "3–9 days",
      "Monthly · Quarterly · Semi-Annual · Annual",
      "Bronze 1 · Bronze 2 · Silver 1 · Silver 2 · Gold",
      "Within ₱3 of annual × 6",
      "Included, with no fixed day count",
    ]) {
      expect(html, `missing rule value ${value}`).toContain(value);
    }
    expect(html).toContain("Funeral Service Contract, clause 2");
  });

  it("states what is configured, placeholder, waiting and unreadable", async () => {
    signIn(["tenancy:tenants:manage"]);
    const html = decodeEntities(await render());
    for (const state of ["Configured", "Placeholder", "Waiting", "Not readable"]) {
      expect(html, `missing state ${state}`).toContain(state);
    }
    expect(html).toContain("The client has not confirmed the park's chapel names, count or classes");
    expect(html).toContain("The workflow engine that would define steps and owners is not built.");
    expect(html).toContain("identity-access publishes no user-list or provisioning API.");
    expect(html).toContain("tenancy-config is not in this build, so its flags cannot be read.");
  });

  it("names what only the platform can change and does nothing itself", async () => {
    signIn(["tenancy:tenants:manage"]);
    const html = decodeEntities(await render());
    expect(html).toContain("Only the platform can change");
    expect(html).toContain("This park's account — creating, suspending or closing it");
    expect(html).toContain("Subscription and trial dates");
    expect(html).toContain("tenancy-config, platform-side");
    expect(html).not.toContain("<form");
    expect(html).not.toMatch(/<button\b/);
  });

  it("carries an edit to the landing document straight to the identity table", async () => {
    signIn(["tenancy:tenants:manage"]);
    const seed = (contentFile as unknown as { content: Record<string, unknown> }).content;
    // Through the REAL save path — the same call the editor's BFF route makes — so this
    // proves a staff edit reaches this screen, not merely that a global was assigned.
    await saveLandingContent({
      ...seed,
      logo: { ...(seed.logo as Record<string, unknown>), wordmark: "Sanctuario de Prueba" },
    });
    const html = await render();
    expect(html).toContain("Sanctuario de Prueba");
    expect(html).not.toContain("Villa Memorial Park</td>");
  });
});

describe("house rules", () => {
  it("keeps one h1 and never skips a heading level", async () => {
    signIn(["tenancy:tenants:manage"]);
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
    signIn(["tenancy:tenants:manage"]);
    assertNoParagraphNesting(await render(), "/staff/settings");
  });
});
