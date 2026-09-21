import { describe, expect, it, vi } from "vitest";
import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  listLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import { assertNoParagraphNesting } from "@/tests/helpers/paragraph-nesting";

/**
 * /immediate-assistance — checklist F-01 (captain, 2026-09-18): the hardest
 * moment gets its own screen. These tests pin the four things the brief asked
 * for, in order: the enormous `tel:` call read from the staff-editable landing
 * document (never typed here), the numbered "what to do right now" steps, the
 * one-line reassurance, and the clearly-secondary alternatives (where we are,
 * the contact form, the family sign-in). Honesty is pinned too: one number
 * only, no invented hours or street address.
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
  usePathname: () => "/immediate-assistance",
}));

const { default: ImmediateAssistancePage, metadata } = await import(
  "@/app/(public)/immediate-assistance/page"
);

/** React escapes apostrophes in server markup; compare against the plain text. */
function unescaped(html: string): string {
  return html.replace(/&#x27;|&#39;/g, "'");
}

describe("/immediate-assistance leads with the one call that matters", () => {
  it("renders one h1 and the enormous `tel:` link before anything else", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(await ImmediateAssistancePage());

    // One h1, and it is the plain human answer to the moment.
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain("Someone has died.");

    // The call target: the document's own href + display text, rendered as the
    // hero's enormous primary button, before the steps section.
    expect(html).toContain('class="public-hero__actions"');
    expect(html).toContain('class="btn btn--primary btn--lg"');
    expect(html).toContain(`href="${content.contact.phoneHref}"`);
    expect(unescaped(html)).toContain(content.contact.phoneDisplay);
    expect(html.indexOf('class="public-hero__actions"')).toBeLessThan(
      html.indexOf('class="ia-steps"'),
    );

    // The 24/7 label and location are printed from the same document.
    expect(html).toContain(content.contact.phoneLabel);
    expect(html).toContain(content.contact.location);

    // Exactly ONE phone number on the page — never a second invented line.
    const telLinks = [...html.matchAll(/href="(tel:[^"]+)"/g)].map((m) => m[1]);
    expect(telLinks.length).toBe(1);
    expect(telLinks[0]).toBe(content.contact.phoneHref);
  });

  it("a staff edit to the number reaches the page, and the recorded seed returns", async () => {
    const content = await listLandingContent();
    const edited: LandingContent = JSON.parse(JSON.stringify(content));
    edited.contact.phoneDisplay = "0999 111 2222";
    edited.contact.phoneHref = "tel:+639991112222";
    edited.contact.phoneLabel = "24/7 Help Line";
    edited.contact.location = "Lamitan City, Basilan";
    await saveLandingContent(edited);

    const html = renderToStaticMarkup(await ImmediateAssistancePage());
    expect(html).toContain("0999 111 2222");
    expect(html).toContain('href="tel:+639991112222"');
    expect(html).toContain("24/7 Help Line");
    expect(html).toContain("Lamitan City, Basilan");
    // The replaced facts are gone — the page is not a merge of old and new.
    expect(html).not.toContain(content.contact.phoneDisplay);
    expect(html).not.toContain(content.contact.phoneHref);

    // Restore the recorded seed for any later test in this file.
    await saveLandingContent(content);
  });
});

describe("/immediate-assistance answers in steps, not prose", () => {
  it("renders the four numbered steps with their short labels", async () => {
    const html = renderToStaticMarkup(await ImmediateAssistancePage());
    expect(html).toContain("What to do right now");
    expect(html).toContain('class="ia-steps__list"');
    expect((html.match(/class="ia-step"/g) ?? []).length).toBe(4);
    for (const heading of ["Call us", "Have these ready", "We come to you", "We handle the rest"]) {
      expect(html).toContain(`<h3>${heading}</h3>`);
    }
    // What to have ready is a chip list, not a sentence.
    expect(html).toContain('class="ia-ready"');
    for (const chip of [
      "Their full name",
      "Date of birth",
      "Where they are now",
      "Who decides for the family",
    ]) {
      expect(html).toContain(`<li>${chip}</li>`);
    }
  });

  it("keeps the reassurance line: the office handles it, nothing is decided tonight", async () => {
    const html = renderToStaticMarkup(await ImmediateAssistancePage());
    expect(html).toContain('class="ia-reassure"');
    const note = html.match(/<p class="ia-reassure">([\s\S]*?)<\/p>/)?.[1] ?? "";
    expect(unescaped(note)).toContain("Nothing needs deciding tonight");
    expect(unescaped(note)).toContain("coordinator");
  });

  it("renders the alternatives as secondary cards: where, the contact form, family sign-in", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(await ImmediateAssistancePage());
    expect(html).toContain("Other ways to reach us");
    expect((html.match(/class="ia-alt"/g) ?? []).length).toBe(3); // where · message · sign-in
    expect(html).toContain(`<span class="ia-alt__value">${content.contact.location}</span>`);
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Message the office");
    expect(html).toContain('href="/client/login"');
    expect(html).toContain("Family sign-in");
  });

  it("never invents office hours, a street address or a second number", async () => {
    const html = renderToStaticMarkup(await ImmediateAssistancePage());
    // No clock times like "9:00 AM" and no weekday schedule claims.
    expect(html).not.toMatch(/\b\d{1,2}(:\d{2})?\s?[AP]M\b/);
    expect(html).not.toMatch(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/);
    // No promise machinery (no chat, no bot, no callback).
    expect(html.toLowerCase()).not.toContain("chat");
    expect(html.toLowerCase()).not.toContain("callback");
  });

  it("renders clean paragraph nesting (no <p> inside <p>)", async () => {
    assertNoParagraphNesting(
      renderToStaticMarkup(await ImmediateAssistancePage()),
      "/immediate-assistance",
    );
  });
});

describe("/immediate-assistance carries its own SEO metadata", () => {
  it("canonicalises to the page's own path", () => {
    expect(metadata.alternates?.canonical).toMatch(/\/immediate-assistance$/);
    expect(metadata.openGraph?.url).toMatch(/\/immediate-assistance$/);
  });
});
