import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  MEMORIAL_NEVER_SHOWN,
  MEMORIAL_SEARCH_NOBODY_HINT,
  MEMORIAL_SERVICE_NOTE,
  MEMORIAL_UNAVAILABLE_LEAD,
  MEMORIAL_UNAVAILABLE_TITLE,
  MEMORIAL_VISIBILITY,
} from "@/lib/memorials";
import { TEST_MEMORIAL, TEST_MEMORIAL_WITH_PHOTO } from "@/tests/helpers/memorial-record";
import { wordsOf, textOf } from "@/tests/helpers/prose";

/**
 * The three public memorial screens (F-04) render the REAL page components.
 * They exist because this surface's value is what it does NOT show:
 *
 *  · the search shows its rules BEFORE its results and never invents a person;
 *  · an empty query lists nobody, and the fixture (nothing published) says so;
 *  · an absent AND an unpublished memorial get the SAME answer, so the page can
 *    never confirm that a private person exists;
 *  · the memorial profile renders exactly the family's published record — and
 *    the living never appear on it.
 *
 * The published profile is rendered directly from a test-only record: the app
 * ships no published memorial while the service does not exist, so this is the
 * only place a person-shaped page may be proven.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const { default: MemorialSearchPage, generateMetadata: searchMetadata } = await import(
  "@/app/(public)/memorials/page"
);
const { default: FindMyLovedOnePage } = await import("@/app/(public)/memorials/find/page");
const { default: MemorialPage, generateMetadata: memorialMetadata } = await import(
  "@/app/(public)/memorials/[id]/page"
);
const { MemorialProfile } = await import("@/app/(public)/memorials/[id]/memorial-profile");

function h1Count(html: string): number {
  return (html.match(/<h1\b/g) ?? []).length;
}

async function renderSearch(params: Record<string, string>): Promise<string> {
  return renderToStaticMarkup(await MemorialSearchPage({ searchParams: Promise.resolve(params) }));
}

async function renderMemorial(id: string): Promise<string> {
  return renderToStaticMarkup(await MemorialPage({ params: Promise.resolve({ id }) }));
}

describe("the memorial search (/memorials)", () => {
  it("renders one h1 and puts the rules before the search form", async () => {
    const html = await renderSearch({});
    expect(h1Count(html)).toBe(1);
    const rules = html.indexOf('id="rules"');
    const form = html.indexOf("<form");
    expect(rules).toBeGreaterThan(-1);
    expect(form).toBeGreaterThan(rules);
  });

  it("publishes the three visibility choices in the visitor's terms", async () => {
    const html = await renderSearch({});
    const text = textOf(html);
    for (const choice of MEMORIAL_VISIBILITY) {
      expect(text).toContain(choice.visitorLabel);
      expect(text).toContain(choice.meaning);
    }
    // The living-relative rule is visible before anyone searches.
    for (const item of MEMORIAL_NEVER_SHOWN) {
      expect(text).toContain(item);
    }
  });

  it("says plainly that the fixture has published no memorial", async () => {
    const html = await renderSearch({ name: "someone" });
    expect(html).toContain("No memorial can be found yet");
    expect(html).toContain(MEMORIAL_SEARCH_NOBODY_HINT);
    expect(html).toContain(MEMORIAL_SERVICE_NOTE);
    // No result list, no fabricated person, and nothing from the family fixture.
    expect(html).not.toContain("mem-results__list");
    expect(html).not.toContain("Ernesto");
    expect(html).not.toContain("Dela Cruz");
  });

  it("lists nobody for an empty query (it is not a directory)", async () => {
    const html = await renderSearch({});
    expect(html).not.toContain("memorials match");
    expect(html).not.toContain("mem-results__list");
    expect(html).toContain("Enter a name, or the years you know.");
  });

  it("rejects a malformed year with the page's own validation state", async () => {
    const html = await renderSearch({ born: "48" });
    expect(html).toContain("Enter each year as four digits");
    expect(html).not.toContain("mem-results__list");
  });
});

describe("the memorial search's head", () => {
  it("stays indexable for the empty search and noindex for a result state", async () => {
    const idle = await searchMetadata({ searchParams: Promise.resolve({}) });
    expect(idle.robots).toBeUndefined();
    expect(String(idle.alternates?.canonical)).toContain("/memorials");

    const queried = await searchMetadata({
      searchParams: Promise.resolve({ name: "someone" }),
    });
    expect((queried.robots as { index?: boolean })?.index).toBe(false);
  });
});

describe("Find My Loved One (/memorials/find)", () => {
  it("renders one h1, the office's steps and the family's decision", async () => {
    const html = renderToStaticMarkup(await FindMyLovedOnePage());
    expect(h1Count(html)).toBe(1);
    expect(html).toContain("How the office looks for someone");
    expect(html).toContain("Tell us their name");
    expect(html).toContain("Tell us what you know");
    expect(html).toContain("We look in the office record");
    expect(html).toContain("We tell you what we find");
    expect(html).toContain("What to have ready");
    expect(textOf(html)).toContain("A family’s decision, never a default");
    expect(html).toContain(MEMORIAL_SERVICE_NOTE);
  });

  it("prints the staff-editable 24/7 line, never a typed number", async () => {
    const { contact } = await listLandingContent();
    const html = renderToStaticMarkup(await FindMyLovedOnePage());
    expect(html).toContain(contact.phoneDisplay);
    expect(html).toContain(contact.phoneHref);
  });
});

describe("an absent or unpublished memorial (/memorials/[id])", () => {
  it("renders ONE uniform answer — one h1, no person, no confirmation", async () => {
    const html = await renderMemorial("private-record-id");
    expect(h1Count(html)).toBe(1);
    expect(html).toContain(MEMORIAL_UNAVAILABLE_TITLE);
    expect(html).toContain(MEMORIAL_UNAVAILABLE_LEAD);
    // All three reasons are shown, without saying which one applies.
    for (const choice of MEMORIAL_VISIBILITY) {
      expect(html).toContain(choice.visitorLabel);
    }
    expect(html).toContain(MEMORIAL_SERVICE_NOTE);
    // No name, no photo, nothing from the family fixture.
    expect(html).not.toContain("<img");
    expect(html).not.toContain("Ernesto");
    expect(html).not.toContain("Dela Cruz");
  });

  it("answers with the same block for an id that never existed", async () => {
    const unknown = await renderMemorial("no-such-memorial-id");
    const privateish = await renderMemorial("another-id-entirely");
    expect(textOf(unknown).replace(/no-such-memorial-id|another-id-entirely/g, "ID")).toBe(
      textOf(privateish).replace(/no-such-memorial-id|another-id-entirely/g, "ID"),
    );
  });

  it("marks the head noindex and never writes a name into it", async () => {
    const meta = await memorialMetadata({ params: Promise.resolve({ id: "who-knows" }) });
    expect((meta.robots as { index?: boolean })?.index).toBe(false);
    expect(meta.title).toBe("Memorial — Villa Funeraria");
    expect(String(meta.title)).not.toContain("who-knows");
  });
});

describe("the published memorial profile (test-only record)", () => {
  it("shows the name, the life dates and the first line at a glance", async () => {
    const { contact } = await listLandingContent();
    const html = renderToStaticMarkup(
      createElement(MemorialProfile, { memorial: TEST_MEMORIAL, contact }),
    );
    expect(h1Count(html)).toBe(1);
    expect(html).toContain(TEST_MEMORIAL.name);
    expect(html).toContain(TEST_MEMORIAL.life_dates.display);
    expect(html).toContain(TEST_MEMORIAL.remembrance[0]);
    // The initials stand in when no photograph was shared (Example Memorial → EM).
    expect(html).toContain(">EM</span>");
    expect(html).not.toContain("<img");
  });

  it("shows the family's words and where they rest, office line only", async () => {
    const { contact } = await listLandingContent();
    const html = renderToStaticMarkup(
      createElement(MemorialProfile, { memorial: TEST_MEMORIAL, contact }),
    );
    expect(textOf(html)).toContain(TEST_MEMORIAL.remembrance[1]);
    expect(html).toContain("Sanctuario de Mercedes y Gloria · Section A · Lot A-01");
    expect(html).toContain(contact.phoneDisplay);
    // The living are never shown: only the office contact appears.
    expect(html).toContain("The only contact here is the office");
  });

  it("renders a family photograph when the family shared one", async () => {
    const { contact } = await listLandingContent();
    const html = renderToStaticMarkup(
      createElement(MemorialProfile, { memorial: TEST_MEMORIAL_WITH_PHOTO, contact }),
    );
    expect(html).toContain(`src="${TEST_MEMORIAL_WITH_PHOTO.photo?.src}"`);
    expect(html).toContain(`alt="${TEST_MEMORIAL_WITH_PHOTO.photo?.alt}"`);
    expect(html).not.toContain("mem-profile__mark");
  });

  it("keeps the page's own prose inside the answer-at-a-glance rule", () => {
    // The record's own words are the family's, not ours — but the page's fixed
    // copy is measured here so a future edit cannot turn it into an essay.
    const fixed = [MEMORIAL_UNAVAILABLE_LEAD, MEMORIAL_UNAVAILABLE_TITLE, MEMORIAL_SERVICE_NOTE];
    for (const line of fixed) {
      expect(wordsOf(line)).toBeLessThanOrEqual(30);
    }
  });
});
