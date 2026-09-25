import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageLoading } from "@/components/ui/page-loading";
import { PageError } from "@/components/ui/page-error";

/**
 * The two shared Admin Portal route states (UI/UX renovation, 2026-09-25).
 * `admin-portal-sweep.test.ts` pins that every staff route uses them; this
 * pins what they render, so a route's loading/error frame cannot silently lose
 * its header, its skeleton or its recovery action.
 */
describe("PageLoading", () => {
  it("keeps the route's chrome and paints a lead + block skeleton", () => {
    const html = renderToStaticMarkup(
      <PageLoading eyebrow="Finance" title="Billing & collections" width="22rem" />,
    );
    expect(html).toContain("Finance");
    expect(html).toContain("Billing &amp; collections");
    expect(html).toContain("page-header");
    expect(html).toContain("skeleton--text");
    expect(html).toContain('class="skeleton"');
  });

  it("renders a block-only state when no lead width is given", () => {
    const html = renderToStaticMarkup(<PageLoading eyebrow="Overview" title="Loading…" />);
    expect(html).not.toContain("skeleton--text");
    expect(html).toContain('class="skeleton"');
  });
});

describe("PageError", () => {
  it("renders the route's message and one recovery action", () => {
    const html = renderToStaticMarkup(
      <PageError message="We couldn't load the orders just now." reset={() => {}} />,
    );
    expect(html).toContain("We couldn&#x27;t load the orders just now.");
    expect(html).toContain("alert--danger");
    expect(html).toContain("Try again");
  });
});
