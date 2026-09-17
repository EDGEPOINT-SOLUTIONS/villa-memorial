import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PortalActionBand,
  PortalCard,
  PortalChip,
  PortalFigure,
  PortalHero,
  PortalNote,
  PortalProgress,
  PortalRow,
  PortalRows,
  PortalSection,
} from "@/components/portal/portal-ui";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";

/**
 * The shared portal kit is the one house style: the agent portal's `ag-*`
 * block in styles/components.css styles this DOM, and the family portal renders
 * the same DOM. Pinning the class names here keeps the two portals from
 * drifting apart behind each other's backs.
 */
function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

describe("the shared portal kit", () => {
  it("renders the agent portal's hero grammar", () => {
    const html = render(
      <PortalHero eyebrow="Today" title="One fact" lead="What it means" chips={<PortalChip>Plan</PortalChip>}>
        <PortalActionBand>buttons</PortalActionBand>
      </PortalHero>,
    );
    expect(html).toContain('class="ag-hero"');
    expect(html).toContain('class="ag-day"');
    expect(html).toContain('class="ag-hero__title"');
    expect(html).toContain('class="ag-hero__lead"');
    expect(html).toContain('class="ag-hero__chips"');
    expect(html).toContain('class="ag-chip"');
    expect(html).toContain('class="ag-action"');
  });

  it("renders sections, cards and rows with the shared classes", () => {
    const html = render(
      <PortalSection title="A section" sub="A line">
        <PortalCard title="A card">
          <PortalRows>
            <PortalRow icon={<span />} title="A row" meta="One line" state="Ready" action={<button type="button">Go</button>} />
          </PortalRows>
        </PortalCard>
      </PortalSection>,
    );
    expect(html).toContain('class="ag-sec"');
    expect(html).toContain('class="ag-h2"');
    expect(html).toContain('class="ag-card"');
    expect(html).toContain('class="ag-list"');
    expect(html).toContain('class="ag-work"');
    expect(html).toContain('class="ag-stage"');
  });

  it("marks waiting states with the warm stage chip", () => {
    const html = render(<PortalRow title="A paper" state="Waiting on you" wait />);
    expect(html).toContain("ag-stage--warm");
    expect(html).toContain("Waiting on you");
  });

  it("renders figures and the progress bar the agent portal uses", () => {
    const html = render(
      <>
        <PortalFigure label="Sold" value="₱1" note="Total" hero />
        <PortalProgress left="₱1 paid" right="₱2 in all" percent={50} ariaLabel="half paid" />
      </>,
    );
    expect(html).toContain('class="ag-money ag-money--hero"');
    expect(html).toContain('class="ag-target__bar"');
    expect(html).toContain('role="img"');
    expect(html).toContain("width:50%");
  });

  it("keeps the honest note calm — a card, never an alert", () => {
    const html = render(<PortalNote>Not switched on yet.</PortalNote>);
    expect(html).toContain('class="ag-card"');
    expect(html).toContain('class="ag-note"');
    expect(html).not.toContain("alert");
  });

  // Every family call site passes its prose as a `<p>`. The note itself must be a
  // block container, or that `<p>` lands inside the note's own `<p>` and the
  // browser splits the tags on hydration (the captain's console error).
  it("accepts the block content its call sites pass — a paragraph in a paragraph is the defect", () => {
    const html = render(
      <PortalNote>
        <p>
          <strong>About this page.</strong> The records are not connected yet.
        </p>
      </PortalNote>,
    );
    expect(html).not.toMatch(/<p[^>]*class="ag-note"/);
    assertNoParagraphNesting(html, "PortalNote");
  });
});
