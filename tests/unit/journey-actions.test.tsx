import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import {
  listLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import { NextSteps } from "@/components/landing/next-steps";
import { LandingFooter, LandingView } from "@/components/landing/landing-view";
import { PublicShell } from "@/components/ui/public-shell";
import { LOT_PRICE_CATEGORIES, SENIOR_PAYMENTS, VMP_PAYMENTS } from "@/lib/villa-pricing";

/**
 * F-17 — the journey fixes (captain, 2026-09-18): the closing action layer and
 * the contact surface.
 *
 * What these tests protect:
 *  · every public surface ends on the SAME three next steps — call the office,
 *    ask a question, start the arrangement — with the office-assisted route
 *    leading, because that is how Villa actually sells;
 *  · the 24/7 number in that band is always the staff-editable document's own
 *    number and a real `tel:` link with a "Call …" label — never a bare number
 *    and never a typed-in value (the template placeholder 0917 123 4567 died
 *    here);
 *  · the contact surface states the office's published facts — both hotlines
 *    from the client's own letterhead, both addresses, the 24/7 availability —
 *    before the form, so a caller never has to scroll or hunt;
 *  · /immediate-assistance keeps its own call-first contract (F-01) and is the
 *    one page that does NOT get the band.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

// usePathname drives PublicShell's one exemption (the assistance screen); the
// value is mutable per test through vi.hoisted.
const nav = vi.hoisted(() => ({ pathname: "/plans" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

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

const clone = (doc: LandingContent): LandingContent =>
  JSON.parse(JSON.stringify(doc)) as LandingContent;

/** Render the shell around a trivial page body (interior-page path). */
function shell(content: LandingContent, body = "page body"): string {
  return renderToStaticMarkup(
    <PublicShell content={content}>
      <p>{body}</p>
    </PublicShell>,
  );
}

describe("the closing action band offers the same three next steps everywhere", () => {
  it("leads with the document's own call, then the question path, then the arrangement", async () => {
    const { contact } = await listLandingContent();
    const html = renderToStaticMarkup(createElement(NextSteps, { contact }));

    expect(html).toContain('class="next-steps"');
    // The call: a real tel: link, with a readable "Call …" label (never bare).
    expect(html).toContain(`href="${contact.phoneHref}"`);
    expect(html).toContain(`Call ${contact.phoneDisplay}`);
    expect(html).toContain(contact.phoneLabel);
    // The other two doors.
    expect(html).toContain('href="/contact">Ask a question</a>');
    expect(html).toContain('href="/builder">Start the arrangement</a>');
    // One heading for the band; the section is labelled by it.
    expect((html.match(/<h2\b/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-labelledby="next-steps-title"');
  });

  it("a staff edit to the number reaches the band — the band never types one", async () => {
    const seed = await listLandingContent();
    const edited = clone(seed);
    edited.contact.phoneDisplay = "0999 111 2222";
    edited.contact.phoneHref = "tel:+639991112222";
    edited.contact.phoneLabel = "24/7 Help Line";
    await saveLandingContent(edited);

    const html = renderToStaticMarkup(createElement(NextSteps, { contact: edited.contact }));
    expect(html).toContain("Call 0999 111 2222");
    expect(html).toContain("24/7 Help Line");
    expect(html).not.toContain(seed.contact.phoneDisplay);

    await saveLandingContent(seed);
  });
});

describe("every public surface ends on the closing band", () => {
  it("PublicShell renders it after the page body and before the footer", async () => {
    nav.pathname = "/plans";
    const html = shell(await listLandingContent());
    expect(html).toContain("page body");
    expect(html).toContain('class="next-steps"');
    expect(html.indexOf("page body")).toBeLessThan(html.indexOf('class="next-steps"'));
    expect(html.indexOf('class="next-steps"')).toBeLessThan(html.indexOf('class="anchored-footer"'));
  });

  it("the home renders the same band between the rails and the footer", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      createElement(LandingView, {
        content,
        planPricing: { regular: VMP_PAYMENTS, senior: SENIOR_PAYMENTS },
        lotCategories: LOT_PRICE_CATEGORIES,
        mapNode: null,
      }),
    );
    expect(html).toContain('class="next-steps"');
    expect(html.indexOf('class="anchored-grid"')).toBeLessThan(html.indexOf('class="next-steps"'));
    expect(html.indexOf('class="next-steps"')).toBeLessThan(html.indexOf('class="anchored-footer"'));
    expect(html).toContain(`Call ${content.contact.phoneDisplay}`);
  });

  it("leaves /immediate-assistance to its own call-first order (F-01)", async () => {
    nav.pathname = "/immediate-assistance";
    const html = shell(await listLandingContent());
    expect(html).not.toContain('class="next-steps"');
    // …while any other path gets it.
    nav.pathname = "/services";
    expect(shell(await listLandingContent())).toContain('class="next-steps"');
    nav.pathname = "/plans";
  });
});

describe("the contact surface states the office's published facts before the form", () => {
  it("renders both hotlines as labelled tel: links, both addresses and the form doors", async () => {
    const { default: ContactPage } = await import("@/app/(public)/contact/page");
    const { contact } = await listLandingContent();
    const html = renderToStaticMarkup(createElement(CartProvider, null, await ContactPage({
      searchParams: Promise.resolve({}),
    })));

    // 24/7 line: primary call button, document-driven.
    expect(html).toContain(`href="${contact.phoneHref}"`);
    expect(html).toContain(`Call ${contact.phoneDisplay}`);
    expect(html).toContain(contact.phoneLabel);
    // Second published line: readable label + call link, never a bare number.
    expect(html).toContain("Second line");
    expect(html).toContain(`href="${contact.secondPhoneHref}"`);
    expect(html).toContain(`Call ${contact.secondPhoneDisplay}`);
    // The client's letterhead addresses.
    expect(html).toContain(contact.officeAddress);
    expect(html).toContain(contact.parkAddress);
    // The paths to the other capture forms.
    expect(html).toContain('href="/quote"');
    expect(html).toContain('href="/appointments"');
    // One h1 on the route. The message form now comes FIRST and the published
    // facts close the page — captain, 2026-09-27: "put this at the last section".
    // The assertion was the other way round (F-17: "a caller never has to scroll
    // for the phone"); it is inverted rather than deleted, because the order is
    // still a decision and a removed assertion cannot guard it.
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html.indexOf("contact-message")).toBeLessThan(html.indexOf("contact-facts"));
    // …and the directions card is the LAST band, after the facts. Its marker is
    // `data-location-block`, which the component owns (there is no
    // `contact-locations` id — an assertion on one would have passed for the
    // wrong reason, or not at all).
    expect(html.indexOf("contact-facts")).toBeLessThan(html.indexOf("data-location-block"));
  });

  it("a staff edit reaches the contact surface and the footer", async () => {
    const seed = await listLandingContent();
    const edited = clone(seed);
    edited.contact.secondPhoneDisplay = "0999 333 4444";
    edited.contact.secondPhoneHref = "tel:+639993334444";
    edited.contact.officeAddress = "New office address, Isabela City, Basilan";
    await saveLandingContent(edited);

    const { default: ContactPage } = await import("@/app/(public)/contact/page");
    const html = renderToStaticMarkup(createElement(CartProvider, null, await ContactPage({
      searchParams: Promise.resolve({}),
    })));
    expect(html).toContain("Call 0999 333 4444");
    expect(html).toContain("New office address, Isabela City, Basilan");
    expect(html).not.toContain(seed.contact.secondPhoneDisplay);

    const footer = renderToStaticMarkup(createElement(LandingFooter, { content: edited }));
    expect(footer).toContain("Call 0999 333 4444");

    await saveLandingContent(seed);
  });

  it("hides the second line when staff clear both halves", async () => {
    const seed = await listLandingContent();
    const cleared = clone(seed);
    cleared.contact.secondPhoneDisplay = "";
    cleared.contact.secondPhoneHref = "";
    await saveLandingContent(cleared);

    const { default: ContactPage } = await import("@/app/(public)/contact/page");
    const html = renderToStaticMarkup(createElement(CartProvider, null, await ContactPage({
      searchParams: Promise.resolve({}),
    })));
    expect(html).not.toContain("Second line");

    await saveLandingContent(seed);
  });
});

describe("the detail pages' advisor cards carry the real, staff-editable line", () => {
  it("/plans/[sku] and /products/[sku] never publish a placeholder number", async () => {
    const { default: PlanDetailPage } = await import("@/app/(public)/plans/[sku]/page");
    const { default: CasketDetailPage } = await import("@/app/(public)/products/[sku]/page");
    const { contact } = await listLandingContent();

    const planHtml = renderToStaticMarkup(
      createElement(CartProvider, null, await PlanDetailPage({ params: Promise.resolve({ sku: "PKG-PREMIUM" }) })),
    );
    const casketHtml = renderToStaticMarkup(
      createElement(CartProvider, null, await CasketDetailPage({ params: Promise.resolve({ sku: "CSK-LUMINA" }) })),
    );

    for (const html of [planHtml, casketHtml]) {
      expect(html).not.toContain("0917 123 4567");
      expect(html).toContain("Talk to our memorial care advisor");
      expect(html).toContain(`class="plan-advisor__phone" href="${contact.phoneHref}"`);
      expect(html).toContain(`Call ${contact.phoneDisplay}`);
      expect(html).toContain(contact.phoneLabel);
    }
  });
});

describe("no placeholder contact detail survives on the public surface", () => {
  const PLACEHOLDER = /0917\s*123\s*4567|0917\s*000\s*1234/;

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const entry = path.join(dir, name);
      if (statSync(entry).isDirectory()) {
        out.push(...sourceFiles(entry));
        continue;
      }
      if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(entry);
    }
    return out;
  }

  it("scans the public routes and their components for the template number", () => {
    const offenders: string[] = [];
    const roots = ["app/(public)", "components/landing", "components/villa"];
    for (const root of roots) {
      for (const file of sourceFiles(path.join(ROOT, root))) {
        const source = readFileSync(file, "utf8");
        if (PLACEHOLDER.test(source)) offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
