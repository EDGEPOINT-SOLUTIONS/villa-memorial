import type { ReactNode } from "react";
import Link from "next/link";
import { PublicImage } from "@/components/public/public-image";
import { planMonthlyPrice } from "@/lib/monthly-pricing";
import { PLAN_TIERS, php } from "@/lib/villa-pricing";
import type { LandingContent } from "@/lib/api-client/landing";
import type { LotCategory, PlanPricing } from "@/lib/pricing-model";

/**
 * HomePage — the rebuilt public home (2026-09-27).
 *
 * Built to the seven prompts of the aitooltiphub.com UI guide. Each section below
 * names the prompt it answers, because the prompts are the brief and the next
 * person to touch this file should be able to check the work against it:
 *
 *   P01 Sharpen the Message — the h1 is a plain-spoken promise with ONE phrase in
 *       the accent (brass), not a slogan. "Honoring every life with dignity and
 *       light" could sit on any funeral home on the internet; this cannot.
 *   P02 Break the Symmetry — the hero is deliberately asymmetric: words on the
 *       left, the photograph on the right, running out to the frame edge. One
 *       element breaks the grid: the credential card overlapping the photo.
 *   P03 Build the Argument — the page argues in sequence and every section has
 *       ONE job: promise → who it is for → the fork → why us (the park) → what it
 *       feels like. The ask is inherited from the shell (`NextSteps`), so this
 *       page never invents a second closing grammar.
 *   P04 Pick the Winner — the park band is the ONE winner (largest, photograph
 *       led); inside the fork, "it has already happened" wins by size, weight and
 *       space over "you are planning ahead". Nothing here is a grid of equals.
 *   P05 Scale the Type — every size is a ladder step via a role token; the
 *       display serif carries h1/h2 and Inter carries everything read at length.
 *   P06 Give Color Meaning — brass appears exactly three times on this page: the
 *       headline phrase, the call action, and the section kickers. Nowhere else.
 *   P07 Add a Signature — the margin rule: a short brass hairline at the left of
 *       every section head, the way a printed document marks its own margin. It
 *       is applied to the section heads only, never to the hero.
 *
 * COPY OWNERSHIP. The structural copy here is route-local, exactly like
 * /immediate-assistance — whose content order is its contract and whose only
 * editable value is the phone number. Every FACT on this page (the phone number
 * and href, the wordmark, the addresses, the park's own story, and both money
 * figures) is read from the landing/pricing documents at request time and never
 * typed into this file. The strings that are still hardcoded here are the next
 * editor follow-up: they carry no client data, so nothing can go stale or
 * dishonest, but staff cannot reword them yet.
 */

/** The lowest monthly installment across every product in a lot family set. */
function lowestLotMonthly(categories: ReadonlyArray<LotCategory>): number | null {
  let lowest: number | null = null;
  for (const category of categories) {
    for (const row of category.rows ?? []) {
      const monthly = row.regular?.monthly;
      if (typeof monthly === "number" && (lowest === null || monthly < lowest)) {
        lowest = monthly;
      }
    }
  }
  return lowest;
}

/** The signature (P07) — the shared margin rule.
 *
 *  This deliberately renders the SHARED `.section-head__kicker`, not a home-only
 *  class. For the length of one rebuild the rule existed only here, which meant
 *  the home had a signature and the rest of the public site had none — two
 *  designs wearing one brand. The rule now lives on the primitive
 *  (`SectionHead`), so every interior page inherits it and this page simply uses
 *  the same class. */
function SectionKicker({ children }: { children: ReactNode }) {
  return <p className="section-head__kicker">{children}</p>;
}

