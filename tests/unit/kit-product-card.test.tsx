import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductCard } from "@/components/kit/product-card";

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
 * ProductCard — photograph first, then the figures. The card must lead with the
 * picture at the column's width (never a thumbnail beside text), carry the status
 * chip and the sample marker, and fall back to text-only for an item the client's
 * material does not cover.
 */
const photo = { src: "/media/client/lot-a-card-440.webp", width: 440, height: 330, alt: "" };

describe("kit ProductCard", () => {
  it("leads with the photograph and puts the figures under it", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        href="/lots/LOT-001"
        photo={photo}
        eyebrow="North park"
        title="Family plot"
        supporting="Section D · 12 sqm"
        price="₱480,000"
        priceNote="selling price"
        actions={<a href="/contact">Ask about this lot</a>}
      />,
    );
    expect(html).toContain('class="shop-card"');
    expect(html).toContain('class="shop-card__media"');
    expect(html).toContain("/media/client/lot-a-card-440.webp");
    expect(html).toContain("shop-card__title");
    expect(html).toContain("₱480,000");
    expect(html).toContain("selling price");
    expect(html).toContain("Ask about this lot");
  });

  it("renders the status chip and the sample marker together", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        href="/products/lumina"
        photo={photo}
        chip="Sample photograph"
        title="Lumina"
        price="₱33,000"
        status={{ tone: "success", label: "Available" }}
        caption="Illustration purposes only."
        actions={<span />}
      />,
    );
    expect(html).toContain("casket-sample__chip");
    expect(html).toContain("Sample photograph");
    expect(html).toContain("badge--success");
    expect(html).toContain("Available");
    expect(html).toContain("Illustration purposes only.");
  });

  it("renders text-only when the client's material has no picture — never a wrong one", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        href="/plans/service"
        title="Embalming"
        price="₱6,000"
        actions={<span />}
      />,
    );
    expect(html).toContain('class="shop-card"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("shop-card__media");
    expect(html).toContain("Embalming");
  });
});
