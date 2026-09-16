import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import {
  ALACARTE_LINES,
  casketDetailHref,
  coffinModelForSku,
  coffinSku,
} from "@/lib/catalogue-skus";
import {
  CASKET_INCLUSIONS,
  CASKET_MODELS,
  CHAPEL_RATES,
  COFFIN_COVER_UNSTATED,
  COFFIN_TIER_NOTE,
  coffinCover,
  php,
} from "@/lib/villa-pricing";
import {
  CHAPEL_COMMON_IMAGE,
  CHAPEL_PRIVATE_IMAGE,
  CHAPEL_SAMPLE_NOTE,
  COFFIN_SAMPLE_PHOTOS,
  SERVICE_CARRIAGE_IMAGE,
  SERVICE_SAMPLE_NOTE,
  VIEWING_CARE_IMAGE,
  casketSamplePhoto,
} from "@/lib/media";

/**
 * The premium pass over the two client-facing surfaces this work rebuilt:
 * /services (grouped rate sections, the chapel options with the client's own
 * sample photographs, and every figure still sellable) and the casket catalogue
 * (/products cards + the /products/[sku] detail view).
 *
 * These tests exist because the SHEET'S IMAGERY IS ILLUSTRATIVE: the client's
 * TYPES OF COFFIN sheet photographs sample coffins and sample wake set-ups and
 * marks them "(Illustration purposes only)", so every place the site publishes
 * one must say so and must never claim a model or a room is photographed
 * exactly. They also pin that the detail view renders catalogue/pricing data
 * rather than hand-typed copy — the whole reason it is a route, not a dialog.
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
}));

const { default: ServicesPage } = await import("@/app/(public)/services/page");
const { default: ProductsPage } = await import("@/app/(public)/products/page");
const { default: CasketDetailPage, generateMetadata } = await import(
  "@/app/(public)/products/[sku]/page"
);

async function renderWithCart(page: ReactNode): Promise<string> {
  return renderToStaticMarkup(createElement(CartProvider, null, page));
}

/** Server pages that render cart buttons need the cart context wrapper. */
async function renderDetail(sku: string): Promise<string> {
  return renderWithCart(await CasketDetailPage({ params: Promise.resolve({ sku }) }));
}

