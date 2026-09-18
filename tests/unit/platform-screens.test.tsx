import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { measureProse, textOf, wordsOf } from "@/tests/helpers/prose";

/**
 * The platform operator surface (PRD screen inventory "Platform Dashboard/
 * Tenant Management · Platform Login · Tenant Sign-Up";
 * docs/02-architecture/platform-administration.md). These are DESIGNED
 * screens on recorded sample data — no tenancy/identity service exists — so
 * the tests pin three things:
 *
 *  1. the surface is unmistakable and honest (marker wording, sample notice,
 *     read-only, "nothing was created/sent", what the platform must provide);
 *  2. it answers at a glance (the reading-budget rule the public pages carry:
 *     short lead, no long paragraphs, short list items);
 *  3. it stays out of the product: no staff/family/agent/public navigation
 *     links to /platform, robots disallows the prefix, and no product chrome
 *     class renders on a platform page.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

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
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/platform/sign-in",
}));

const { default: PlatformLayout } = await import("@/app/(platform)/layout");
const { default: PlatformSignInPage } = await import("@/app/(platform)/platform/sign-in/page");
const { default: PlatformTenantsPage } = await import("@/app/(platform)/platform/tenants/page");
const { default: PlatformTenantDetailPage } = await import(
  "@/app/(platform)/platform/tenants/[id]/page"
);
const { default: PlatformSignUpPage } = await import("@/app/(platform)/platform/sign-up/page");

/** Render a page inside the platform layout (its marker bar ships on every route). */
async function renderRoute(page: ReactNode): Promise<string> {
  return renderToStaticMarkup(createElement(PlatformLayout, null, page));
}

const DETAIL_LEAD = /<p class="platform-hero__lead">([\s\S]*?)<\/p>/;

type PageCase = {
  name: string;
  render: () => Promise<string>;
};

const PAGES: ReadonlyArray<PageCase> = [
  { name: "/platform/sign-in", render: async () => renderRoute(await PlatformSignInPage()) },
  { name: "/platform/tenants", render: async () => renderRoute(await PlatformTenantsPage()) },
  { name: "/platform/sign-up", render: async () => renderRoute(await PlatformSignUpPage()) },
  {
    name: "/platform/tenants/[id]",
    render: async () =>
      renderRoute(
        await PlatformTenantDetailPage({
          params: Promise.resolve({ id: "ten-sample-memorial" }),
        }),
      ),
  },
];

const BUDGET = {
  paragraphWords: 300,
  longestParagraph: 30,
  longestListItem: 30,
  openingSentence: 12,
} as const;

describe("platform screens: the surface marker and the reading budget", () => {
  for (const page of PAGES) {
    describe(page.name, () => {
      let html = "";
      it("renders inside the platform layout with one h1", async () => {
        html = await page.render();
        const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
        expect(h1s, `${page.name} must have exactly one h1`).toHaveLength(1);
      });

      it("carries the operator-surface marker and never the product's chrome", () => {
        expect(html).toContain("operator surface");
        expect(html).toContain("not the funeral product");
        for (const chrome of ["anchored-header", "app-sidebar", "portal-frame", "signin-shell"]) {
          expect(html, `${page.name} rendered product chrome ${chrome}`).not.toContain(chrome);
        }
      });

      it("keeps the reading budget (paragraphs, list items)", async () => {
        const stats = measureProse(html);
        const failures: string[] = [];
        if (stats.paragraphWords > BUDGET.paragraphWords) {
          failures.push(`${stats.paragraphWords} paragraph words (budget ${BUDGET.paragraphWords})`);
        }
        if (stats.longest.words > BUDGET.longestParagraph) {
          failures.push(`longest paragraph ${stats.longest.words}: "${stats.longest.text}"`);
        }
        if (stats.listItems.longestWords > BUDGET.longestListItem) {
          failures.push(`longest list item ${stats.listItems.longestWords}: "${stats.listItems.text}"`);
        }
        expect(failures.join("\n")).toEqual("");
      });

      it("opens with one plain sentence (≤ 12 words)", async () => {
        const match = html.match(DETAIL_LEAD);
        expect(match, `${page.name}: no hero lead`).toBeTruthy();
        const sentence = textOf(match![1]);
        expect(
          wordsOf(sentence),
          `${page.name}: the opening sentence is ${wordsOf(sentence)} words: "${sentence}"`,
        ).toBeLessThanOrEqual(BUDGET.openingSentence);
      });
    });
  }
});

