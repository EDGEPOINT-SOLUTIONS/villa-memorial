import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readPageDocument, validatePageDocument, type ContentValidationContext } from "@/lib/content-catalog";
import { hasEditorialContent } from "@/components/content/login-editorial";
import LoginPage from "@/app/login/page";

/**
 * The sign-in page's editorial panel (captain, 2026-09-30).
 *
 * The panel is the LEFT half of `/login` and carries the office's own words —
 * the greeting and the news, promotions, events and member invitations it
 * publishes in Pages & content (the `login` page document). These tests pin:
 *   1. the panel renders every field it is given, and nothing typed in code;
 *   2. an empty or unreadable document leaves the CLASSIC centred card (no hole);
 *   3. the sign-in behaviour (the form and its destination) is unchanged;
 *   4. the `notice` block's reader + validator rules the office edits under.
 */

const content = vi.hoisted(() => ({ document: null as unknown }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: () => {} }) }));
vi.mock("@/components/portal-switch", () => ({ PortalSwitch: () => null }));
vi.mock("@/lib/api-client/content-pages", () => ({
  getPageDocument: async () => content.document,
}));

const CONTEXT: ContentValidationContext = { skus: new Set(), rateRefs: new Set(["plans.regular", "plans.senior"]) };

function loginDocument(blocks: unknown[], hero: Record<string, unknown> = {}) {
  return readPageDocument({
    key: "login",
    title: "Sign in",
    hero: {
      eyebrow: "Greetings",
      headline: "Welcome to Villa Funeraria",
      lead: "Sign in, then read the office's latest news.",
      image: null,
      background: null,
      backgroundTransparency: 100,
      textColour: null,
      ...hero,
    },
    tabs: [],
    blocks,
    entries: [],
    blog: null,
    updated_at: null,
    updated_by: null,
  });
}

function notice(overrides: Record<string, unknown> = {}) {
  return {
    id: "login-notice-1",
    type: "notice",
    category: "News",
    heading: "The 2026 price list is published",
    text: "Read the five plan tiers before you sign in.",
    image: null,
    href: "/plans",
    linkLabel: "See the plans",
    ...overrides,
  };
}

describe("hasEditorialContent", () => {
  it("is false only when the document carries nothing the panel can print", () => {
    expect(hasEditorialContent(loginDocument([], { eyebrow: "", headline: "", lead: "", image: null }))).toBe(false);
    expect(hasEditorialContent(loginDocument([]))).toBe(true);
    expect(hasEditorialContent(loginDocument([], { headline: "Welcome" }))).toBe(true);
    expect(hasEditorialContent(loginDocument([notice()]))).toBe(true);
  });
});

describe("the /login editorial panel", () => {
  it("prints the greeting, each notice and its link, all from the document", async () => {
    content.document = loginDocument([notice()]);
    const html = renderToStaticMarkup(await LoginPage());

    expect(html).toContain('aria-label="From the office"');
    expect(html).toContain("signin-shell--editorial");
    expect(html).toContain("Greetings");
    expect(html).toContain("Welcome to Villa Funeraria");
    expect(html).toContain("News");
    expect(html).toContain("The 2026 price list is published");
    expect(html).toContain("Read the five plan tiers before you sign in.");
    expect(html).toContain('href="/plans"');
    expect(html).toContain("See the plans");
  });

  it("keeps the classic centred card — no panel, no hole — when the document is empty", async () => {
    content.document = loginDocument([], { eyebrow: "", headline: "", lead: "", image: null });
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).not.toContain("signin-editorial");
    expect(html).not.toContain("signin-shell--editorial");
    // The sign-in form is unchanged whatever the panel does.
    expect(html).toContain("Sign in to the admin portal");
  });

  it("never breaks sign-in when the content store is unreadable", async () => {
    content.document = null;
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).not.toContain("signin-editorial");
    expect(html).toContain("Sign in to the admin portal");
  });

  it("renders only the fields a notice leaves filled", async () => {
    content.document = loginDocument([notice({ category: "", text: "", href: null, linkLabel: null })]);
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).toContain("The 2026 price list is published");
    expect(html).not.toContain("signin-editorial__link");
    expect(html).not.toContain("signin-editorial__category");
  });
});

describe("the notice block rules (the office's editable fields)", () => {
  it("reads a notice's fields and takes honest defaults", () => {
    const doc = loginDocument([notice()]);
    const block = doc.blocks[0];
    expect(block?.type).toBe("notice");
    if (block?.type !== "notice") throw new Error("expected a notice");
    expect(block.category).toBe("News");
    expect(block.heading).toBe("The 2026 price list is published");
    expect(block.href).toBe("/plans");
    expect(block.linkLabel).toBe("See the plans");
    expect(block.image).toBeNull();
  });

  it("refuses a notice without a title", () => {
    const verdict = validatePageDocument(loginDocument([notice({ heading: "" })]), CONTEXT);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.errors.join(" ")).toContain("notice needs a title");
  });

  it("refuses a half link — a label without a destination, or the reverse", () => {
    const noDestination = validatePageDocument(loginDocument([notice({ href: null })]), CONTEXT);
    expect(noDestination.ok).toBe(false);
    if (noDestination.ok) return;
    expect(noDestination.errors.join(" ")).toContain("both a link label and a destination");

    const noLabel = validatePageDocument(loginDocument([notice({ linkLabel: null })]), CONTEXT);
    expect(noLabel.ok).toBe(false);
  });

  it("accepts a photograph with an alt text and no caption", () => {
    const withPhoto = loginDocument([
      notice({ image: { id: "login-photo", src: "/media/hero-1.jpg", alt: "The park grounds", caption: null, sample: false } }),
    ]);
    expect(validatePageDocument(withPhoto, CONTEXT).ok).toBe(true);
  });
});
