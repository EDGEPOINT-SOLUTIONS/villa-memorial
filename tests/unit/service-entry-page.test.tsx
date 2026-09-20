import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { saveServiceEntry, seedServiceEntries } from "@/lib/api-client/content-entries";

/**
 * A service-entry edit reaches the guide page (content-catalogue Phase 3): the
 * three guide routes read the entry the Pages & content editor saves. The
 * "/services" card section that used to list them left the page (captain
 * 2026-09-21), so an edit no longer lands there.
 */

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
  usePathname: () => "/",
}));

const { default: ServicesPage } = await import("@/app/(public)/services/page");
const { default: DeathAtHomePage, generateMetadata } = await import(
  "@/app/(public)/services/death-at-home/page"
);
const { default: TransportPage } = await import("@/app/(public)/transport/page");

async function renderGuide(page: () => Promise<ReactNode>): Promise<string> {
  return renderToStaticMarkup(await page());
}

async function renderServices(): Promise<string> {
  return renderToStaticMarkup(createElement(CartProvider, null, await ServicesPage()));
}

describe("the service guide entries drive their routes and the /services cards", () => {
  let before: string;
  let servicesBefore: string;

  beforeAll(async () => {
    before = await renderGuide(DeathAtHomePage);
    servicesBefore = await renderServices();
  });

  it("renders the guide page from its entry", () => {
    expect(before).toContain("Death at home");
    expect(before).toContain(
      "When a loved one passes at home, you should not have to manage the next steps alone.",
    );
    // The route keeps its structure: the immediate-assistance primary action.
    expect(before).toContain('href="/immediate-assistance"');
    expect(before).toContain("← Back to Funeraria Memorial Services");
    expect((before.match(/<h1\b/g) ?? []).length).toBe(1);
  });

  it("keeps the guide routes but no longer lists them on /services", () => {
    // The section left /services (captain 2026-09-21); the routes remain.
    expect(servicesBefore).not.toContain('id="guides"');
    expect(servicesBefore).not.toContain("Guides for what comes next");
    expect(servicesBefore).not.toContain("Death at home");
  });

  it("lands an edit on the guide page and nowhere on /services", async () => {
    const seed = seedServiceEntries().find((entry) => entry.key === "death-at-home")!;
    await saveServiceEntry(
      "death-at-home",
      {
        ...seed,
        title: "Death at home, revised",
        summary: "A revised lead sentence the office wrote.",
      },
      "editor@vm.demo",
    );

    const page = await renderGuide(DeathAtHomePage);
    expect(page).toContain("Death at home, revised");
    expect(page).toContain("A revised lead sentence the office wrote.");
    expect(page).not.toContain("you should not have to manage the next steps alone");

    const services = await renderServices();
    // The guide section is gone, so the edited entry has no card to reach.
    expect(services).not.toContain("Death at home, revised");
    expect(services).not.toContain("you should not have to manage the next steps alone");

    // The route's head reads the same entry.
    const metadata = await generateMetadata();
    expect(String(metadata.title)).toContain("Death at home, revised");
  });

  it("keeps the transport route on its own entry", async () => {
    const html = await renderGuide(TransportPage);
    expect(html).toContain("Transport");
    expect(html).toContain("Dignified transport for your loved one");
    expect(html).toContain('href="/plans/villa-memorial-plan"');
  });
});
