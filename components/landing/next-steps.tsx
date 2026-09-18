/**
 * NextSteps — the ONE closing action band on every public surface (F-17).
 *
 * The journey fix: instead of each page ending in whatever section happened to
 * be last, every public page now closes with the same three options — call the
 * office, ask a question, or start the arrangement — in the client's own
 * language, with the office-assisted route (the phone) as the primary action
 * because that is how Villa actually sells.
 *
 * Read from the staff-editable LandingPage content document, like every other
 * call site: the number is never typed here, and it is a real `tel:` link with
 * the "Call …" label (never a bare number).
 *
 * Rendered by `PublicShell` (every interior public page) and by `LandingView`
 * (the home). Deliberately framework-free (plain `<a>`, no router) so the home
 * keeps rendering under the repo's node tests and inside the staff editor.
 *
 * Deliberately NOT rendered on /immediate-assistance: that screen IS the
 * call-first journey (F-01's content order is its contract — "nothing else asks
 * for a decision"), so a second action band would contradict the screen.
 */
import { Phone } from "lucide-react";
import type { ContactInfo } from "@/lib/api-client/landing";

export function NextSteps({ contact }: { contact: ContactInfo }) {
  return (
    <section className="next-steps" aria-labelledby="next-steps-title">
      <div className="next-steps__inner">
        <div className="next-steps__head">
          <p className="next-steps__kicker">Next step</p>
          <h2 className="next-steps__title" id="next-steps-title">
            Talk to us
          </h2>
          <p className="next-steps__line">Any hour, any day — a person will answer.</p>
        </div>
        <div className="next-steps__actions">
          <a className="btn btn--accent btn--lg" href={contact.phoneHref}>
            <Phone size={18} aria-hidden="true" />
            Call {contact.phoneDisplay}
          </a>
          <a className="btn btn--secondary btn--lg" href="/contact">
            Ask a question
          </a>
          <a className="btn btn--secondary btn--lg" href="/builder">
            Start the arrangement
          </a>
        </div>
        <p className="next-steps__meta">
          {contact.phoneLabel} · answered every hour, every day
        </p>
      </div>
    </section>
  );
}
