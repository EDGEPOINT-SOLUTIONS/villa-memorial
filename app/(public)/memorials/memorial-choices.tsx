import { MEMORIAL_PUBLIC_CHOICES } from "@/lib/memorials";

/**
 * The family's choices in a VISITOR's terms.
 *
 * One switch and the fields a family may show: a visitor who cannot find someone
 * needs to understand that a memorial exists only when a family turns it on, and
 * that each detail is the family's own choice. One component renders this list on
 * the search page, the unavailable memorial page and the find page, so the
 * surfaces cannot describe the choices differently.
 *
 * `title` is optional: the search page already heads the explainer ("What this
 * search can show"), so it passes an empty title and the choices sit directly
 * under it.
 */
export function MemorialChoices({ title = "What a family can choose" }: { title?: string }) {
  return (
    <div className="mem-choices">
      {title ? <h2 className="text-lg">{title}</h2> : null}
      <ul className="mem-choices__list">
        {MEMORIAL_PUBLIC_CHOICES.map((choice) => (
          <li className={`mem-choice mem-choice--${choice.id}`} key={choice.id}>
            <span className="mem-choice__label">{choice.label}</span>
            <span className="mem-choice__meaning">{choice.meaning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
