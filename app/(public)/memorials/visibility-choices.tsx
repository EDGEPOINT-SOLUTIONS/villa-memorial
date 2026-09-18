import { MEMORIAL_VISIBILITY } from "@/lib/memorials";

/**
 * The three visibility choices a family can make, in a VISITOR's terms.
 *
 * The same three choices the family portal shows (worded for the family there,
 * for the visitor here): a visitor who cannot find someone needs to understand
 * that a private or family-only memorial exists without appearing. One component
 * renders this list on the search page and on the unavailable memorial page, so
 * the two surfaces cannot describe the choices differently.
 */
export function VisibilityChoices({ title = "What a family can choose" }: { title?: string }) {
  return (
    <div className="mem-choices">
      <h3 className="mem-choices__title">{title}</h3>
      <ul className="mem-choices__list">
        {MEMORIAL_VISIBILITY.map((choice) => (
          <li className={`mem-choice mem-choice--${choice.id}`} key={choice.id}>
            <span className="mem-choice__label">{choice.visitorLabel}</span>
            <span className="mem-choice__meaning">{choice.meaning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
