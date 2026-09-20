import { describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * Pages & content — the page home (content-catalogue Phase 1).
 *
 * The list must carry the captain's five documents, each pointing at the one
 * editor that owns it (Home → the existing landing/FAQ editor; the rest → the
 * page-document editor), and the page-document route must render the document's
 * hero/tabs/blocks for a writer and the designed 403 without `catalog:write`.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
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
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
}));

const { default: PagesAndContentPage } = await import("@/app/(staff)/staff/landing/page");
const { default: PageDocumentAdminPage } = await import("@/app/(staff)/staff/landing/[doc]/page");
const { default: ServiceEntryAdminPage } = await import(
  "@/app/(staff)/staff/landing/service-entry/[key]/page"
);

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function session(scopes: string[]): Session {
  return {
    sub: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    displayName: "Ada Admin",
    email: "admin@vm.demo",
    expiresAt: Date.now() + 60_000,
  } as unknown as Session;
}

function params(doc: string) {
  return { params: Promise.resolve({ doc }) };
}

function entryParams(key: string) {
  return { params: Promise.resolve({ key }) };
}

describe("Pages & content", () => {
  it("lists the captain's five documents with one editor home each", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(await PagesAndContentPage());
    for (const label of [
      "Home",
      "Villa Memorial Park",
      "Funeraria Memorial Services",
      "Villa Memorial Plan",
      "Coffins &amp; caskets",
    ]) {
      expect(html).toContain(label);
    }
    // Home keeps the existing full editor; the others open the page editor.
    expect(html).toContain('href="/staff/landing/home"');
    expect(html).toContain('href="/staff/landing/park"');
    expect(html).toContain('href="/staff/landing/services"');
    expect(html).toContain('href="/staff/landing/plans"');
    expect(html).toContain('href="/staff/landing/coffins"');
  });

  it("answers the list with the designed 403 without catalog:write", async () => {
    sessionHolder.current = session(["cases:read"]);
    const html = renderToStaticMarkup(await PagesAndContentPage());
    expect(html).toContain("catalog:write");
    expect(html).not.toContain("Edit this page");
  });

  it("renders the park document's hero, tabs and block canvas", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(await PageDocumentAdminPage(params("park")));
    expect(html).toContain("Villa Memorial Park");
    expect(html).toContain("Interactive park map");
    expect(html).toContain("Page tabs");
    expect(html).toContain("Content blocks");
    expect(html).toContain("Park view");
  });

  it("gives each plans tier the description + photo controls in the block canvas", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(await PageDocumentAdminPage(params("plans")));
    expect(html).toContain("Villa Memorial Plan");
    expect(html).toContain("Content blocks");
    // The premium tier card's two optional fields are editable in the block form:
    // a one-line description and an optional photograph (never a dropdown-only list).
    expect(html).toContain("Description (optional)");
    expect(html).toContain("Printed open (the tier card)");
    expect((html.match(/Attach photo \(optional\)/g) ?? []).length).toBe(5);
  });

  it("gives the service document its block canvas and the service-entry list", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(await PageDocumentAdminPage(params("services")));
    expect(html).toContain("Funeraria Memorial Services");
    expect(html).toContain("Funeral services, and what they cost in 2026");
    // Phase 3: the document carries the service descriptions as blocks…
    expect(html).toContain("Content blocks");
    // …and the three guide pages are service entries, each with its own editor.
    expect(html).toContain("Service entries");
    expect(html).toContain('href="/staff/landing/service-entry/death-at-home"');
    expect(html).toContain('href="/staff/landing/service-entry/death-at-hospital"');
    expect(html).toContain('href="/staff/landing/service-entry/transport"');
  });

  it("renders the service-entry editor for one guide and 404s an unknown key", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(await ServiceEntryAdminPage(entryParams("death-at-home")));
    expect(html).toContain("Death at home");
    expect(html).toContain("Service entry");
    expect(html).toContain("Hero photograph");
    expect(html).toContain("Content blocks");
    await expect(ServiceEntryAdminPage(entryParams("not-a-guide"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s a key that is not one of the page documents", async () => {
    sessionHolder.current = session(["catalog:write"]);
    await expect(PageDocumentAdminPage(params("store"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("forbids the document editor without the write scope", async () => {
    sessionHolder.current = session(["catalog:read"]);
    const html = renderToStaticMarkup(await PageDocumentAdminPage(params("park")));
    expect(html).toContain("catalog:write");
    expect(html).not.toContain("Page tabs");
  });
});
