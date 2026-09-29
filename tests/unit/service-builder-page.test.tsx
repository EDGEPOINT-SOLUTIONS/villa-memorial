import { describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { listLandingContent } from "@/lib/api-client/landing";
import { assertNoParagraphNesting } from "@/tests/helpers/paragraph-nesting";
import { measureProse, textOf } from "@/tests/helpers/prose";

/**
 * The rendered Smart Service Builder (`/builder`, F-05).
 *
 * The rules are pinned by tests/unit/service-builder.test.ts and the reading
 * budget by tests/unit/reading-budget.test.tsx; this file pins what a visitor
 * actually SEES: the 2026 sheet figures published (both of a model's columns),
 * the estimate that says outright it is not a quotation, the office's own
 * number, the existing request path — and the honest states, where an item the
 * sheets do not price is named as the office's to arrange instead of being given
 * a figure.
 *
 * Rendered through react-dom/server like the rest of the repo's page tests (no
 * DOM environment exists here); the interactive flow itself is verified in the
 * browser (1440px and 390px evidence in the PR).
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
  usePathname: () => "/builder",
}));

const { default: BuilderPage } = await import("@/app/(public)/builder/page");

async function renderBuilder(): Promise<string> {
  return renderToStaticMarkup(await BuilderPage());
}

describe("the builder publishes the client's 2026 figures", () => {
  it("shows the casket catalogue with both columns the sheet prints", async () => {
    const html = await renderBuilder();
    // The 24 models, in the sheet's order — ends to end.
    expect(html).toContain("Lumina");
    expect(html).toContain("Imperial Flexi");
    expect(html.match(/<option value="[^"]+" >|/g)).toBeTruthy();
    // The sheet's two columns for one model: White Rose Half ₱62,000 / senior ₱49,600.
    expect(html).toContain("₱62,000.00");
    expect(html).toContain("₱49,600.00");
  });

  it("shows the preparation ladder, the a-la-carte fees and the chapel schedule", async () => {
    const html = await renderBuilder();
    expect(html).toContain("₱6,000.00"); // 3 days' preparation
    expect(html).toContain("₱15,000.00"); // 9 days'
    expect(html).toContain("₱1,500.00 / day"); // the extra-day line
    for (const fee of ["Retrieval", "Delivery", "Viewing equipment", "ORD coffin", "Interment"]) {
      expect(html, fee).toContain(fee);
    }
    expect(html).toContain("₱2,500.00");
    expect(html).toContain("₱4,500.00");
    expect(html).toContain("Common chapel");
    expect(html).toContain("Private chapel");
    expect(html).toContain("₱1,500.00");
    expect(html).toContain("₱3,500.00");
  });

  it("shows the plan's five tiers and keeps its amount off the one-time total", async () => {
    const html = await renderBuilder();
    for (const tier of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(html, tier).toContain(tier);
    }
    // The amount appears once a tier is chosen (unit-pinned in
    // tests/unit/service-builder.test.ts); the screen states the separation now.
    expect(html).toContain("Choose a tier to see the amount.");
    expect(html).toContain("not counted in the total");
  });
});

describe("the builder is an estimate, and says so", () => {
  it("prints the office-confirms line beside the total", async () => {
    const html = await renderBuilder();
    expect(html).toContain("An estimate — the office confirms the final figures.");
    expect(html).toContain("Nothing here is reserved or ordered.");
  });

  it("keeps the one-time total separate from the plan's instalments", async () => {
    const html = await renderBuilder();
    const estimate = html.slice(html.indexOf('class="card sb-estimate"'));
    // The total is labelled as one-time items, and the panel names the plan's
    // separate treatment (the plan step's own note says the same).
    expect(estimate).toContain("One-time items");
    expect(html).toContain("paid in instalments");
  });

  it("has one h1 and answers in one short sentence", async () => {
    const html = await renderBuilder();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    const lead = html.match(/<p class="public-hero__lead">([\s\S]*?)<\/p>/);
    expect(lead).toBeTruthy();
    expect(textOf(lead![1])).toBe(
      "What you already have, what you need, and the running total.",
    );
  });
});

describe("the builder ends in the office's hands", () => {
  it("reads the 24/7 number from the staff-editable content, never a typed one", async () => {
    const { contact } = await listLandingContent();
    const html = await renderBuilder();
    expect(html).toContain(`href="${contact.phoneHref}"`);
    expect(html).toContain(contact.phoneDisplay);
  });

  it("hands the arrangement over through the existing request path", async () => {
    const html = await renderBuilder();
    expect(html).toContain("/contact?item=Smart+Service+Builder+estimate");
    expect(html).toContain("Send this arrangement to the office");
  });

  it("does not offer a cart action — the office confirms the arrangement", async () => {
    const html = await renderBuilder();
    expect(html).not.toContain("Add to quote");
  });
});

describe("the builder's honest states", () => {
  it("never prints a figure for something the 2026 sheets do not price", async () => {
    const html = await renderBuilder();
    // The four withdrawn catalogue items are named as the office's to arrange...
    expect(html).toContain("Lights &amp; Sound Setup");
    expect(html).toContain("Keepsake Urn");
    expect(html).toContain("ask for a price");
    // ...and their SKUs and placeholder prices are nowhere in the markup.
    for (const sku of ["SRV-LIGHTS", "ADD-URN", "ADD-FLOWERS", "ADD-COFFIN-LIZO-SR"]) {
      expect(html, sku).not.toContain(sku);
    }
    expect(html).not.toContain("850.00"); // the withdrawn Lizo upgrade's old placeholder
    expect(html).not.toContain("180.00"); // the withdrawn urn's
  });

  it("names the burial lot as an office quotation instead of pricing it per plot", async () => {
    const html = await renderBuilder();
    expect(html).toContain("Burial lot — the office quotes it per plot");
    // The lot sheet's family tables are per-plot questions and are not the
    // builder's to publish — no lot family and no lot figure appears.
    for (const family of ["Prime Lots", "Premium Lots", "Condo-type", "Garden Niches", "Mausoleum"]) {
      expect(html, family).not.toContain(family);
    }
  });

  it("says a step with no answer yet has no figure", async () => {
    const html = await renderBuilder();
    expect(html).toContain("Still to choose: Casket · Preparation days · Chapel");
    expect(html).toContain("Nothing chosen yet");
    // A running total of zero is printed as zero — never as a placeholder price.
    expect(html).toContain("₱0.00");
  });

  it("keeps the copy inside the reading budget the page joined", async () => {
    const stats = measureProse(await renderBuilder());
    expect(stats.paragraphWords).toBeLessThanOrEqual(300);
    expect(stats.longest.words).toBeLessThanOrEqual(30);
    expect(stats.listItems.longestWords).toBeLessThanOrEqual(30);
  });

  it("never nests a <p> inside another <p> (the family-dashboard hydration class)", async () => {
    assertNoParagraphNesting(await renderBuilder(), "/builder");
  });
});
