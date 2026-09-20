import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultsGrid } from "@/components/kit/results-grid";

/**
 * ResultsGrid — the responsive card grid, and the two honest states it owns.
 * When the list is empty it renders the kit EmptyState instead of an empty
 * shell; `filtered` switches the wording from "nothing recorded" to "no match".
 */
type Lot = { id: string; name: string };

function renderGrid({
  items,
  filtered = false,
  noMatchTitle,
  noMatchHint,
  emptyTitle = "No lots published",
  emptyHint = "Lots appear here once they are published.",
}: {
  items: Lot[];
  filtered?: boolean;
  noMatchTitle?: string;
  noMatchHint?: string;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  return renderToStaticMarkup(
    <ResultsGrid<Lot>
      items={items}
      itemKey={(lot) => lot.id}
      label="Lots"
      emptyTitle={emptyTitle}
      emptyHint={emptyHint}
      filtered={filtered}
      noMatchTitle={noMatchTitle}
      noMatchHint={noMatchHint}
      renderItem={(lot) => <li>{lot.name}</li>}
    />,
  );
}

const lots: Lot[] = [
  { id: "LOT-1", name: "Family plot" },
  { id: "LOT-2", name: "Garden plot" },
];

describe("kit ResultsGrid", () => {
  it("renders the shared shop-grid and every item", () => {
    const html = renderGrid({ items: lots });
    expect(html).toContain('class="shop-grid"');
    expect(html).toContain('aria-label="Lots"');
    expect(html).toContain("Family plot");
    expect(html).toContain("Garden plot");
  });

  it("omits the accessible name when the grid sits inside a labelled section", () => {
    // The storefront bands name their `<section>`; `label` is optional (like
    // `DataTable.label`) so the list does not carry a duplicate name and the
    // public adoption stays byte-identical.
    const html = renderToStaticMarkup(
      <ResultsGrid<Lot>
        items={lots}
        itemKey={(lot) => lot.id}
        emptyTitle="No lots published"
        renderItem={(lot) => <li>{lot.name}</li>}
      />,
    );
    expect(html).toContain('<ul class="shop-grid">');
    expect(html).not.toContain("aria-label");
  });

  it("renders the empty state instead of an empty grid", () => {
    const html = renderGrid({ items: [] });
    expect(html).not.toContain("shop-grid");
    expect(html).toContain("No lots published");
    expect(html).toContain("Lots appear here once they are published.");
  });

  it("reads as a no-match, not as nothing recorded, when a filter is active", () => {
    const html = renderGrid({
      items: [],
      filtered: true,
      noMatchTitle: "No lots match these filters",
      noMatchHint: "Widen the filters to see more.",
    });
    expect(html).toContain("No lots match these filters");
    expect(html).toContain("Widen the filters to see more.");
    expect(html).not.toContain("No lots published");
  });

  it("falls back to the empty wording when a filtered list passes no no-match copy", () => {
    const html = renderGrid({ items: [], filtered: true });
    expect(html).toContain("No lots published");
  });
});
