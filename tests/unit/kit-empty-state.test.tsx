import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "@/components/kit/empty-state";

/**
 * EmptyState — the one empty / no-match grammar. Same markup as the pre-kit
 * component (no restyle), plus the optional action.
 */
describe("kit EmptyState", () => {
  it("renders the title, the hint and the shared empty-state classes", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No stock recorded" hint="Stock lines appear here once recorded." />,
    );
    expect(html).toContain('class="empty-state"');
    expect(html).toContain("No stock recorded");
    expect(html).toContain("Stock lines appear here once recorded.");
  });

  it("omits the hint when there is none", () => {
    const html = renderToStaticMarkup(<EmptyState title="Nothing here" />);
    expect(html).not.toContain("empty-state__hint");
  });

  it("renders a way out only when one is given", () => {
    const withAction = renderToStaticMarkup(
      <EmptyState title="No matches" action={<a href="/staff/inventory">Clear</a>} />,
    );
    expect(withAction).toContain("empty-state__action");
    expect(withAction).toContain('href="/staff/inventory"');
    const without = renderToStaticMarkup(<EmptyState title="No matches" />);
    expect(without).not.toContain("empty-state__action");
  });
});
