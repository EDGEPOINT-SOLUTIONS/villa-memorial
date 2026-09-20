import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { PdpGallery } from "@/components/villa/pdp-gallery";
import { getItemEntry, saveItemEntry } from "@/lib/api-client/content-entries";
import { richTextToHtml } from "@/lib/richtext";
import type { ContentImage } from "@/lib/content-catalog";

/**
 * The product-detail gallery (report §6): the main viewer with its thumbnail
 * rail, the lead-eager / rest-lazy loading, the sample honesty chip, and the
 * page's fallback to the rule-derived sample figure when no gallery is authored.
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
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: CasketDetailPage } = await import("@/app/(public)/products/[sku]/page");

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-pdp-gallery-"));
  process.env.CONTENT_ENTRIES_STORE_PATH = path.join(dir, "entries.json");
});
afterEach(async () => {
  delete process.env.CONTENT_ENTRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function image(id: string, overrides: Partial<ContentImage> = {}): ContentImage {
  return {
    id,
    src: `/media/client/${id}.webp`,
    alt: `Photograph ${id}`,
    caption: null,
    sample: false,
    ...overrides,
  };
}

function renderGallery(images: ContentImage[]): string {
  return renderToStaticMarkup(createElement(PdpGallery, { images, label: "Lumina casket" }));
}

function renderCart(page: ReactNode): string {
  return renderToStaticMarkup(createElement(CartProvider, null, page));
}

describe("the product-detail gallery viewer", () => {
  it("leads with the first photograph and lists the rest in the thumbnail rail", () => {
    const html = renderGallery([image("a"), image("b"), image("c")]);
    // The main viewer shows the lead photograph.
    expect(html).toContain('src="/media/client/a.webp"');
    // Three labelled thumbnails; the lead is the current one.
    expect(html).toContain('aria-label="Show photograph 1 of 3"');
    expect(html).toContain('aria-label="Show photograph 3 of 3"');
    expect(html).toContain('aria-current="true"');
  });

  it("loads the lead eagerly and every non-lead photograph lazily", () => {
    const html = renderGallery([image("a"), image("b")]);
    expect(html).toMatch(/pdp-gallery__main[\s\S]*?loading="eager"/);
    // Every rail thumbnail is lazy.
    const thumbs = html.match(/class="pdp-gallery__thumb[^"]*"[\s\S]*?loading="lazy"/g) ?? [];
    expect(thumbs.length).toBe(2);
  });

  it("keeps the sample chip and the sheet's substitution note", () => {
    const html = renderGallery([
      image("a", { sample: true, caption: "Illustrative sample." }),
      image("b", { sample: true, caption: "Another sample." }),
    ]);
    expect(html).toContain("Sample photograph");
    expect(html).toContain("Sample");
  });

  it("renders no rail when a single photograph is authored", () => {
    const html = renderGallery([image("solo")]);
    expect(html).not.toContain("pdp-gallery__rail");
  });
});

describe("the product page's gallery fallback", () => {
  it("keeps the rule-derived sample figure when no gallery is authored", async () => {
    const html = renderCart(
      await CasketDetailPage({ params: Promise.resolve({ sku: "CSK-LUMINA" }) }),
    );
    expect(html).toContain("casket-sample__media");
    expect(html).not.toContain("pdp-gallery");
  });

  it("swaps the sample figure for the authored viewer + rail", async () => {
    const seed = await getItemEntry("CSK-LUMINA");
    await saveItemEntry(
      "CSK-LUMINA",
      {
        ...seed,
        gallery: [
          image("lumina-front"),
          image("lumina-side", { caption: "The side profile." }),
        ],
      },
      "editor@vm.demo",
    );
    const html = renderCart(
      await CasketDetailPage({ params: Promise.resolve({ sku: "CSK-LUMINA" }) }),
    );
    expect(html).toContain("pdp-gallery__main");
    expect(html).toContain('aria-label="Show photograph 2 of 2"');
    expect(html).not.toContain("casket-sample__media");
  });
});

describe("richTextToHtml — the editor host's serializer", () => {
  it("escapes text so nothing can become markup", () => {
    const html = richTextToHtml({
      nodes: [{ type: "paragraph", spans: [{ text: "<script>alert(1)</script>" }] }],
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("serialises headings, marks, lists and only safe links", () => {
    const html = richTextToHtml({
      nodes: [
        { type: "heading", level: 2, text: "About" },
        { type: "paragraph", spans: [{ text: "Solid", marks: ["bold"] }] },
        { type: "bulletList", items: [[{ text: "Half" }]] },
        { type: "paragraph", spans: [{ text: "Office", href: "javascript:alert(1)" }] },
      ],
    });
    expect(html).toContain("<h2>About</h2>");
    expect(html).toContain("<strong>Solid</strong>");
    expect(html).toContain("<ul><li>Half</li></ul>");
    // A disallowed scheme is never serialised as a link.
    expect(html).not.toContain("javascript:");
  });
});
