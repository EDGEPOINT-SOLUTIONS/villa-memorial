import type { ReactNode } from "react";

/**
 * EmptyState — the ONE empty / no-match state for a list, table or grid.
 *
 * WHY IT EXISTS. Two screens described the same absences in two different voices:
 * a filtered list that found nothing ("No stock matches your filter") and a list
 * with genuinely no records ("No stock recorded") must read differently, and the
 * colour/markup must not drift. Both go through this component:
 *
 *   · an EMPTY list tells the reader records appear here once the office adds
 *     them — never "try a different filter" (there is no filter to change);
 *   · a NO-MATCH list (the caller passes `filtered`) names the filter as the
 *     cause and tells the reader to widen or clear it.
 *
 * The copy itself belongs to the caller (domain vocabulary lives in the feature),
 * this component owns the grammar: `.empty-state` + a serif title + a muted hint
 * + an optional action. The markup is unchanged from the pre-kit component, so
 * moving a screen onto the kit is not a restyle.
 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  /** The way out of the state (a Clear-filters link, a primary action). */
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
