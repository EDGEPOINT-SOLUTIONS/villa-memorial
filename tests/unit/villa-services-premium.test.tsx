import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import {
  listLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import {
  ALACARTE_LINES,
  casketDetailHref,
  coffinModelForSku,
  coffinSku,
} from "@/lib/catalogue-skus";
import {
  CASKET_MODELS,
  CHAPEL_RATES,
  EMBALMING_RATES,
  php,
} from "@/lib/villa-pricing";
import {
  CHAPEL_SAMPLE_NOTE,
  casketSamplePhoto,
} from "@/lib/media";
import { clientPhotoCard, clientPhotoWide } from "@/lib/client-photos";
import { listChapelRecords } from "@/lib/api-client/chapel-store";
import type { ChapelClass } from "@/lib/chapel-booking";

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
  const chapelName: Partial<Record<ChapelClass, string>> = {};

  beforeAll(async () => {
    html = await renderWithCart(await ServicesPage());
    for (const record of await listChapelRecords()) {
      chapelName[record.chapel_class] ??= record.name;
    }
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
    // 2026-09-19: each class shows the client's own 2026 photograph — the hall
    // for the common chapel, a decorated viewing room for the private one.
    expect(html).toContain(clientPhotoWide("chapel-hall-candle-pedestals").src);
    expect(html).toContain(clientPhotoWide("wake-setup-lamp-alcove").src);
    expect((html.match(/class="sv-chapel"/g) ?? []).length).toBe(2);
    expect(html).toContain("Common chapel");
    expect(html).toContain("Private chapel");
    // The photographs carry descriptive alt text…
    expect(html).toContain("alt=\"The chapel hall in the client");
    expect(html).toContain("alt=\"A decorated private viewing room in the client");
    // …and the sheet's illustration-only label, twice (one per room).
    expect((unescaped(html).match(new RegExp(escapeRe(CHAPEL_SAMPLE_NOTE), "g")) ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("keeps the embalming aside and drops the guide section (captain 2026-09-21)", () => {
    // The embalming aside shows the client's own finished set-up in flowers,
    // which replaced a 297 KB stock JPEG rendered at 350 px (imagery pass).
    expect(html).toContain(clientPhotoWide("wake-setup-flower-bank").src);
    // The three guide pages stay as service entries at their own routes, but
    // the "Guides for what comes next" section left /services.
    expect(html).not.toContain('id="guides"');
    expect(html).not.toContain("Guides for what comes next");
    expect(html).not.toContain("/services/death-at-home");
    expect(html).not.toContain("/services/death-at-hospital");
    // Both prepared set-ups say what they are.
    expect(html).toContain("A wake set-up the office prepared — illustration purposes only.");
  });

  it("keeps the chapel cards' per-day rate and 3-day columns", () => {
    // Each card keeps the sheet's per-day rate and its 3-day regular/senior
    // example; the full 3–9 day "See every stay" schedule left the section
    // (captain 2026-09-21).
    expect(html).toContain("3 days — regular");
    expect(html).toContain("3 days — senior citizen");
    const threeDay = CHAPEL_RATES[0];
    expect(html).toContain(php(threeDay.common.regular));
    expect(html).toContain(php(threeDay.common.senior));
    expect(html).toContain(php(threeDay.private.regular));
    expect(html).toContain(php(threeDay.private.senior));
    // The removed schedule and its senior-rate footnote are gone.
    expect(html).not.toContain('id="chapel-stays"');
    expect(html).not.toContain("See every stay");
  });

  it("opens the chapel booking step instead of a straight add (main's booking intent)", () => {
    // A chapel is never a one-click cart item: each card's "Check dates & price"
    // opens the booking dialog, whose accessible name carries the chapel's OWN
    // name (its staff-editable record) the dialog reads.
    expect((html.match(/Check dates &amp; price/g) ?? []).length).toBe(2);
    expect((html.match(/aria-haspopup="dialog"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // No plain chapel add-to-cart survived the senior-first redesign.
    expect(html).not.toContain('aria-label="Add to cart: Chapel use — common chapel, per day"');
    expect(html).not.toContain('aria-label="Add to cart: Chapel use — private chapel, per day"');
    // The card reads the park's own chapel record for its name and capacity.
    expect(html).toContain(chapelName.common);
    expect(html).toContain(chapelName.private);
  });

  it("leads with one hero and a call bar — no subnav or steps (captain 2026-09-21)", () => {
    // One hero, then straight to the services: the pre-migration sticky subnav
    // and the "what happens after you call" steps are gone.
    expect(html).not.toContain('class="sv-subnav"');
    expect(html).not.toContain('id="first-steps"');
    expect(html).toContain('class="sv-hero__actions"');
    expect(html).toContain('href="#services"');
    // The 24/7 call stays one thumb away — the client's own line (2026 purchase
    // application form), read from the seeded content document.
    expect(html).toContain('class="sv-callbar"');
    expect(html).toMatch(/href="tel:\+639176178489"/);
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
    // 2026-09-19: every model carries its OWN photograph (the client's own set),
    // not one collection picture reprinted on twenty-four cards. The mapping is
    // the recorded rule in lib/media.ts; this pins that the page really renders
    // each model's chosen file.
    for (const model of CASKET_MODELS) {
      const photo = casketSamplePhoto(model);
      expect(html, `${model.model} photograph`).toContain(clientPhotoCard(photo.id).src);
    }
    // The card's photograph is a sample and says so the honest way: the caption
    // under the picture carries the record's own label. The picture's own link is
    // aria-hidden (the titled link below is the one a screen reader uses), so the
    // alt is empty BY DESIGN — the description a reader gets is the caption,
    // which is real text on the page. The redundant "Sample photograph" badge is
    // gone (captain 2026-09-21).
    expect(html).not.toContain("Sample photograph");
    for (const model of CASKET_MODELS) {
      const chosen = casketSamplePhoto(model);
      expect(html, `${model.model} caption`).toContain(chosen.label);
    }
  });

  it("keeps every model's own 2026 figures on the catalogue it prints", () => {
    // The rows ARE the catalogue now, so the composition may not have cost a
    // single published figure: each model keeps its SRP, the senior discount and
    // the senior-citizen discounted price beside its own name.
    for (const model of CASKET_MODELS) {
      expect(html, `${model.model} srp`).toContain(php(model.srp));
      expect(html, `${model.model} senior discount`).toContain(php(model.seniorDiscount));
      expect(html, `${model.model} senior price`).toContain(php(model.seniorPrice));
    }
  });
});

describe("the casket detail view renders the model's own data", () => {
  const SKU = coffinSku("White Rose Full");
  let html: string;

  beforeAll(async () => {
    html = await renderDetail(SKU);
  });

  it("leads with the catalogue name, its collection and the live 2026 price", () => {
    expect(html).toContain("White Rose Full casket");
    expect(html).toContain("The White Rose Collection");
    expect(html).toContain('<div class="detail-sticky__price">₱68,000.00</div>');
    expect(html).toContain("Published 2026 price");
    // The model's own senior figures stay published beside the live price.
    expect(html).toContain(php(54400));
    expect(html).toContain("61–100");
  });

  it("renders the Amazon structure: sticky gallery, buy box and below-fold content", () => {
    expect(html).toContain("pdp-layout");
    expect(html).toContain("pdp-media");
    expect(html).toContain("pdp-buy");
    expect(html).toContain("pdp-below");
    // The buy box carries the variant selector and the one primary action.
    expect(html).toContain("Choose a model");
    expect(html).toContain("Add to cart");
  });

  it("keeps both real actions and the illustrative sample photograph", () => {
    expect(html).toContain('aria-label="Add to cart: White Rose Full casket"');
    expect(html).toContain("Request order");
    const sample = casketSamplePhoto({ collection: "The White Rose Collection", model: "White Rose Full" });
    // The detail figure takes the FEATURE (3:2) crop of the model's chosen
    // photograph; the catalogue rows take the 4:3 card crop.
    expect(html).toContain(clientPhotoWide(sample.id).src);
    expect(html).toContain(sample.label);
    expect(html).toContain("Illustration purposes only.");
    expect(html).toMatch(/alt="Illustrative sample coffin/);
  });

  it("has retired the legacy bespoke blocks and both rows", () => {
    for (const gone of [
      "This model at a glance",
      "What comes with this model",
      "How the five tiers are shown",
      "Related pages",
      "Regular SRP",
      "Senior-citizen discounted price",
    ]) {
      expect(html, gone).not.toContain(gone);
    }
    expect(html).not.toContain("casket-sample-strip");
    expect(html).not.toContain("casket-facts");
    expect(html).not.toContain("casket-inclusions");
    expect(html).not.toContain("All coffins &amp; caskets");
  });

  it("renders a model whose sheet name states no cover without inventing one", async () => {
    const lumina = await renderDetail(coffinSku("Lumina"));
    expect(lumina).toContain("Lumina casket");
    expect(lumina).toContain(php(33000));
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

/**
 * The 24/7 phone number is STAFF-EDITABLE (landing content, zone 01 'Brand &
 * 24/7 line': Phone label / Phone number shown / Call link). /services must
 * read it from the same document the site header reads — a number typed into
 * this page is the defect these tests exist to catch.
 */
describe("/services reads the 24/7 line from the landing content document", () => {
  it("renders the document's display text and href in every call action", async () => {
    const content = await listLandingContent();
    const html = await renderWithCart(await ServicesPage());

    const telLinks = [
      ...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
    ].filter((m) => m[1].startsWith("tel:"));
    // Hero call panel, embalming helper, help band and the phone call bar.
    expect(telLinks.length).toBeGreaterThanOrEqual(4);
    for (const [, href] of telLinks) {
      expect(href).toBe(content.contact.phoneHref);
    }
    for (const [, , inner] of telLinks) {
      expect(unescaped(inner)).toContain(content.contact.phoneDisplay);
    }
  });

  it("a staff edit to the number reaches the page, and the recorded seed returns", async () => {
    const content = await listLandingContent();
    const edited: LandingContent = JSON.parse(JSON.stringify(content));
    edited.contact.phoneDisplay = "0999 111 2222";
    edited.contact.phoneHref = "tel:+639991112222";
    await saveLandingContent(edited);

    const html = await renderWithCart(await ServicesPage());
    expect(html).toContain("0999 111 2222");
    expect(html).toContain('href="tel:+639991112222"');
    // The replaced number is gone — the page is not a merge of old and new.
    expect(html).not.toContain(content.contact.phoneDisplay);
    expect(html).not.toContain(content.contact.phoneHref);

    // Restore the recorded seed for any later test in this file.
    await saveLandingContent(content);
  });
});
