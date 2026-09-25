import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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
const { RefinePanel } = await import("@/components/kit");

/** Render the shared kit refine panel on its own, so the controls the listing
 *  builds around it can be inspected without the page's server half. */
function renderPanel(): string {
  return renderToStaticMarkup(
    <RefinePanel
      title="Refine lots by"
      groups={[
        {
          key: "statuses",
          title: "Availability",
          options: [{ id: "available", label: "Available" }],
          counts: { available: 1 },
          selected: [],
        },
        {
          key: "types",
          title: "Lot type",
          options: [{ id: "lt-prime", label: "Prime lots" }],
          counts: { "lt-prime": 1 },
          selected: [],
        },
      ]}
      onToggle={() => {}}
      onClear={() => {}}
      activeCount={0}
      price={{
        minCents: null,
        maxCents: null,
        quickRanges: [
          { id: "up-to", label: "Up to ₱128,000.00", minCents: 0, maxCents: 12_800_000 },
        ],
        onApply: () => {},
        onQuickRange: () => {},
      }}
    />,
  );
}

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
  const m = card.match(/class="monthly-price__amount">₱([\d,]+)\./);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

/** The row for one refine option, so a test can read its checked state + count. */
function optionRow(html: string, label: string): string {
  const parts = html.split('<label class="refine-option"');
  return parts.find((p) => p.includes(`>${label}<`)) ?? "";
}

