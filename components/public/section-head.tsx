import type { ReactNode } from "react";

/**
 * SectionHead — the ONE public section head (Phase 0 consistency contract).
 *
 * The minimalist grammar the captain settled (2026-09-21) is `kicker · heading ·
 * one-line intro` per section, with the detail behind progressive disclosure.
 * Before this primitive the same job was done by `.mid-kicker`/`.mid-intro` on
 * the home and by a bespoke head on every interior page — 12 different
 * hero/section families for one shape. This owns the shape:
 *
 *   kicker  a short uppercase label (the band's group)
 *   title   the section's h2 (or h3 where the card/section is the next level)
 *   lead    ONE sentence — the answer, not an introduction
 *   action  at most one link/action, right-aligned on desktop
 *
 * A page never hand-rolls a section head again. The head carries no border and
 * no box: hierarchy is the type step and the hairline that follows in the band.
 * `id` is passed to the heading so the band can `aria-labelledby` it.
 */
export function SectionHead({
  id,
  kicker,
  title,
  lead,
  action,
  headingLevel = 2,
  className,
}: {
  /** The heading's id, so the owning `<section aria-labelledby>` can name it. */
  id?: string;
  /** The short uppercase group label. */
  kicker?: ReactNode;
  /** The section's heading — states the answer, never a topic. */
  title: ReactNode;
  /** ONE sentence: what this band says. */
  lead?: ReactNode;
  /** At most one action (a link or a button). */
  action?: ReactNode;
  /** The heading tag — promote to `3` when the section is the card's next level. */
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = (headingLevel === 3 ? "h3" : "h2") as "h2" | "h3";
  return (
    <div className={`section-head${className ? ` ${className}` : ""}`} data-section-head="">
      <div className="section-head__text">
        {kicker ? <p className="section-head__kicker">{kicker}</p> : null}
        <Heading id={id} className="section-head__title">
          {title}
        </Heading>
        {lead ? <p className="section-head__lead">{lead}</p> : null}
      </div>
      {action ? <div className="section-head__action">{action}</div> : null}
    </div>
  );
}
