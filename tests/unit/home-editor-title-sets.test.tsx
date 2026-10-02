import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeSectionsEditor } from "@/components/landing/home-sections-editor";
import { readLandingContent } from "@/lib/api-client/landing";
import contentFile from "@/lib/fixtures/landing/content.json";

/**
 * The home editor's title-set controls (captain, 2026-10-02).
 *
 * The office asked to add unlimited gateway title sets and set the rotation
 * interval. This is the static-render contract for section 1's controls: a list
 * (one headline + supporting line per set, each with its own move/remove
 * buttons), an "Add a title set" button, and the seconds field — and NOT the
 * retired single headline/promise inputs.
 */
const HOME = readLandingContent((contentFile as { content: unknown }).content).home;

function renderEditor() {
  return renderToStaticMarkup(
    <HomeSectionsEditor
      home={HOME}
      onChange={() => {}}
      catalog={{ casketModels: [], services: [], chapels: [], lotFamilies: [] }}
      planPricing={{}}
    />,
  );
}

describe("the home editor's gateway title sets", () => {
  it("renders one editable pair per seeded set with reorder and remove controls", () => {
    const html = renderEditor();
    // The three demo sets each get a headline and a supporting-line field
    // (each field renders once as the label's `for` and once as the input id).
    expect(html.match(/id="home-title-title-\d+-headline"/g)?.length).toBe(
      HOME.gateway.titleSets.length,
    );
    expect(html.match(/id="home-title-title-\d+-promise"/g)?.length).toBe(
      HOME.gateway.titleSets.length,
    );
    expect(html).toContain("home-title-title-1-headline");
    expect(html).toContain("Move title set 1 up");
    expect(html).toContain("Remove title set 1");
  });

  it("offers adding an unlimited set and the rotation interval in whole seconds", () => {
    const html = renderEditor();
    expect(html).toContain("Add a title set");
    expect(html).toContain('id="home-gateway-interval"');
    expect(html).toMatch(/id="home-gateway-interval"[^>]*type="number"/);
    expect(html).toContain('min="1"');
    expect(html).toContain('max="120"');
    expect(html).toContain(`value="${HOME.gateway.titleIntervalSeconds}"`);
  });

  it("does not carry the retired single headline/promise fields", () => {
    const html = renderEditor();
    expect(html).not.toContain('id="home-gateway-headline"');
    expect(html).not.toContain('id="home-gateway-promise"');
  });
});
