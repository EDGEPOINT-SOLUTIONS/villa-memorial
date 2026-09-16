import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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
  it("carries every agreed field plus DPA consent", () => {
    const html = renderToStaticMarkup(ContactPage());
    expectSharedShell(html, "Send message");
    for (const id of ["ct-name", "ct-email", "ct-phone", "ct-message", "ct-consent"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("How can we help?");
    expect(html).toContain("Data Privacy Act consent");
    expect(html).toContain("check-row--consent");
  });
});

describe("quote route renders the shared capture shell", () => {
  it("carries every agreed field plus DPA consent and the interest list", () => {
    const html = renderToStaticMarkup(QuotePage());
    expectSharedShell(html, "Request quote");
    for (const id of ["qr-name", "qr-email", "qr-phone", "qr-interest", "qr-notes", "qr-consent"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("I’m interested in");
    expect(html).toContain("Memorial lot");
    expect(html).toContain("Wake / funeral package");
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