/** React escapes apostrophes in server markup; compare against the plain text. */
function unescaped(html: string): string {
  return html.replace(/&#x27;|&#39;/g, "'");
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("/services reads as the premium service page", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ServicesPage());
  });

  it("groups the 2026 rates into the three priced sections", () => {
    expect(html).toContain('id="at-need-title"');
    expect(html).toContain("At-need services");
    expect(html).toContain('id="embalming-title"');
    expect(html).toContain("Embalming — per day");
    expect(html).toContain('id="chapel-title"');
    expect(html).toContain("Chapel options");
    // Each block is a .mid-section (the package page's premium section grammar).
    expect((html.match(/class="mid-section"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("renders one icon card per at-need service with both actions", () => {
    expect((html.match(/class="svc-card"/g) ?? []).length).toBe(ALACARTE_LINES.length);
    expect((html.match(/class="svc-card__icon"/g) ?? []).length).toBeGreaterThanOrEqual(
      ALACARTE_LINES.length,
    );
    for (const line of ALACARTE_LINES) {
      expect(html, line.service).toContain(line.service);
      expect(html, `${line.service} amount`).toContain(php(line.amount));
    }
    // The sheet's own bottom line stays published in its own band.
    expect(html).toContain('class="svc-total"');
    expect(html).toContain(php(19500));
    expect(html).toContain("request the whole set");
  });

  it("gives the common and private chapel their own sample photograph", () => {
    expect(html).toContain(CHAPEL_COMMON_IMAGE);
    expect(html).toContain(CHAPEL_PRIVATE_IMAGE);
    expect(html).toContain('class="chapel-grid"');
    expect((html.match(/class="chapel-card"/g) ?? []).length).toBe(2);
    expect(html).toContain("Common chapel");
    expect(html).toContain("Private chapel");
    // The photographs carry descriptive alt text…
    expect(html).toContain("alt=\"Illustrative sample wake set-up in the client");
    expect(html).toContain("alt=\"Illustrative sample decorated viewing room in the client");
    // …and the sheet's illustration-only label, twice (one per room).
    expect((unescaped(html).match(new RegExp(escapeRe(CHAPEL_SAMPLE_NOTE), "g")) ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("labels the at-need photographs as the client's own samples", () => {
    expect(html).toContain(SERVICE_CARRIAGE_IMAGE);
    expect(html).toContain(VIEWING_CARE_IMAGE);
    expect(html).toContain("Sample service");
    expect(unescaped(html)).toContain(SERVICE_SAMPLE_NOTE);
    expect(html).toMatch(/sample viewing set-up from the client/);
  });

  it("keeps both chapel rates and their senior column on the schedule", () => {
    expect(html).toContain("3 days — regular");
    expect(html).toContain("3 days — senior citizen");
    expect(html).toContain("Request this stay");
  });

  it("still opens the chapel booking step instead of a straight add (main's booking intent)", () => {
    // A chapel is never a one-click cart item: the cards' "Book these dates" and
    // every 3–9 day row's "Book common/private N days" open the booking dialog.
    expect(html).toContain("Book these dates");
    for (const r of CHAPEL_RATES) {
      expect(html, `common stay ${r.days}`).toContain(`Book common ${r.days} days`);
      expect(html, `private stay ${r.days}`).toContain(`Book private ${r.days} days`);
    }
    expect((html.match(/aria-haspopup="dialog"/g) ?? []).length).toBeGreaterThanOrEqual(
      2 + CHAPEL_RATES.length * 2,
    );
    // No plain chapel add-to-cart survived the premium restyle.
    expect(html).not.toContain('aria-label="Add Chapel use — common chapel, per day to cart"');
    expect(html).not.toContain('aria-label="Add Chapel use — private chapel, per day to cart"');
  });
});

describe("/products cards offer a real detail view", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ProductsPage());
  });

  it("links every model to its detail page and shows a sample photograph", () => {
    for (const model of CASKET_MODELS) {
      expect(html, `${model.model} details link`).toContain(casketDetailHref(model.model));
    }
    expect(html).toContain("View details");
    // Every card carries the sample photograph with its illustration chip.
    expect((html.match(/class="casket-sample__chip"/g) ?? []).length).toBe(
      CASKET_MODELS.length,
    );
    expect(html).toContain('alt="Illustrative sample coffin');
  });
});

describe("the casket detail view renders the model's own data", () => {
  const SKU = coffinSku("White Rose Full");
  let html: string;

  beforeAll(async () => {
    html = await renderDetail(SKU);
  });

  it("shows the catalogue name, collection, family and the cover its name states", () => {
    expect(html).toContain("White Rose Full casket");
    expect(html).toContain("The White Rose Collection");
    expect(html).toContain("White Rose family");
    expect(html).toContain(coffinCover("White Rose Full")!);
    // The catalogue SKU is published on the page as the code.
    expect(html).toContain(SKU);
  });

  it("publishes all four sheet prices and the senior conditions", () => {
    expect(html).toContain(php(68000));
    expect(html).toContain(php(13600));
    expect(html).toContain(php(54400));
    expect(html).toContain("Regular SRP");
    expect(html).toContain("Senior-citizen discounted price");
    expect(html).toContain("61–100");
  });

  it("renders the family's inclusion row with the chapel day rates", () => {
    const row = CASKET_INCLUSIONS.find((r) => r.family === "White Rose")!;
    expect(row).toBeTruthy();
    for (const label of ["Flowers", "Tarp", "Lapida", "Family car", "1 doz roses", "Thank you card"]) {
      expect(html, label).toContain(label);
    }
    expect(html).toContain("Included");
    expect(html).toContain(php(row.commonChapelPerDay));
    expect(html).toContain(php(row.privateChapelPerDay));
    expect(html).toContain("1,000");
  });

  it("keeps both real actions and the illustrative sample photograph", () => {
    expect(html).toContain('aria-label="Add White Rose Full casket to cart"');
    expect(html).toContain("Request order");
    const sample = casketSamplePhoto({ collection: "The White Rose Collection", model: "White Rose Full" });
    expect(html).toContain(sample.src);
    expect(html).toContain(sample.label);
    expect(html).toContain(COFFIN_TIER_NOTE);
    expect(html).toContain("Sample photograph");
    expect(html).toMatch(/alt="Illustrative sample coffin/);
    // The sheet's own sample strip keeps illustration-only wording too.
    for (const photo of COFFIN_SAMPLE_PHOTOS) {
      expect(html, photo.tier).toContain(photo.src);
    }
  });

  it("says plainly when a model's sheet name states no cover", async () => {
    const lumina = await renderDetail(coffinSku("Lumina"));
    expect(lumina).toContain(COFFIN_COVER_UNSTATED);
    expect(lumina).toContain("Lumina casket");
  });

  it("resolves each model from its SKU and rejects anything else", () => {
    for (const model of ["Lumina", "Royal Half", "Majesty Flexi"]) {
      expect(coffinModelForSku(coffinSku(model))?.model, model).toBe(model);
    }
    expect(coffinModelForSku(coffinSku("Noble Full Split"))?.collection).toBe(
      "The Crown Collection",
    );
    // Case-insensitive (URLs are typed by people) and total for junk.
    expect(coffinModelForSku(coffinSku("Royal Half").toLowerCase())?.model).toBe("Royal Half");
    expect(coffinModelForSku("CSK-NOT-A-MODEL")).toBeUndefined();
  });

  it("404s on a SKU the catalogue does not carry", async () => {
    await expect(renderDetail("CSK-NOT-A-MODEL")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("titles the page with the model and its 2026 price", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ sku: SKU }) });
    expect(meta.title).toContain("White Rose Full");
    expect(meta.title).toContain("2026 price");
  });
});