describe("the /lots product listing", () => {
  it("renders every plot as a card with a photograph and a caption", async () => {
    const html = await renderPage();
    const cards = cardsOf(html);
    expect(cards.length).toBe(16);
    for (const card of cards) {
      expect(card).toContain('class="shop-card__media"');
      expect(card).toMatch(/<img src="\/media\/[^"]+"/);
      expect(card).toContain('class="shop-card__caption"');
      // One availability chip and one card action per card — no second CTA.
      expect(card.match(/class="badge badge--/g) ?? []).toHaveLength(1);
      expect(card.match(/class="btn btn--accent btn--sm"/g) ?? []).toHaveLength(1);
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
    expect(a001).toContain("Section A · Block 1 · 2.5 sqm");
    expect(a001).toContain("Available");
    // The monthly installment leads (minutes item 8, 2026-09-21), with its
    // recorded 6-year term and the recorded total contract price under it.
    expect(a001).toContain('class="monthly-price__amount">₱1,920.00');
    expect(a001).toContain("Payment term: 6 years (72 months)");
    expect(a001).toContain("Total contract price ₱128,000");
  });

  it("keeps every link the listing had: lot details and map deep links", async () => {
    const cards = cardsOf(await renderPage());
    const a001 = cards.find((c) => titleOf(c) === "A-001");
    expect(a001).toContain('href="/lots/00000000-0000-4000-8000-000000000D01"');
    const mapPlot = cards.find((c) => c.includes('href="/map?park=villa'));
    expect(mapPlot).toBeDefined();
    expect(mapPlot!).toMatch(/href="\/map\?park=villa&amp;plot=D-/);
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
      [{ status: "available" }, 10],
      [{ type: "lt-premium" }, 4],
      [{ type: "lt-premium", status: "available" }, 4],
      [{ section: "D" }, 4],
      [{ area: "up-to-5" }, 8],
      [{ min: "200000", max: "600000" }, 4],
    ];
    for (const [params, expected] of cases) {
      const html = await renderPage(params);
      expect(cardsOf(html).length, JSON.stringify(params)).toBe(expected);
      expect(html, JSON.stringify(params)).toContain(
        `<strong>${expected}</strong> of 16 plots`,
      );
    }
    // The chosen option renders as a checked checkbox.
    const sectionA = await renderPage({ section: "A" });
    expect(optionRow(sectionA, "Section A")).toContain('type="checkbox" checked=""');
    // …and an unknown id is dropped rather than guessed.
    expect(cardsOf(await renderPage({ park: "atlantis" })).length).toBe(16);
    expect(optionRow(await renderPage({ park: "atlantis" }), "Section A")).not.toContain(
      "checked",
    );
  });

  it("answers a no-match query with the way back", async () => {
    const html = await renderPage({ status: "reserved", type: "lt-premium" });
    expect(cardsOf(html)).toHaveLength(0);
    expect(html).toContain("No plots match those filters");
    expect(html).toContain("Clear all filters");
  });

  it("renders the Refine panel's groups, counts and price range", async () => {
    const html = await renderPage();
    expect(html).toContain("Refine lots by");
    // ONE park means no one-option Park group; the band header names it instead.
    expect(html).not.toContain('refine-group__label">Park<');
    expect(html).toContain("Villa Memorial");
    for (const group of ["Section", "Availability", "Lot type", "Area", "Price"]) {
      expect(html, group).toContain(`refine-group__label">${group}<`);
    }
    // Every option carries its live result count; a zero-count option stays in
    // the panel, dimmed rather than hidden.
    expect(html).toContain("16 plots · 10 available · Isabela City");
    expect(optionRow(html, "Over 15 sqm")).toContain('class="refine-option__count">0</span>');
    expect(optionRow(html, "Over 15 sqm")).toContain('data-empty="true"');
    // Price is a min/max pair plus quick ranges read from the published figures.
    expect(html).toContain("Min ₱");
    expect(html).toContain("Max ₱");
    expect(html).toContain("Up to ₱128,000.00");
    expect(html).toContain("₱567,000.00 and up");
  });

  it("puts the same panel behind the phone control, opened on demand", async () => {
    const html = await renderPage();
    expect(html).toContain('class="listing-sheet__toggle"');
    expect(html).toContain("Filters");
    // Closed by default, so the results lead on a phone (the panel is mounted
    // only when the control is used — no hidden duplicate inputs).
    expect(html).not.toContain('class="listing-sheet__panel"');
  });
});

/**
 * One CTA grammar (captain follow-up, 2026-09-21: "tell me why in the lots, the
 * buttons or cta is not consistent"): every repeated control on /lots belongs
 * to the SAME ladder the public catalogue already uses — a card's primary
 * action is `.btn--accent` (the gold `Add to cart` rung), every supporting
 * action is `.btn--secondary`, and the panel's commit is `.btn--primary`,
 * the page-level rung. These pin the classes, not the colour.
 */
describe("one control ladder for /lots", () => {
  it("dresses every card's action in the catalogue's primary (accent) rung", async () => {
    const actions = [...(await renderPage()).matchAll(/class="(btn [^"]*)"[^>]*>(View[^<]+)</g)];
    expect(actions.length).toBe(16);
    for (const [, cls, label] of actions) {
      expect(cls, label).toBe("btn btn--accent btn--sm");
    }
  });

  it("keeps the two honest destinations but reads them as one action grammar", async () => {
    const labels = new Set(
      [...(await renderPage()).matchAll(/class="btn [^"]*"[^>]*>(View[^<]+)</g)].map(
        (m) => m[1],
      ),
    );
    // Every label shares the same core action; a map-only plot spells out where
    // it goes, a published lot does not need to.
    for (const label of labels) expect(label.startsWith("View this lot")).toBe(true);
    expect(labels).toEqual(new Set(["View this lot", "View this lot on the park map"]));
  });

  it("gives the two Clear controls one treatment (the supporting rung)", async () => {
    // The rail's Clear is only rendered while a filter is applied.
    const withFilter = await renderPage({ park: "villa" });
    const railClear = withFilter.match(/class="([^"]*)"[^>]*>\s*Clear\s*</)?.[1] ?? "";
    expect(railClear).toBe("btn btn--secondary btn--sm");
    // The no-results recovery is the same act, so the same control.
    const noMatch = await renderPage({ status: "reserved", type: "lt-premium" });
    const emptyClear =
      noMatch.match(/class="([^"]*)"[^>]*>\s*Clear all filters\s*</)?.[1] ?? "";
    expect(emptyClear).toBe("btn btn--secondary btn--sm");
  });

  it("rides the commit rung: the panel's Go and the phone sheet's Apply", () => {
    const html = renderPanel();
    expect(html).toContain('class="btn btn--primary">Go</button>');
    // The quick ranges stay subordinate, but ride the same `.btn` ladder (which
    // also gives them the phone 44px touch target the old chip never reached).
    expect(html).toContain('class="btn btn--secondary btn--sm refine-price__quick-link"');
    expect(html).not.toMatch(/class="refine-price__quick-link"/);
    // The phone sheet's Apply is the shell's, and rides the same commit rung.
    const shell = readFileSync(
      fileURLToPath(new URL("../../components/kit/listing-shell.tsx", import.meta.url)),
      "utf8",
    );
    expect(shell).toContain("btn btn--primary listing-sheet__apply");
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
