import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
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
  SERVICE_SAMPLE_NOTE,
  casketSamplePhoto,
} from "@/lib/media";
import { clientPhotoCard, clientPhotoWide } from "@/lib/client-photos";
import { listChapelRecords } from "@/lib/api-client/chapel-store";
import type { ChapelClass } from "@/lib/chapel-booking";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


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
  return renderToStaticMarkup(withBaskets( page));
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
describe("/services is a Request-for-Quote page, not a price list", () => {
  let html: string;
  const chapelName: Partial<Record<ChapelClass, string>> = {};

  beforeAll(async () => {
    html = await renderWithCart(await ServicesPage());
    for (const record of await listChapelRecords()) {
      chapelName[record.chapel_class] ??= record.name;
    }
  });

  it("groups the services into the three quote sections", () => {
    expect(html).toContain('id="services-rates-title"');
    expect(html).toContain("Services we provide");
    expect(html).toContain('id="embalming-title"');
    expect(html).toContain("Embalming — quoted by the day");
    expect(html).toContain('id="chapel-title"');
    expect(html).toContain("Chapel — ask us for dates and a quote");
    // Each block is a .story-band (the story-lane section grammar).
    expect((html.match(/class="story-band"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("renders one icon card per at-need service, each requesting a quote", () => {
    // The five lines became picture-first boxes on 2026-09-27 ("more graphics …
    // use boxes"), so the icon lives on the card rather than on a ledger row. The
    // assertion's intent is unchanged: one icon per service, and every service
    // named.
    expect((html.match(/class="sv-card__icon"/g) ?? []).length).toBeGreaterThanOrEqual(
      ALACARTE_LINES.length,
    );
    for (const line of ALACARTE_LINES) {
      expect(html, line.service).toContain(line.service);
      // Request-for-Quote retired every amount (captain 2026-09-21 item 5).
      expect(html, `${line.service} amount`).not.toContain(php(line.amount));
    }
    expect(html).not.toContain('class="story-total"');
    expect(html).not.toContain(php(19500));
    expect(html).not.toContain("send the whole set as one request");
    expect(html).toContain("Add all five to Quote");
  });

  it("gives the common and private chapel their own sample photograph", () => {
    // 2026-09-19: each class shows the client's own 2026 photograph — the hall
    // for the common chapel, a decorated viewing room for the private one.
    expect(html).toContain(clientPhotoWide("chapel-hall-candle-pedestals").src);
    expect(html).toContain(clientPhotoWide("wake-setup-lamp-alcove").src);
    expect((html.match(/class="story-chapel"/g) ?? []).length).toBe(2);
    expect(html).toContain("Common chapel");
    expect(html).toContain("Private chapel");
    // The photographs carry descriptive alt text…
    expect(html).toContain("alt=\"The chapel hall in the client");
    expect(html).toContain("alt=\"A decorated private viewing room in the client");
    // …and the sheet's illustration-only label, twice (one per room).
    expect((unescaped(html).match(new RegExp(escapeRe(CHAPEL_SAMPLE_NOTE), "g")) ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("keeps the hero's sample label and drops the guide section (captain 2026-09-21)", () => {
    // The hero photograph is one of the client's own wake set-ups and is
    // published under the sheet's sample discipline (lib/client-photos.ts marks
    // it `illustration-only`), so the label must stay beside it.
    expect(html).toContain(clientPhotoWide("wake-setup-casket-draped").src);
    expect(html).toContain(SERVICE_SAMPLE_NOTE);
    // The three guide pages stay as service entries at their own routes, but
    // the "Guides for what comes next" section left /services.
    expect(html).not.toContain('id="guides"');
    expect(html).not.toContain("Guides for what comes next");
    expect(html).not.toContain("/services/death-at-home");
    expect(html).not.toContain("/services/death-at-hospital");
  });

  it("removes the chapel rates and the booking step from the page", () => {
    // Request-for-Quote (captain 2026-09-21 item 5): the per-day rate, the 3-day
    // regular/senior examples and the booking dialog's figures all left the page.
    expect(html).not.toContain(php(CHAPEL_RATES[0].common.ratePerDay));
    expect(html).not.toContain(php(CHAPEL_RATES[0].private.ratePerDay));
    expect(html).not.toContain("3 days — regular");
    expect(html).not.toContain("3 days — senior citizen");
    expect(html).not.toContain("Check dates &amp; price");
    expect(html).not.toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("Add to cart");
    // The card reads the park's own chapel record for its name and capacity.
    expect(html).toContain(chapelName.common);
    expect(html).toContain(chapelName.private);
    expect(html).toContain("Add to Quote");
  });

  it("leads with one hero and a call bar — no subnav or steps (captain 2026-09-21)", () => {
    // One hero, then straight to the services: the pre-migration sticky subnav
    // and the "what happens after you call" steps are gone.
    expect(html).not.toContain('class="sv-subnav"');
    expect(html).not.toContain('id="first-steps"');
    expect(html).toContain('class="public-hero__actions"');
    // The hero's supporting action opens the quote form.
    expect(html).toContain('href="/quote?');
    // The 24/7 call stays one thumb away — the client's own line (2026 purchase
    // application form), read from the seeded content document, and it is the
    // hero's one page-commitment rung.
    expect(html).toContain('class="btn btn--primary btn--lg"');
    expect(html).toMatch(/href="tel:\+639176178489"/);
  });

  it("keeps the embalming day picker and the full day ladder, without amounts", () => {
    expect(html).toContain("How many days will the viewing be open?");
    expect(html).toContain('class="sv-days"');
    for (const r of EMBALMING_RATES) {
      expect(html, `day button ${r.days}`).toContain(`>${r.days}</button>`);
      expect(html, `day row ${r.days}`).toContain(`${r.days} days`);
      expect(html, `day amount ${r.days}`).not.toContain(php(r.amount));
    }
    // The full ladder stays published behind the disclosure, one row per stay.
    expect(html).toContain('class="sv-stay"');
    expect(html).toMatch(/More than 9/);
  });
});

describe("/products cards offer a real detail view", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ProductsPage({ searchParams: Promise.resolve({}) }));
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
    // The hero call, the embalming helper and the closing help band.
    expect(telLinks.length).toBeGreaterThanOrEqual(3);
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