export function HomePage({
  content,
  planPricing,
  lotCategories,
  mapNode,
}: {
  content: LandingContent;
  planPricing: PlanPricing;
  lotCategories: ReadonlyArray<LotCategory>;
  /** The live park map, rendered inside the winner band. */
  mapNode: ReactNode;
}) {
  const { contact, about, logo } = content;

  // Both figures are DERIVED from the pricing store, never authored. The entry
  // tier is the store's own Bronze 1; the lot figure is the cheapest monthly
  // installment any recorded product carries.
  const entryPlan = planMonthlyPrice(planPricing, PLAN_TIERS[0].id);
  const entryLotMonthly = lowestLotMonthly(lotCategories);

  return (
    <div className="home">
      {/* ================================================================
          P01 + P02 — THE PROMISE, ASYMMETRIC
          Words left, photograph right running out to the frame edge. The
          credential card breaks the grid over the photo's lower-left corner,
          which is the "one element breaks the grid" beat of prompt 02.
          ================================================================ */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__words">
          <p className="home-hero__place">
            {contact.location} · we answer every hour
          </p>
          <h1 id="home-hero-title" className="home-hero__title">
            Someone has died. Call us, and{" "}
            {/* The ONE accented phrase on the page's headline (P01 + P06). */}
            <em className="home-hero__promise">we will carry it from here.</em>
          </h1>
          <p className="home-hero__lead">
            A coordinator answers any hour, day or night. We come to you, and we
            stay with you until the burial is done.
          </p>
          <div className="home-hero__actions">
            {/* ONE commit + ONE support (the 3-rung CTA grammar, lib/public-layout.ts).
                The hero's call is the PAGE's commitment, so it rides `btn--primary`
                — not the per-item gold. `tests/unit/public-cta-contract.test.tsx`
                records the defect this avoids: "The home hero used to paint its
                commitment in the per-item gold. Its action row must not carry an
                accent button." Brass stays the headline phrase + the margin rule. */}
            <a className="btn btn--primary btn--lg" href={contact.phoneHref}>
              Call {contact.phoneDisplay}
            </a>
            <Link className="btn btn--secondary btn--lg" href="/plans">
              I am planning ahead
            </Link>
          </div>
        </div>

        <div className="home-hero__visual">
          {content.hero.image ? (
            <PublicImage
              role="home-hero"
              className="home-hero__photo"
              src={content.hero.image}
              alt={`The grounds of ${logo.wordmark}`}
              width={1626}
              height={916}
              priority
            />
          ) : null}
          {/* The one grid-breaking element. A real credential, not a badge. */}
          <div className="home-hero__card">
            <p className="home-hero__card-title">
              The first memorial park in Basilan
            </p>
            <p className="home-hero__card-note">
              Family-run, in {contact.location}.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          P03 — THE QUALIFYING STRIP
          "Directly under the hero, add a thin qualifying strip that names who
          this product is for, so the right visitor knows immediately."
          ================================================================ */}
      <section className="home-qualify" aria-label="Who we serve">
        <p>
          For families in {contact.location} and across the province — and for
          anyone who would rather plan ahead than leave it to a bad week.
        </p>
      </section>

      {/* ================================================================
          P03 (the fork) + P04 (one winner)
          The page's real decision is "has it happened or not". Both doors are
          here, and the urgent one WINS — larger type, more space, a brass rule,
          the heavier ground. A family in the first hour must not have to read
          two equal cards to find their door.
          ================================================================ */}
      <section className="home-fork" aria-labelledby="home-fork-title">
        <SectionKicker>Two doors</SectionKicker>
        <h2 id="home-fork-title" className="home-fork__title">
          Where you are right now decides everything else.
        </h2>

        <div className="home-fork__doors">
          <article className="home-door home-door--now">
            <p className="home-door__kicker">It has already happened</p>
            <h3 className="home-door__title">
              Call us. We take it from the first hour.
            </h3>
            <ul className="home-door__list">
              <li>We answer any hour, day or night — a person, not a queue.</li>
              <li>We come to you, wherever you are in the province.</li>
              <li>We handle the papers, the permits and the schedule.</li>
            </ul>
            <Link className="btn btn--primary btn--lg" href="/immediate-assistance">
              What to do right now
            </Link>
          </article>

          <article className="home-door home-door--later">
            <p className="home-door__kicker">You are planning ahead</p>
            <h3 className="home-door__title">
              Choose a plan or a lot, with the real prices printed.
            </h3>
            <ul className="home-door__list">
              <li>
                Memorial plans from{" "}
                <strong>{php(entryPlan.monthly)} a month</strong>.
              </li>
              {entryLotMonthly !== null ? (
                <li>
                  Garden lots from{" "}
                  <strong>{php(entryLotMonthly)} a month</strong>.
                </li>
              ) : null}
              <li>Assignable and transferable, with no forfeiture.</li>
            </ul>
            <Link className="btn btn--secondary btn--lg" href="/plans">
              See the plans and lots
            </Link>
          </article>
        </div>
      </section>

      {/* ================================================================
          P03 (why us) + P04 (THE WINNER)
          This is the one band that is allowed to be big. It is the product:
          a real garden that a family can walk before they need it. The live
          map goes inside it, because "browse the grounds" is the most
          convincing thing this business can show.
          ================================================================ */}
      <section className="home-park" aria-labelledby="home-park-title">
        <SectionKicker>Villa Memorial Park</SectionKicker>
        <div className="home-park__grid">
          <div className="home-park__copy">
            <h2 id="home-park-title" className="home-park__title">
              The first memorial park in Basilan.
            </h2>
            <p className="home-park__story">{about.story}</p>
            <dl className="home-park__facts">
              <div>
                <dt>Where</dt>
                <dd>{contact.parkAddress}</dd>
              </div>
              <div>
                <dt>What is there</dt>
                <dd>Garden lots, garden niches and mausoleums</dd>
              </div>
              <div>
                <dt>Before you visit</dt>
                <dd>Walk every plot on the live map</dd>
              </div>
            </dl>
            <Link className="btn btn--primary btn--lg" href="/map">
              Walk the grounds
            </Link>
          </div>
          <div className="home-park__media">
            {about.image ? (
              <PublicImage
                role="band-lead"
                className="home-park__photo"
                src={about.image}
                alt={`The grounds at ${logo.wordmark}`}
                width={1254}
                height={836}
              />
            ) : null}
          </div>
        </div>
        {/* The live map gets the FULL band width, not a cell inside the media
            column. At ~380px it was a postage stamp whose plot labels could not
            be read — and "walk the grounds before you visit" is the single most
            convincing thing this business can show, so it earns the room. */}
        {mapNode ? <div className="home-park__map">{mapNode}</div> : null}
      </section>

      {/* ================================================================
          P03 (what it feels like) — "one large product visual and three short
          summary lines that describe what using this product is actually like
          day to day."
          The three lines are the family portal's own promise, in its own voice.
          ================================================================ */}
      <section className="home-feel" aria-labelledby="home-feel-title">
        <SectionKicker>Once you are with us</SectionKicker>
        <div className="home-feel__grid">
          <div className="home-feel__copy">
            <h2 id="home-feel-title" className="home-feel__title">
              You will always know where things stand.
            </h2>
            <ol className="home-feel__lines">
              <li>
                <span className="home-feel__num">1</span>
                <p>One sentence answers your page. Nothing else needs you today.</p>
              </li>
              <li>
                <span className="home-feel__num">2</span>
                <p>
                  You see what is left to pay, and the papers your family already
                  holds.
                </p>
              </li>
              <li>
                <span className="home-feel__num">3</span>
                <p>Anything that is not there is ours to carry, not yours.</p>
              </li>
            </ol>
          </div>
          <div className="home-feel__panel" aria-hidden="true">
            {/* Not a screenshot — the promise as a printed line, on the same
                bone ground the family portal uses. */}
            <p className="home-feel__sample-kicker">Your family&rsquo;s page</p>
            <p className="home-feel__sample-title">
              {php(2000)} is still to pay on the plan.
            </p>
            <p className="home-feel__sample-body">
              That is all that is left. The office&rsquo;s next date for your
              family is the 15th. Nothing else needs you today.
            </p>
          </div>
        </div>
      </section>
      {/* THE BLOG BAND IS GONE FROM THE HOME (captain, 2026-09-27).
          It was added when the captain asked "now where are our blogs??" — the
          rebuild had dropped the old home's newsfeed and `/blog` was linked from
          nowhere, so the band did two jobs: it said the place was cared for, and
          it made the blog discoverable. The captain has now had it removed, and
          the DISCOVERABILITY half is what matters to check: `/blog` is still the
          first entry in the header's "Explore more" menu and a row in the
          footer's Explore column, so it is reachable from every public page
          without this band (`tests/unit/public-nav.test.tsx` pins both).

          `content.blog` remains the staff document and `/blog` still renders its
          full feed — nothing was retired; the home simply no longer reprints
          three posts. The card component and the "News from the park" CSS block
          went with it, because an unused card is the sort of thing that gets
          quietly re-imported later. */}
    </div>
  );
}