describe("tenant management", () => {
  it("lists every recorded sample tenant with a link to its detail", async () => {
    const html = await renderRoute(await PlatformTenantsPage());
    expect(html).toContain("Sample records");
    expect(html).toContain("Recorded sample tenants");
    expect(html).toContain("Read-only: the tenancy service owns provisioning");
    for (const [id, name] of [
      ["ten-sample-memorial", "Sample Memorial Homes"],
      ["ten-example-chapel", "Example Funeral Chapel"],
      ["ten-sample-riverside", "Sample Riverside Funerals"],
      ["ten-sample-hillside", "Sample Hillside Memorial"],
    ]) {
      expect(html, `${name} must be listed`).toContain(name);
      expect(html, `${name} must link to its detail`).toContain(`href="/platform/tenants/${id}"`);
    }
  });

  it("shows the detail: administrator, subdomain, address and provisioning date", async () => {
    const html = await renderRoute(
      await PlatformTenantDetailPage({ params: Promise.resolve({ id: "ten-sample-memorial" }) }),
    );
    expect(html).toContain("Sample Memorial Homes");
    expect(html).toContain("Ana Sample");
    expect(html).toContain("owner@sample-memorial.example");
    expect(html).toContain("sample-memorial.example");
    expect(html).toContain("2026-09-13");
    expect(html).toContain("What provisioning a new tenant would require");
    expect(html).toContain("Deferred upstream");
  });

  it("answers not-found for a tenant the recorded store does not carry", async () => {
    await expect(
      PlatformTenantDetailPage({ params: Promise.resolve({ id: "ten-does-not-exist" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("the operator door and the sign-up flow state their limits", () => {
  it("says plainly who the platform sign-in is for, and that no service answers it", async () => {
    const html = await renderRoute(await PlatformSignInPage());
    expect(html).toContain("Platform sign-in");
    expect(html).toContain("Platform operators only");
    expect(html).toContain("no platform identity service answers this form yet");
    expect(html).toContain("What the platform must provide");
    expect(html).toContain("A seeded first operator");
    // The operator screens open directly for review (no session exists).
    expect(html).toContain('href="/platform/tenants"');
    expect(html).toContain('href="/platform/sign-up"');
  });

  it("shows the tenant sign-up steps, the capture and what follows provisioning", async () => {
    const html = await renderRoute(await PlatformSignUpPage());
    expect(html).toContain("1. The business");
    expect(html).toContain("2. The first administrator");
    expect(html).toContain("creates nothing");
    expect(html).toContain("What follows provisioning");
    expect(html).toContain("Configure");
    expect(html).toContain("Go live");
    expect(html).toContain("What the platform must provide");
    expect(html).toContain("A provisioning endpoint");
  });
});

describe("the platform surface stays out of the product", () => {
  it("is linked from no public, staff, family or agent navigation", () => {
    for (const file of [
      "components/landing/site-header.tsx",
      "lib/rbac/nav.ts",
      "components/portal-nav.ts",
      "lib/seo.ts",
    ]) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      expect(source, `${file} must not link the platform surface`).not.toMatch(
        /["'`]\/platform\//,
      );
    }
  });

  it("keeps the platform prefix out of crawlers", async () => {
    const { default: robots } = await import("@/app/robots");
    const policy = robots();
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    const disallow = (rule as { disallow?: string[] }).disallow ?? [];
    expect(disallow).toContain("/platform/");
  });

  it("keeps the sample fixture the only tenant source (reader enforces it)", async () => {
    const { platformLiveModeEnabled, platformRecordsAreSamples } = await import(
      "@/lib/api-client/platform"
    );
    expect(platformLiveModeEnabled()).toBe(false);
    expect(platformRecordsAreSamples()).toBe(true);
  });
});
