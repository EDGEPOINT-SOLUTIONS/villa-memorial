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
  EMBALMING_RATES,
  coffinCover,
  php,
} from "@/lib/villa-pricing";
import {
  CHAPEL_COMMON_IMAGE,
  CHAPEL_PRIVATE_IMAGE,
  CHAPEL_SAMPLE_NOTE,
  COFFIN_SAMPLE_PHOTOS,
  DEATH_AT_HOME_IMAGE,
  DEATH_AT_HOSPITAL_IMAGE,
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

/**
 * The captain-approved 2026-09-16 services design (docs/08-delivery/services-design/).
 * The assertions below pin the same intent the premium pass pinned — three priced
 * sections, both actions per sellable line, the chapel photographs and their
 * illustrative labels, the senior column and the booking step (never a straight
 * chapel add) — against the approved DOM: .sv-section blocks, .sv-price-card
 * cards, .sv-chapel cards, .sv-stay rows and the sticky .sv-subnav anchors.
 */
describe("/services reads as the approved senior-first service page", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ServicesPage());
  });

  it("groups the 2026 rates into the three priced sections", () => {
    expect(html).toContain('id="services-rates-title"');
    expect(html).toContain("Services and prices");
    expect(html).toContain('id="embalming-title"');
    expect(html).toContain("Embalming — priced by the day");
    expect(html).toContain('id="chapel-title"');
    expect(html).toContain("Chapel — check the dates and book online");
    // Each block is an .sv-section (the senior-first section grammar).
    expect((html.match(/class="sv-section"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("renders one icon card per at-need service with both actions", () => {
    expect((html.match(/class="sv-price-card__icon"/g) ?? []).length).toBeGreaterThanOrEqual(
      ALACARTE_LINES.length,
    );
    for (const line of ALACARTE_LINES) {
      expect(html, line.service).toContain(line.service);
      expect(html, `${line.service} amount`).toContain(php(line.amount));
    }
    // The sheet's own bottom line stays published in its own band.
    expect(html).toContain('class="sv-total"');
    expect(html).toContain(php(19500));
    expect(html).toContain("send the whole set as one request");
  });

  it("gives the common and private chapel their own sample photograph", () => {
    expect(html).toContain(CHAPEL_COMMON_IMAGE);
    expect(html).toContain(CHAPEL_PRIVATE_IMAGE);
    expect((html.match(/class="sv-chapel"/g) ?? []).length).toBe(2);
    expect(html).toContain("Common chapel");
    expect(html).toContain("Private chapel");
    // The photographs carry descriptive alt text…
    expect(html).toContain("alt=\"Illustrative sample wake set-up in the client");
    expect(html).toContain("alt=\"Illustrative sample decorated viewing room in the client");
    // …and the sheet's illustration-only label, twice (one per room).
    expect((unescaped(html).match(new RegExp(escapeRe(CHAPEL_SAMPLE_NOTE), "g")) ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("labelled the two first-steps guide photographs as samples", () => {
    expect(html).toContain(DEATH_AT_HOME_IMAGE);
    expect(html).toContain(DEATH_AT_HOSPITAL_IMAGE);
    expect(html).toContain(VIEWING_CARE_IMAGE);
    expect(html).toContain("/services/death-at-home");
    expect(html).toContain("/services/death-at-hospital");
    expect(html).toMatch(/sample viewing set-up from the client/);
  });

  it("keeps both chapel rates and their senior column on the schedule", () => {
    expect(html).toContain("3 days — regular");
    expect(html).toContain("3 days — senior citizen");
    // Every 3–9 day stay publishes both columns in the .sv-stay rows.
    expect((html.match(/Senior citizen/g) ?? []).length).toBeGreaterThanOrEqual(
      CHAPEL_RATES.length * 2,
    );
    for (const r of CHAPEL_RATES) {
      expect(html, `common stay ${r.days}`).toContain(php(r.common.regular));
      expect(html, `common senior ${r.days}`).toContain(php(r.common.senior));
      expect(html, `private stay ${r.days}`).toContain(php(r.private.regular));
      expect(html, `private senior ${r.days}`).toContain(php(r.private.senior));
    }
  });

  it("opens the chapel booking step instead of a straight add (main's booking intent)", () => {
    // A chapel is never a one-click cart item: the cards' "Check dates & price"
    // and every 3–9 day row's "Book N days" open the booking dialog. The row's
    // accessible name carries the chapel its group heading carries visually.
    expect((html.match(/Check dates &amp; price/g) ?? []).length).toBe(2);
    for (const r of CHAPEL_RATES) {
      expect(html, `stay ${r.days}`).toContain(`Book ${r.days} days`);
      expect(html, `common aria ${r.days}`).toContain(
        `aria-label="Book ${r.days} days — Common chapel"`,
      );
      expect(html, `private aria ${r.days}`).toContain(
        `aria-label="Book ${r.days} days — Private chapel"`,
      );
    }
    expect((html.match(/aria-haspopup="dialog"/g) ?? []).length).toBeGreaterThanOrEqual(
      2 + CHAPEL_RATES.length * 2,
    );
    // No plain chapel add-to-cart survived the senior-first redesign.
    expect(html).not.toContain('aria-label="Add Chapel use — common chapel, per day to cart"');
    expect(html).not.toContain('aria-label="Add Chapel use — private chapel, per day to cart"');
  });

  it("makes the 12,000 px page navigable: anchors, back-to-top and a call bar", () => {
    expect(html).toContain('class="sv-subnav"');
    expect(html).toContain("On this page");
    for (const id of ["first-steps", "services", "embalming", "chapel", "sources"]) {
      expect(html, `anchor ${id}`).toContain(`href="#${id}"`);
    }
    expect(html).toContain('href="#top"');
    expect(html).toContain("Back to top");
    // The 24/7 call stays one thumb away and leads the page.
    expect(html).toContain('class="sv-call"');
    expect(html).toMatch(/href="tel:\+639170001234"/);
    expect(html).toContain('class="sv-callbar"');
  });

  it("prices embalming through the day picker and the full day rows", () => {
    expect(html).toContain("How many days will the viewing be open?");
    expect(html).toContain('class="sv-days"');
    for (const r of EMBALMING_RATES) {
      expect(html, `day button ${r.days}`).toContain(`>${r.days}</button>`);
      expect(html, `day row ${r.days}`).toContain(`${r.days} days`);
    }
    // The full sheet stays published behind the disclosure, one row per stay.
    expect(html).toContain('class="sv-stay"');
    expect(html).toMatch(/More than 9/);
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
