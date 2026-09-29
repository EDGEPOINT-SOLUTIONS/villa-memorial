import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import ContactPage from "@/app/(public)/contact/page";
import QuotePage from "@/app/(public)/quote/page";
import AppointmentsPage from "@/app/(public)/appointments/page";

/**
 * Route render contracts for the three public "Reach us" forms. These render
 * the exact page components the routes serve (client form included, through
 * react-dom/server like the landing-view tests) and pin:
 *  - the shared capture shell is present (numbered sections, grids, action bar);
 *  - every agreed field id exists;
 *  - the shell's label rule: no `*` and no `(optional)` strings in labels.
 */

const labelTexts = (html: string): string[] =>
  [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, " ").trim(),
  );

function expectSharedShell(html: string, submitLabel: string) {
  expect(html).toContain('class="card capture-section"');
  expect(html).toContain("capture-section__num");
  expect(html).toContain("field-grid");
  expect(html).toContain("capture-actions");
  expect(html).toContain(submitLabel);
  for (const label of labelTexts(html)) {
    expect(label).not.toContain("*");
    expect(label.toLowerCase()).not.toContain("optional");
  }
}

describe("contact route renders the shared capture shell", () => {
  it("carries every agreed field plus DPA consent", async () => {
    const html = renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve({}) }));
    expectSharedShell(html, "Send message");
    for (const id of ["ct-name", "ct-email", "ct-phone", "ct-message", "ct-consent"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("How can we help?");
    expect(html).toContain("Data Privacy Act consent");
    expect(html).toContain("check-row--consent");
    // A plain visit stays the general contact page — no request banner.
    expect(html).not.toContain("request-context");
  });

  it("renders a storefront request prefilled with exactly what was clicked", async () => {
    const params = {
      item: "White Rose Half casket",
      sku: "CSK-WHITE-ROSE-HALF",
      price: "₱62,000.00",
      note: "Senior-citizen price ₱49,600.00 (61–100, no insurance benefit).",
    };
    const html = renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve(params) }));
    expectSharedShell(html, "Send message");
    // The banner echoes the clicked facts…
    expect(html).toContain("request-context");
    expect(html).toContain("You are asking about");
    expect(html).toContain("White Rose Half casket");
    expect(html).toContain("CSK-WHITE-ROSE-HALF");
    expect(html).toContain("₱62,000.00");
    expect(html).toContain("Request an order");
    // …the message is pre-written with the same facts…
    expect(html).toContain("I would like to request an order for:");
    // …and nothing implies a reservation or a purchase.
    expect(html).toContain("does not reserve the item");
    expect(html).toContain("does not reserve the item or complete a");
  });
});

const quoteHtml = async (params: Record<string, string | string[]> = {}) =>
  renderToStaticMarkup(
    createElement(
      QuoteBasketProvider,
      null,
      await QuotePage({ searchParams: Promise.resolve(params) }),
    ),
  );

describe("quote route renders the shared capture shell", () => {
  it("carries every agreed field plus DPA consent and the service suggestions", async () => {
    const html = await quoteHtml();
    // The quote form is the basket's ADD STEP now (office, 2026-09-29), so its
    // submit says what it does rather than sending a single inquiry.
    expectSharedShell(html, "Add to my quote");
    for (const id of ["qr-name", "qr-email", "qr-phone", "qr-service", "qr-date", "qr-notes", "qr-consent"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Service you are asking about");
    expect(html).toContain("Preferred date");
    expect(html).toContain("Additional requirements");
    // The interest list is offered as suggestions, not a fixed select.
    expect(html).toContain("Memorial lot");
    expect(html).toContain("Wake / funeral package");
  });

  it("prefills the requested service from a Request-for-Quote link", async () => {
    const html = await quoteHtml({ item: "Embalming — 5 days", note: "A-la-carte service." });
    expect(html).toContain('name="service"');
    expect(html).toContain("Embalming — 5 days");
    expect(html).toContain("A-la-carte service.");
  });
});

describe("appointments route renders the shared capture shell", () => {
  it("carries every agreed field and the provisional reason/time lists", () => {
    const html = renderToStaticMarkup(AppointmentsPage());
    expectSharedShell(html, "Request appointment");
    for (const id of ["ap-name", "ap-email", "ap-phone", "ap-reason", "ap-date", "ap-time", "ap-notes"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Planning consultation (pre-need)");
    expect(html).toContain("Preferred date");
    expect(html).toContain("Preferred time");
    expect(html).toContain("10:00");
  });
});
