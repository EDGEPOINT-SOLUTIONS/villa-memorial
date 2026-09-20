import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatCard } from "@/components/kit/stat-card";

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

/**
 * StatCard — one KPI figure with its label and its basis, in the existing
 * `.kpi-card` grammar. A linked tile keeps the whole tile clickable.
 */
describe("kit StatCard", () => {
  it("renders the label, figure and basis in the kpi-card markup", () => {
    const html = renderToStaticMarkup(
      <StatCard label="Items tracked" value="12" sub="8 in stock" />,
    );
    expect(html).toContain('class="card kpi-card"');
    expect(html).toContain("Items tracked");
    expect(html).toContain(">12<");
    expect(html).toContain("8 in stock");
  });

  it("omits the basis line when there is none", () => {
    const html = renderToStaticMarkup(<StatCard label="Sent" value="0" />);
    expect(html).not.toContain("kpi-card__sub");
  });

  it("makes the whole tile a link when it points at a filtered view", () => {
    const html = renderToStaticMarkup(
      <StatCard label="Out of stock" value="2" sub="reorder now" href="/staff/inventory?state=out" />,
    );
    expect(html).toContain('<a href="/staff/inventory?state=out" class="card kpi-card">');
  });
});
