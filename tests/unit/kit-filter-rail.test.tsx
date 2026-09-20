import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FilterRail } from "@/components/kit/filter-rail";

/**
 * FilterRail — presentation only, controlled by the caller. It must render the
 * grouped options with their counts (dimming a zero but keeping it visible), a
 * price group with its own Apply, and the phone trigger/sheet — and it must hold
 * NO form and no navigation, so a filter change updates the results in place
 * rather than reloading the page.
 */
function renderRail(overrides: {
  selected?: Record<string, string[]>;
  onClear?: () => void;
  price?: boolean;
} = {}) {
  return renderToStaticMarkup(
    <FilterRail
      title="Filters"
      groups={[
        {
          key: "park",
          label: "Park",
          options: [
            { value: "north", label: "North park", count: 4 },
            { value: "east", label: "East park", count: 0 },
          ],
        },
      ]}
      selected={overrides.selected ?? { park: ["north"] }}
      onToggle={() => undefined}
      resultCount={4}
      totalCount={12}
      onClear={overrides.onClear}
      price={
        overrides.price
          ? {
              bounds: { min: 0, max: 500000 },
              value: { min: 0, max: 500000 },
              label: "Price range",
              format: (value) => `₱${value.toLocaleString("en-PH")}`,
            }
          : undefined
      }
      onPriceChange={() => undefined}
    />,
  );
}

describe("kit FilterRail — the rail", () => {
  it("renders the grouped options with their result counts", () => {
    const html = renderRail();
    expect(html).toContain("Filters");
    expect(html).toContain("North park");
    expect(html).toContain("East park");
    expect(html).toContain(">4<");
    expect(html).toContain(">0<");
    expect(html).toContain("4 results of 12");
  });

  it("dims a zero-count option instead of hiding it", () => {
    const html = renderRail();
    expect(html).toContain("filter-rail__option--zero");
    // The value is still printed, and its control is disabled.
    const option = html.slice(html.indexOf("East park") - 200, html.indexOf("East park") + 40);
    expect(option).toContain("disabled");
  });

  it("checks the options the caller selected", () => {
    const html = renderRail({ selected: { park: ["north"] } });
    const north = html.slice(0, html.indexOf("North park"));
    expect(north).toContain("checked");
  });

  it("offers the clear action only when something is selected", () => {
    expect(renderRail({ onClear: () => undefined })).toContain("Clear all");
    expect(renderRail({ selected: {}, onClear: () => undefined })).not.toContain("Clear all");
  });

  it("holds no form — a filter updates the results without a page refresh", () => {
    expect(renderRail()).not.toContain("<form");
  });

  it("renders the phone trigger and the sheet wrapper", () => {
    const html = renderRail();
    expect(html).toContain("filter-rail__toggle");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("filter-rail__sheet");
    expect(html).toContain('data-open="false"');
  });
});

describe("kit FilterRail — the price group", () => {
  it("renders the recorded range, both bounds and its own Apply", () => {
    const html = renderRail({ price: true });
    expect(html).toContain("Price range");
    expect(html).toContain("₱0 – ₱500,000 recorded");
    expect(html).toContain("Apply price");
    expect(html.match(/class="input"/g) ?? []).toHaveLength(2);
  });

  it("renders no price group when the caller passes none", () => {
    const html = renderRail();
    expect(html).not.toContain("Apply price");
    expect(html).not.toContain("filter-rail__price");
  });
});
