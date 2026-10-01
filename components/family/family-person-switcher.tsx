import Link from "next/link";
import { Users } from "lucide-react";
import type { FamilyPersonSummary, FamilySnapshot } from "@/lib/api-client/family";

/**
 * The household person switcher — how one manager moves between the loved ones
 * they look after, and back to the “everyone” view.
 *
 * It is a plain `<nav>` of links, so it works with the keyboard, with a screen
 * reader and with the phone's own back button, and every destination is a real
 * shareable address (`?person=<id>`). A household with ONE loved one renders
 * nothing at all: the single-person portal must read exactly as it always has
 * (captain, 2026-09-30), with no empty switcher and no “1 of 1” clutter.
 *
 * The selected person is marked with `aria-current="page"`; the colour is
 * support, never the only signal (the name is in the link).
 */
export function PersonSwitcher({
  people,
  selectedId,
  basePath,
  everyoneCurrent = false,
  everyoneHref = "/client/dashboard",
}: {
  people: FamilyPersonSummary[];
  /** The resolved loved one's id, or undefined when viewing “everyone”. */
  selectedId?: string;
  /** The page the switcher sits on; a person link keeps the family on it. */
  basePath?: string;
  /** True on the household dashboard, where “Everyone” is the current view. */
  everyoneCurrent?: boolean;
  everyoneHref?: string;
}) {
  if (people.length <= 1) return null;
  return (
    <nav className="fv-people" aria-label="Who you are looking after">
      <span className="fv-people__label">
        <Users size={16} aria-hidden="true" />
        <span>Looking after</span>
      </span>
      <div className="fv-people__links">
        <Link
          href={everyoneHref}
          className={`fv-people__link${everyoneCurrent ? " fv-people__link--active" : ""}`}
          aria-current={everyoneCurrent ? "page" : undefined}
        >
          <span className="fv-people__name">Everyone</span>
          <span className="fv-people__dates">{people.length} people</span>
        </Link>
        {people.map((person) => {
          const href = basePath
            ? `${basePath}?person=${encodeURIComponent(person.id)}`
            : `/client/dashboard?person=${encodeURIComponent(person.id)}`;
          const active = selectedId === person.id;
          return (
            <Link
              key={person.id}
              href={href}
              className={`fv-people__link${active ? " fv-people__link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="fv-people__name">{person.name}</span>
              <span className="fv-people__dates">{person.life_dates}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** The switcher for a snapshot the page already holds; nothing for one person. */
export function PersonSwitcherForSnapshot({
  snapshot,
  basePath,
  everyoneCurrent = false,
}: {
  snapshot: Pick<FamilySnapshot, "household" | "person_id">;
  basePath?: string;
  everyoneCurrent?: boolean;
}) {
  const people = snapshot.household ?? [];
  if (people.length <= 1) return null;
  return (
    <PersonSwitcher
      people={people}
      selectedId={snapshot.person_id}
      basePath={basePath}
      everyoneCurrent={everyoneCurrent}
    />
  );
}
