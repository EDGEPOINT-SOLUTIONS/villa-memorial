import type { ReactNode } from "react";
import type { ContactInfo } from "@/lib/api-client/landing";

/**
 * Story-lane UI — the small shared shape the eight "story" routes repeat
 * (`villa-public-minimal-story-pages`, Lane 1 of the captain's public design
 * plan). It is deliberately NOT a Phase 0 primitive: the primitives are the
 * grammar (hero · section head · image · disclosure), and this file holds the
 * two page-level patterns that only this lane needs.
 *
 *   · `StoryHelpBand` — the 24/7 closing band (plan §5.2/§5.7). Every support
 *     page ends on the office. The number and label are the staff-editable
 *     landing content, never typed here; the band carries the ONE sky commit
 *     action (CTA rung 1) plus at most one outline support action.
 *   · `StorySteps` — a guide's three numbered steps (plan §5.2): the prose a
 *     guide used to carry becomes three short, scannable actions.
 *
 * The CSS lives in the "public: story block" of styles/components.css.
 */
export function StoryHelpBand({
  contact,
  title = "Talk to a person, any hour",
  text = "Price questions, dates or the whole arrangement — by phone.",
  secondary,
}: {
  /** The staff-editable 24/7 line (landing content document; never typed). */
  contact: ContactInfo;
  title?: string;
  text?: string;
  /** At most one outline support action. */
  secondary?: ReactNode;
}) {
  return (
    <section className="story-help" aria-labelledby="story-help-title">
      <div>
        <h2 id="story-help-title">{title}</h2>
        <p>{text}</p>
      </div>
      <div className="story-help__actions">
        <a className="btn btn--primary" href={contact.phoneHref}>
          Call {contact.phoneDisplay}
        </a>
        {secondary}
      </div>
    </section>
  );
}

export type StoryStep = { title: string; body: string };

/** A guide's numbered steps — the answer BEFORE the explanation. */
export function StorySteps({ steps, id }: { steps: ReadonlyArray<StoryStep>; id: string }) {
  return (
    <ol className="story-steps" aria-labelledby={id}>
      {steps.map((step, index) => (
        <li className="story-step" key={step.title}>
          <span className="story-step__num" aria-hidden="true">
            {index + 1}
          </span>
          <div className="story-step__body">
            <h3 className="story-step__title">{step.title}</h3>
            <p>{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
