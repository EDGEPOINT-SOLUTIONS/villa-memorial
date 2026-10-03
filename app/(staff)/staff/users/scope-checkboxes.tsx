/**
 * The permission checkbox groups — one field of tick boxes per module group.
 *
 * WHY IT IS SHARED. The role editor (client) toggles these, and a person's own
 * permission view (server) renders the SAME groups with `disabled` — the
 * captain's "check checkboxes for permissions" (2026-10-02) reads identically
 * wherever the office meets a permission set. It is a plain, hook-free
 * component so it renders on the server and inside a client component alike.
 *
 * Every box is one of the frozen `rbac-scopes-v1` scopes, in the contract's own
 * order, and the raw token is printed beside the plain-words grant so an office
 * user can see exactly what a tick grants. No new scope can reach a box: the
 * list comes from `SCOPE_GROUPS`, and the store refuses anything else.
 */
import { SCOPE_GROUPS } from "@/lib/rbac/scope-vocabulary";

/** A scope token is not a valid HTML id (`:`), so the id is slugged. */
function boxId(prefix: string, scope: string): string {
  return `${prefix}-${scope.replace(/[^a-z0-9]+/gi, "-")}`;
}

export function ScopeCheckboxes({
  selected,
  idPrefix,
  disabled = false,
  onToggle,
}: {
  /** The scopes currently ticked. */
  selected: ReadonlyArray<string>;
  /** A unique id prefix (role key or account id) so two grids never collide. */
  idPrefix: string;
  /** A read-only view (a person's inherited scopes). */
  disabled?: boolean;
  /** Omitted on the read-only view; the editor owns the change. */
  onToggle?: (scope: string, checked: boolean) => void;
}) {
  const chosen = new Set(selected);
  return (
    <div className="perm-grid">
      {SCOPE_GROUPS.map((group) => {
        const titleId = `${idPrefix}-group-${group.key}`;
        return (
          <div key={group.key} className="perm-grid__group" role="group" aria-labelledby={titleId}>
            <p id={titleId} className="perm-grid__title">
              {group.label}
            </p>
            <ul className="perm-grid__list">
              {group.entries.map((entry) => {
                const id = boxId(idPrefix, entry.scope);
                return (
                  <li key={entry.scope} className="perm-grid__item">
                    <label className="checkbox" htmlFor={id}>
                      <input
                        id={id}
                        type="checkbox"
                        checked={chosen.has(entry.scope)}
                        disabled={disabled}
                        onChange={
                          onToggle
                            ? (event) => onToggle(entry.scope, event.target.checked)
                            : undefined
                        }
                      />
                      <span>
                        {entry.grant}{" "}
                        <code className="text-xs text-muted">{entry.scope}</code>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
