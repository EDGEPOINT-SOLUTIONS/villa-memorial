import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocationBlock } from "@/components/public/location-block";
import { directionsUrl, mapSearchUrl } from "@/lib/location-map";
import type { ContactInfo } from "@/lib/api-client/landing";

/**
 * The rendered location block (client's minutes 2026-09-21, item 6): the
 * recorded address reaches the page, the directions action points at the
 * provider URL built from it, and the honesty note is present. The block must
 * stay a static card — no embed — until the client approves a pin, so this also
 * fails a third-party iframe or an external map image.
 */

/** React escapes `&` in an attribute value, so compare against the same form. */
const attr = (url: string) => `href="${url.replace(/&/g, "&amp;")}"`;

const CONTACT: ContactInfo = {
  phoneLabel: "24/7 Assistance Line",
  phoneDisplay: "0917 617 8489",
  phoneHref: "tel:+639176178489",
  location: "Isabela City, Basilan",
  secondPhoneDisplay: "0917 183 9262",
  secondPhoneHref: "tel:+639171839262",
  officeAddress: "Capilla de San Jose Bldg., Sunrise, Isabela City, Basilan",
  parkAddress: "Sanctuario de Mercedes y Gloria, Purok 3, Begang, Isabela City, Basilan",
};

describe("LocationBlock", () => {
  it("renders the recorded park address with a Get directions action built from it", () => {
    const html = renderToStaticMarkup(createElement(LocationBlock, { contact: CONTACT }));
    expect(html).toContain(CONTACT.parkAddress);
    expect(html).toContain("Villa Memorial Park");
    expect(html).toContain(attr(directionsUrl("google", CONTACT.parkAddress)));
    expect(html).toContain(attr(directionsUrl("apple", CONTACT.parkAddress)));
    expect(html).toContain("Get directions");
  });

  it("lists the office as a supporting row with its own directions and map links", () => {
    const html = renderToStaticMarkup(createElement(LocationBlock, { contact: CONTACT }));
    expect(html).toContain("Main office");
    expect(html).toContain(CONTACT.officeAddress);
    expect(html).toContain(attr(directionsUrl("google", CONTACT.officeAddress)));
    expect(html).toContain(attr(mapSearchUrl("google", CONTACT.officeAddress)));
    expect(html).toContain("View on map");
  });

  it("is honest: a static card note and no third-party embed", () => {
    const html = renderToStaticMarkup(createElement(LocationBlock, { contact: CONTACT }));
    expect(html).toContain("A static location card");
    expect(html).not.toContain("<iframe");
    // Every external link is opened safely.
    expect(html).not.toMatch(/target="_blank"(?![^>]*rel="noopener noreferrer")/);
  });

  it("is a plain band: one section head, one h3 for the place, no bespoke heading", () => {
    const html = renderToStaticMarkup(createElement(LocationBlock, { contact: CONTACT }));
    expect((html.match(/<h2\b/g) ?? []).length).toBe(1);
    expect((html.match(/<h3\b/g) ?? []).length).toBe(1);
    expect(html).toContain('data-section-head=""');
    expect(html).toContain('data-location-block=""');
  });

  it("renders nothing when both recorded addresses are cleared", () => {
    const html = renderToStaticMarkup(
      createElement(LocationBlock, {
        contact: { ...CONTACT, officeAddress: "", parkAddress: "" },
      }),
    );
    expect(html).toBe("");
  });
});
