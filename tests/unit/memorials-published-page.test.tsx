import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TEST_MEMORIAL } from "@/tests/helpers/memorial-record";

/**
 * The published branch of the memorial surface, rendered through the REAL
 * routes with the reader mocked to serve one test-only record.
 *
 * The app itself ships no published memorial (nothing may be fabricated), so
 * this file is what proves the routes work when a family has published: the
 * detail route renders the profile and builds indexable metadata, and the search
 * renders a result card for a matching name — while a non-matching search still
 * lists nobody.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("@/lib/api-client/memorials", () => ({
  memorialsLiveModeEnabled: () => false,
  publishedMemorials: () => [TEST_MEMORIAL],
  loadPublishedMemorials: async () => [TEST_MEMORIAL],
  findPublishedMemorial: (id: string) => (id === TEST_MEMORIAL.id ? TEST_MEMORIAL : null),
}));

const { default: MemorialSearchPage } = await import("@/app/(public)/memorials/page");
const { default: MemorialPage, generateMetadata } = await import(
  "@/app/(public)/memorials/[id]/page"
);

describe("a published memorial reaches the public routes", () => {
  it("renders the profile at its own URL, one h1", async () => {
    const html = renderToStaticMarkup(
      await MemorialPage({ params: Promise.resolve({ id: TEST_MEMORIAL.id }) }),
    );
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain(TEST_MEMORIAL.name);
    expect(html).toContain(TEST_MEMORIAL.life_dates.display);
    expect(html).toContain(TEST_MEMORIAL.remembrance[0]);
  });

  it("is indexable, with a canonical URL of its own", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: TEST_MEMORIAL.id }) });
    expect(meta.robots).toBeUndefined();
    expect(meta.title).toBe(`${TEST_MEMORIAL.name} — Villa Memorial`);
    expect(String(meta.alternates?.canonical)).toContain(`/memorials/${TEST_MEMORIAL.id}`);
  });

  it("appears in the search results for a matching query, and only then", async () => {
    const match = renderToStaticMarkup(
      await MemorialSearchPage({ searchParams: Promise.resolve({ name: "example record" }) }),
    );
    expect(match).toContain("mem-results__list");
    expect(match).toContain(TEST_MEMORIAL.name);
    expect(match).toContain(`/memorials/${TEST_MEMORIAL.id}`);

    const miss = renderToStaticMarkup(
      await MemorialSearchPage({ searchParams: Promise.resolve({ name: "nobody here" }) }),
    );
    expect(miss).not.toContain("mem-results__list");
    expect(miss).toContain("No memorial matches that search");
  });
});
