import type { ReactNode } from "react";
import { showAllLabel } from "@/lib/public-layout";

/**
 * PublicDisclosure — the ONE progressive-disclosure control (Phase 0).
 *
 * Plan §3 R8 / §5.3: a browsable list renders at most `GRID.defaultVisible`
 * rows and then a "Show all N" control; the detail stays available instead of
 * being cut. Before this primitive every long list either shipped whole (the
 * 24-card `/products` wall = 23.5 phone screens) or hand-rolled its own
 * `<details>`. This wraps the native `<details>` element — it works without JS,
 * it is keyboard-accessible by default, and a browser find-in-page can still
 * reach the hidden rows when it opens.
 *
 * The label is built from the shared contract (`showAllLabel`) so the count a
 * visitor sees is the count the list holds. `isDisclosureNeeded()` is exported
 * for a caller that wants to render nothing when the list already fits — but
 * this component is deliberately simple: pass the total and it decides.
 */
export function PublicDisclosure({
  /** The total the control reveals, so the label reads "Show all N". */
  count,
  /** Override the summary text entirely (e.g. "Full schedule"). */
  summary,
  /** Open on first paint (use for the one section a page wants visible). */
  defaultOpen = false,
  className,
  children,
}: {
  count?: number;
  summary?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const label = summary ?? (count !== undefined ? showAllLabel(count) : "Show all");
  return (
    <details
      className={`public-disclosure${className ? ` ${className}` : ""}`}
      open={defaultOpen || undefined}
      data-public-disclosure=""
    >
      <summary className="public-disclosure__summary">{label}</summary>
      <div className="public-disclosure__body">{children}</div>
    </details>
  );
}
