import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusChip } from "@/components/kit/status-chip";

/**
 * StatusChip — one status word, one colour. The tone vocabulary is the six
 * `Badge` roles; the markup is the existing `.badge` classes so a migrated screen
 * does not change.
 */
describe("kit StatusChip", () => {
  it("renders the badge markup and the label", () => {
    const html = renderToStaticMarkup(<StatusChip tone="success">In stock</StatusChip>);
    expect(html).toBe('<span class="badge badge--success">In stock</span>');
  });

  it("defaults to the neutral tone", () => {
    expect(renderToStaticMarkup(<StatusChip>Not recorded</StatusChip>)).toContain(
      "badge--neutral",
    );
  });

  it("carries every tone in the closed vocabulary", () => {
    for (const tone of ["neutral", "success", "warning", "danger", "info", "accent"] as const) {
      expect(renderToStaticMarkup(<StatusChip tone={tone}>x</StatusChip>)).toContain(
        `badge--${tone}`,
      );
    }
  });
});
