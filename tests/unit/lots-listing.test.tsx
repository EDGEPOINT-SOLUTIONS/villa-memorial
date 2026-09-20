import { describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import lotsFile from "@/lib/fixtures/property/lots.json";

/**
 * The /lots product listing (captain 2026-09-20): "still /lots have lots that
 * doesn't have any images… the filter is in the left side it should be sticky…
 * the looks should be inspired by amazon product pages, but the theme color is
 * our theme" — plus the two additions (client-side filtering; a "Refine by"
 * panel of checkbox groups with live counts and a price range).
 *
 * These tests pin what a server render can pin: every plot is a card with an
 * honestly captioned photograph, the card shows the brief's order, the initial
 * state comes from the URL (so a shared/reloaded link paints the view it
 * describes), and a no-match query offers the way back. The filter/sort MODEL
 * is tests/unit/lot-listing.test.ts; the sticky/phone CSS is
 * tests/unit/phone-layout.test.tsx; the no-reload behaviour is browser evidence
 * in the PR (vitest runs in node, with no DOM).
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
  usePathname: () => "/lots",
}));

const { default: LotsPage } = await import("@/app/(public)/lots/page");
const { lotPhoto } = await import("@/lib/lot-imagery");

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

async function renderPage(params: Record<string, string> = {}): Promise<string> {
  return renderToStaticMarkup(await LotsPage({ searchParams: Promise.resolve(params) }));
}

/** Every rendered product card, as markup. */
function cardsOf(html: string): string[] {
  return [...html.matchAll(/<li class="shop-card">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
}

function bandOf(html: string, label: string): string {
  const parts = html.split('<section class="cat-band" aria-label="');
  return parts.find((p) => p.startsWith(`${label}"`)) ?? "";
}

function titleOf(card: string): string {
  return card.match(/class="shop-card__title"><a[^>]*>([^<]+)/)?.[1] ?? "";
}

function priceOf(card: string): number | null {
  const m = card.match(/class="shop-card__price">₱([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

/** The row for one refine option, so a test can read its checked state + count. */
function optionRow(html: string, label: string): string {
  const parts = html.split('<label class="lot-filter__row"');
  return parts.find((p) => p.includes(`>${label}<`)) ?? "";
}

describe("the /lots product listing", () => {
  it("renders every plot as a card with a photograph and a caption", async () => {
    const html = await renderPage();
    const cards = cardsOf(html);
    expect(cards.length).toBe(56);
    for (const card of cards) {
      expect(card).toContain('class="shop-card__media"');
      expect(card).toMatch(/<img src="\/media\/[^"]+"/);
      expect(card).toContain('class="shop-card__caption"');
      // One availability chip and one primary action per card — no second CTA.
      expect(card.match(/class="badge badge--/g) ?? []).toHaveLength(1);
      expect(card.match(/class="btn btn--primary btn--sm"/g) ?? []).toHaveLength(1);
      // Card furniture never becomes paragraph prose (reading at a glance).
      expect(card.match(/<p[ >]/g) ?? []).toHaveLength(1);
    }
  });

  it("publishes a derivative, never a multi-megabyte marketing tile", async () => {
    const html = await renderPage();
    for (const tile of [
      "lot-primary.png",
      "lot-premium.png",
      "lot-mausoleum.png",
      "lot-garden-niches.png",
    ]) {
      expect(html).not.toContain(tile);
    }
    const sources = new Set(
      [...html.matchAll(/<img src="(\/media\/[^"]+)"/g)].map((m) => m[1]),
    );
    expect(sources.size).toBeGreaterThan(0);
    for (const src of sources) {
      expect(existsSync(path.join(ROOT, "public", decodeURIComponent(src))), src).toBe(true);
    }
    // Every caption says what the picture is NOT: the plot itself (it is marked
    // on the park map) — or names the fallback for what it is.
    for (const card of cardsOf(html)) {
      const caption = card.match(/class="shop-card__caption">([^<]*)</)?.[1] ?? "";
      expect(caption).toMatch(/park map|masterplan|no photograph of this ground/);
    }
  });

  it("answers in the brief's order: picture, number, facts, price, status, action", async () => {
    const cards = cardsOf(await renderPage());
    const a001 = cards.find((c) => titleOf(c) === "A-001");
    expect(a001).toBeDefined();
    const at = (needle: string) => a001!.indexOf(needle);
    expect(at('class="shop-card__media"')).toBeLessThan(at('class="shop-card__title"'));
    expect(at('class="shop-card__title"')).toBeLessThan(at('class="shop-card__meta"'));
    expect(at('class="shop-card__meta"')).toBeLessThan(at('class="shop-card__price"'));
    expect(at('class="shop-card__price"')).toBeLessThan(at('class="shop-card__status"'));
    expect(at('class="shop-card__status"')).toBeLessThan(at('class="shop-card__actions"'));
    expect(a001).toContain("₱128,000.00");
    expect(a001).toContain("Section A · Block 1 · 2.5 sqm");
    expect(a001).toContain("Available");
  });

  it("keeps every link the listing had: lot details and map deep links", async () => {
    const cards = cardsOf(await renderPage());
    const a001 = cards.find((c) => titleOf(c) === "A-001");
    expect(a001).toContain('href="/lots/00000000-0000-4000-8000-000000000D01"');
    const mapPlot = cards.find((c) => c.includes('href="/map?park=golden'));
    expect(mapPlot).toBeDefined();
    expect(mapPlot!).toMatch(/href="\/map\?park=golden&amp;plot=GH-/);
    expect(mapPlot!).toContain("Price on request");
  });

  it("sorts each park band on request, with unpriced plots last", async () => {
    for (const [sort, direction] of [
      ["price-asc", 1],
      ["price-desc", -1],
    ] as const) {
      const villa = cardsOf(bandOf(await renderPage({ sort }), "Villa Memorial")).map(priceOf);
      const priced = villa.filter((p): p is number => p !== null);
      expect(priced.length).toBeGreaterThan(1);
      for (let i = 1; i < priced.length; i++) {
        expect(priced[i] * direction, `${sort} order`).toBeGreaterThanOrEqual(
          priced[i - 1] * direction,
        );
      }
      const firstUnpriced = villa.indexOf(null);
      if (firstUnpriced !== -1) {
        expect(villa.slice(firstUnpriced).every((p) => p === null), sort).toBe(true);
      }
    }
  });

  it("paints the view a shared URL describes (initial state from the query)", async () => {
    const cases: Array<[Record<string, string>, number]> = [
      [{ park: "villa" }, 16],
      [{ park: "loyola" }, 20],
      [{ status: "available" }, 34],
      [{ type: "lt-premium" }, 11],
      [{ type: "lt-premium", status: "available" }, 9],
      [{ section: "D" }, 4],
      [{ area: "up-to-5" }, 8],
      [{ min: "200000", max: "600000" }, 4],
    ];
    for (const [params, expected] of cases) {
      const html = await renderPage(params);
      expect(cardsOf(html).length, JSON.stringify(params)).toBe(expected);
      expect(html, JSON.stringify(params)).toContain(
        `<strong>${expected}</strong> of 56 plots`,
      );
    }
    // The chosen option renders as a checked checkbox.
    const villa = await renderPage({ park: "villa" });
    expect(optionRow(villa, "Villa Memorial")).toContain('type="checkbox" checked=""');
    // …and an unknown id is dropped rather than guessed.
    expect(cardsOf(await renderPage({ park: "atlantis" })).length).toBe(56);
    expect(
      optionRow(await renderPage({ park: "atlantis" }), "Villa Memorial"),
    ).not.toContain("checked");
  });

  it("answers a no-match query with the way back", async () => {
    const html = await renderPage({ park: "loyola", status: "sold", type: "lt-mausoleum" });
    expect(cardsOf(html)).toHaveLength(0);
    expect(html).toContain("No plots match those filters");
    expect(html).toContain("Clear all filters");
  });

  it("renders the Refine panel's groups, counts and price range", async () => {
    const html = await renderPage();
    expect(html).toContain("Refine lots by");
    for (const group of ["Park", "Section", "Availability", "Lot type", "Area", "Price"]) {
      expect(html, group).toContain(`lot-filter__group">${group}<`);
    }
    // Every option carries its live result count; a zero-count option stays in
    // the panel, dimmed rather than hidden.
    expect(optionRow(html, "Villa Memorial")).toContain('class="lot-filter__count">16</span>');
    expect(optionRow(html, "Over 15 sqm")).toContain('class="lot-filter__count">0</span>');
    expect(optionRow(html, "Over 15 sqm")).toContain('data-empty="true"');
    // Price is a min/max pair plus quick ranges read from the published figures.
    expect(html).toContain("Min ₱");
    expect(html).toContain("Max ₱");
    expect(html).toContain("Up to ₱128,000.00");
    expect(html).toContain("₱567,000.00 and up");
  });

  it("puts the same panel behind the phone control, opened on demand", async () => {
    const html = await renderPage();
    expect(html).toContain('class="lot-sheet__toggle"');
    expect(html).toContain("Filters");
    // Closed by default, so the results lead on a phone (the panel is mounted
    // only when the control is used — no hidden duplicate inputs).
    expect(html).not.toContain('class="lot-sheet__panel"');
  });
});

describe("one picture rule home — lib/lot-imagery", () => {
  it("gives every fixture lot a real committed photograph of its section", () => {
    for (const lot of lotsFile.lots) {
      const photo = lotPhoto({ plotCode: lot.lot_number, section: lot.section });
      expect(photo.isMap, lot.lot_number).toBe(false);
      expect(photo.src).toMatch(/^\/media\/composition\/[a-z-]+-480\.webp$/);
      expect(photo.srcSet, lot.lot_number).toContain("480w");
      expect(photo.srcSet, lot.lot_number).toContain("720w");
      expect(existsSync(path.join(ROOT, "public", photo.src)), photo.src).toBe(true);
      expect(
        existsSync(path.join(ROOT, "public", photo.src.replace("-480", "-720"))),
        photo.src,
      ).toBe(true);
      expect(photo.caption).toContain(lot.lot_number);
    }
  });

  it("maps the four sections to the client's four park photographs", () => {
    const src = (section: string) => lotPhoto({ plotCode: "X-001", section }).src;
    expect(src("A")).toContain("prime-lot");
    expect(src("B")).toContain("premium-lot");
    expect(src("C")).toContain("garden-niches");
    expect(src("D")).toContain("mausoleum");
  });

  it("falls back to the park's own plan when the client has no photograph, and says so", () => {
    const photo = lotPhoto({ plotCode: "Z-001", parkImage: "/media/Park%20map.png" });
    expect(photo.isMap).toBe(true);
    expect(photo.caption).toContain("masterplan");
    expect(photo.caption).toContain("Z-001");
    expect(photo.caption).toContain("No photograph");
  });

  it("never lets a caption claim the photograph is the plot", () => {
    for (const caption of [
      lotPhoto({ plotCode: "A-001", section: "A" }).caption,
      lotPhoto({ plotCode: "GH-01", typeId: "lt-mausoleum" }).caption,
      lotPhoto({ plotCode: "Z-1", parkImage: "/media/Park%20map.png" }).caption,
    ]) {
      expect(caption).toMatch(/park map|masterplan/);
      expect(caption).not.toMatch(/this (plot|lot)/i);
    }
  });
});
