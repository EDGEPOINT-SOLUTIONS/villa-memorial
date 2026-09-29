import Link from "next/link";
import { BrandMark } from "@/components/landing/brand-mark";
import { PublicImage } from "@/components/public/public-image";
import { HomePlotMap } from "@/components/public/home-plot-map";
import { planMonthlyPrice } from "@/lib/monthly-pricing";
import {
  HERO_IMAGE,
  casketSamplePhoto,
  libraryThumb,
  libraryThumbSet,
} from "@/lib/media";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  CHAPEL_NOTES,
  COFFIN_SAMPLE_NOTE,
  EMBALMING_RATES,
  PLAN_TIERS,
  php,
} from "@/lib/villa-pricing";
import type { LandingContent } from "@/lib/api-client/landing";
import type { LotCategory, PlanPricing } from "@/lib/pricing-model";
import type { HomePlotInventory } from "@/lib/home-park-inventory";

/**
 * HomePage — the public home, rebuilt to the captain's reference page.
 *
 * The reference (a self-contained sky/white/black page with a Young Serif voice,
 * an arched hero, a numbered process, the plot-dot map, the FAQ details and its
 * own header/footer) is the LOOK. Every fact inside it is read from the stores:
 *
 *   hero + trust + footer contact   → the landing content document
 *   the plot map                    → the park plot store (lib/home-park-inventory)
 *   the five plan tiers' monthly    → the editable pricing document
 *   the four casket collections     → the 2026 catalogue (lib/villa-pricing)
 *   the five services / embalming / chapel names → lib/villa-pricing
 *
 * The reference's casket drawings are placeholders, so the cards show the
 * client's own sample photographs (`casketSamplePhoto`), captioned as samples.
 * The reference's "₱2,000 is still to pay" is a fabricated family balance, so
 * the family-page card shows the live entry-plan monthly figure instead.
 *
 * The home ships its OWN chrome (see `styles/home.css`): its header nav and
 * footer links are in-page anchors that exist only here. Every other public page
 * keeps the shared `PublicShell`.
 */

/** The four casket collections, each "from" its cheapest model's SRP. */
function casketCollections(): Array<{ name: string; from: number; count: number; model: string }> {
  const firstModel = new Map<string, string>();
  const byCollection = new Map<string, { from: number; count: number }>();
  for (const model of CASKET_MODELS) {
    if (!firstModel.has(model.collection)) firstModel.set(model.collection, model.model);
    const current = byCollection.get(model.collection);
    byCollection.set(model.collection, {
      from: current ? Math.min(current.from, model.srp) : model.srp,
      count: (current?.count ?? 0) + 1,
    });
  }
  return [...byCollection.entries()].map(([name, value]) => ({
    name,
    ...value,
    model: firstModel.get(name) ?? "",
  }));
}

/** The lowest monthly installment across every recorded lot family. */
function lowestLotMonthly(categories: ReadonlyArray<LotCategory>): number | null {
  let lowest: number | null = null;
  for (const category of categories) {
    for (const row of category.rows ?? []) {
      const monthly = row.regular?.monthly;
      if (typeof monthly === "number" && (lowest === null || monthly < lowest)) lowest = monthly;
    }
  }
  return lowest;
}

/** The hidden SVG symbols the hero clouds and the wave dividers `<use>`. */
function HomeDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="vf-cloud" viewBox="0 0 120 50">
          <path d="M20 46a16 16 0 0 1 2-32 22 22 0 0 1 42-4 18 18 0 0 1 30 12 14 14 0 0 1 6 24z" />
        </symbol>
        <symbol id="vf-wave" viewBox="0 0 1440 30" preserveAspectRatio="none">
          <path
            d="M0 15q45-15 90 0t90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0 90 0"
            fill="none"
            stroke="#5bbcf0"
            strokeWidth="3"
          />
        </symbol>
      </defs>
    </svg>
  );
}

/** The reference's wave divider, drawn from the shared symbol. */
function Wave() {
  return (
    <svg className="vf-wave" aria-hidden="true">
      <use href="#vf-wave" />
    </svg>
  );
}

function HomeHeader({ content }: { content: LandingContent }) {
  const { contact, logo } = content;
  return (
    <header className="vf-header">
      <div className="vf-w">
        <a className="vf-logo" href="#main">
          <BrandMark wordmark={logo.wordmark} markImage={logo.markImage} />
          {logo.wordmark}
        </a>
        <nav className="vf-nav" aria-label="Sections">
          <a href="#services">Funeral services</a>
          <a href="#plans">Memorial plan</a>
          <a href="#park">Memorial park</a>
          <a href="#caskets">Caskets</a>
          <a href="#faq">Questions</a>
        </nav>
        <a className="vf-btn" href={contact.phoneHref}>
          Call {contact.phoneDisplay}
        </a>
      </div>
    </header>
  );
}

function HomeFooter({ content }: { content: LandingContent }) {
  const { contact, logo } = content;
  const year = new Date().getFullYear();
  return (
    <footer className="vf-footer">
      <div className="vf-w">
        <div className="vf-footer__grid">
          <div>
            <a className="vf-logo" href="#main">
              <BrandMark wordmark={logo.wordmark} markImage={logo.markImage} />
              {logo.wordmark}
            </a>
            <p>
              A family-run memorial park in {contact.location}, and funeral care that honors
              every life with dignity and light. The first memorial park in Basilan.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="#main">Home</a>
            <a href="#services">Funeral memorial services</a>
            <a href="#caskets">Coffins and caskets</a>
            <a href="#park">Villa memorial park</a>
            <a href="#plans">Villa memorial plan</a>
          </div>
          <div>
            <h3>Care and planning</h3>
            <Link href="/services/death-at-home">Death at home</Link>
            <Link href="/services/death-at-hospital">Death at hospital</Link>
            <Link href="/price-list">Price list</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div>
            <h3>24/7 assistance line</h3>
            <a href={contact.phoneHref}>
              <b>Call {contact.phoneDisplay}</b>
            </a>
            {contact.secondPhoneDisplay && contact.secondPhoneHref ? (
              <a href={contact.secondPhoneHref}>
                <b>Second line: {contact.secondPhoneDisplay}</b>
              </a>
            ) : null}
            <p>Open every hour, every day.</p>
            {contact.officeAddress.trim() ? (
              <p style={{ marginTop: 8 }}>
                <b>Main office:</b> {contact.officeAddress}
              </p>
            ) : null}
            {contact.parkAddress.trim() ? (
              <p style={{ marginTop: 8 }}>
                <b>Visit the park:</b> {contact.parkAddress}
              </p>
            ) : null}
          </div>
        </div>
        <div className="vf-footer__bar">
          <span>
            © {year} {logo.wordmark}. All rights reserved.
          </span>
          <span className="vf-footer__portals">
            <Link href="/client/login">Family sign-in</Link>
            <Link href="/agent/login">Agent sign-in</Link>
            <Link href="/login">Staff sign-in</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function HomePage({
  content,
  planPricing,
  lotCategories,
  inventory,
}: {
  content: LandingContent;
  planPricing: PlanPricing;
  lotCategories: ReadonlyArray<LotCategory>;
  inventory: HomePlotInventory;
}) {
  const { contact, about, logo, faq } = content;

  // Every figure below is DERIVED from a store, never authored in the view.
  const entryPlan = planMonthlyPrice(planPricing, PLAN_TIERS[0].id);
  const entryLotMonthly = lowestLotMonthly(lotCategories);
  const collections = casketCollections();
  const cheapestCasket = Math.min(...CASKET_MODELS.map((model) => model.srp));
  const priciestCasket = Math.max(...CASKET_MODELS.map((model) => model.srp));

  const heroImage = content.hero.image ?? about.image ?? HERO_IMAGE;
  const heroSrc = libraryThumb(heroImage, 960);
  const heroSrcSet = libraryThumbSet(heroImage);

  return (
    <div className="vf-home">
      <a className="vf-skip" href="#main">
        Skip to content
      </a>
      <HomeDefs />
      <HomeHeader content={content} />

      <main id="main">
        {/* ==================================================================
            THE PROMISE — the reference's arch hero.
            ================================================================== */}
        <div className="vf-hero" data-vf-section="hero">
          <svg className="vf-cloud" style={{ top: 40, width: 220 }} aria-hidden="true">
            <use href="#vf-cloud" />
          </svg>
          <svg
            className="vf-cloud"
            style={{ top: 340, width: 150, animationDelay: "-30s" }}
            aria-hidden="true"
          >
            <use href="#vf-cloud" />
          </svg>
          <div className="vf-w vf-hero__grid">
            <div>
              <h1>
                <span>Someone has died.</span>
                <span>Call us. We will carry it from here.</span>
              </h1>
              <p className="vf-lead vf-hero__lead">
                A coordinator answers any hour, day or night. We come to you, and stay with you
                until the burial is done.
              </p>
              <div className="vf-btn-row">
                <a className="vf-btn" href={contact.phoneHref}>
                  Call {contact.phoneDisplay}
                </a>
                <a className="vf-btn vf-btn--outline" href="#now">
                  What to do right now
                </a>
              </div>
            </div>
            <div className="vf-arch-wrap">
              <div className="vf-arch">
                {/* eslint-disable-next-line @next/next/no-img-element -- the arch owns a portrait frame the landscape PublicImage roles cannot carry */}
                <img
                  src={heroSrc}
                  srcSet={heroSrcSet}
                  sizes="(max-width: 60rem) 92vw, 420px"
                  width={1626}
                  height={916}
                  alt={`The grounds of ${logo.wordmark}`}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <div className="vf-float-card">
                <b>The first memorial park in Basilan.</b>
                Family-run, in {contact.location}. Answering every hour since the first call.
              </div>
            </div>
          </div>
        </div>

        <Wave />

        {/* ==================================================================
            THE TRUST RULE — four real facts.
            ================================================================== */}
        <div className="vf-trust" data-vf-section="trust">
          <div>
            <b>Always answered</b>
            <p>
              A coordinator at <a href={contact.phoneHref}>{contact.phoneDisplay}</a>, any hour
              of the day.
            </p>
          </div>
          <div>
            <b>First in the province</b>
            <p>The first memorial park in Basilan, built for {contact.location}.</p>
          </div>
          <div>
            <b>Family-run</b>
            <p>Two offices: the city office and the park at Purok 3.</p>
          </div>
          <div>
            <b>Backed by Eternal Plans</b>
            <p>Villa Memorial Plan is powered by Eternal Plans, Inc.</p>
          </div>
        </div>

        {/* ==================================================================
            THE FORK — it has happened / plan ahead.
            ================================================================== */}
        <section id="now" data-vf-section="fork">
          <div className="vf-w">
            <h2>Where you are right now decides everything else.</h2>
            <p className="vf-lead">
              Families in {contact.location} and across the province, and anyone who would rather
              plan ahead than leave it to a bad week.
            </p>
            <div className="vf-two">
              <div className="vf-card vf-card--hot">
                <span className="vf-tag">It has already happened</span>
                <h3>Call us. We take it from the first hour.</h3>
                <ul className="vf-check">
                  <li>We answer any hour, day or night. A person, not a queue.</li>
                  <li>We come to you, wherever you are in the province.</li>
                  <li>We handle the papers, the permits and the schedule.</li>
                  <li>We tell you the full price plainly, before you decide anything.</li>
                </ul>
                <a className="vf-btn" href={contact.phoneHref}>
                  Call {contact.phoneDisplay}
                </a>
              </div>
              <div className="vf-card">
                <span className="vf-tag">You are planning ahead</span>
                <h3>Choose a plan or a lot, with the real prices printed.</h3>
                <ul className="vf-check">
                  <li>
                    Memorial plans from <b>{php(entryPlan.monthly)} a month</b>.
                  </li>
                  {entryLotMonthly !== null ? (
                    <li>
                      Garden lots from <b>{php(entryLotMonthly)} a month</b>.
                    </li>
                  ) : null}
                  <li>Assignable and transferable, with no forfeiture.</li>
                </ul>
                <a className="vf-btn vf-btn--outline" href="#plans">
                  See the plans and lots
                </a>
              </div>
            </div>
          </div>
        </section>

        <Wave />

        {/* ==================================================================
            THE FIRST HOUR — four steps.
            ================================================================== */}
        <section data-vf-section="process">
          <div className="vf-w">
            <h2>Four steps, and you are never alone in any of them.</h2>
            <div className="vf-steps">
              {[
                [
                  "We answer",
                  "A coordinator picks up, any hour. You tell us what has happened. Nothing else is decided yet.",
                ],
                [
                  "We come to you",
                  "Wherever you are in the province, our team brings the care and the transport to you.",
                ],
                [
                  "We arrange it together",
                  "The wake, the chapel, the schedule and the papers, handled with you, step by step.",
                ],
                [
                  "We stay until the burial",
                  "One coordinator is yours from the first call to the last, and answers every question between.",
                ],
              ].map(([title, body], index) => (
                <div key={title}>
                  <span className="vf-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================================
            THE SERVICES — quoted, never priced off a list.
            ================================================================== */}
        <section id="services" data-vf-section="services">
          <div className="vf-w">
            <h2>Everything a funeral needs, arranged with one office.</h2>
            <p className="vf-lead">
              The five services, the embalming care and the chapel, quoted for you, not priced
              off a list.
            </p>
            <div className="vf-services">
              <div className="vf-card">
                <h3>The five services</h3>
                <ul className="vf-check">
                  {ALACARTE_SERVICE_FEES.map((fee) => (
                    <li key={fee.service}>{fee.service}</li>
                  ))}
                </ul>
              </div>
              <div className="vf-card">
                <h3>Embalming care</h3>
                <ul className="vf-chips">
                  {EMBALMING_RATES.map((rate) => (
                    <li key={rate.days}>{rate.days} days</li>
                  ))}
                  <li>Beyond nine days, by the day</li>
                </ul>
              </div>
              <div className="vf-card">
                <h3>The chapel</h3>
                <ul className="vf-check" style={{ margin: 0 }}>
                  <li>Common chapel</li>
                  <li>Private chapel</li>
                  <li>Chapel use only</li>
                </ul>
                <p className="vf-small">{CHAPEL_NOTES.scope}</p>
              </div>
            </div>
            <div className="vf-btn-row">
              <a className="vf-btn" href="#talk">
                See the services and request a quote
              </a>
              <a className="vf-btn vf-btn--outline" href="#talk">
                Estimate your arrangement
              </a>
            </div>
          </div>
        </section>

        <Wave />

        {/* ==================================================================
            THE CASKETS — the four collections, from the real SRP.
            ================================================================== */}
        <section id="caskets" data-vf-section="caskets">
          <div className="vf-w">
            <h2>Twenty-four caskets, grouped in four collections.</h2>
            <p className="vf-lead">
              Each collection deepens in finish and price, from a simple white casket to the
              Dynasty.
            </p>
            <div className="vf-caskets">
              {collections.map((collection) => {
                const photo = casketSamplePhoto({ collection: "", model: collection.model });
                return (
                  <div className="vf-cs" key={collection.name}>
                    <PublicImage
                      role="card"
                      src={photo.card.src}
                      srcSet={photo.card.srcSet}
                      sizes="(max-width: 900px) 46vw, 170px"
                      alt={photo.alt}
                      width={photo.card.width}
                      height={photo.card.height}
                    />
                    <h3>{collection.name}</h3>
                    <p>
                      {collection.count} {collection.count === 1 ? "model" : "models"}
                    </p>
                    <span className="vf-pr">from {php(collection.from)}</span>
                  </div>
                );
              })}
            </div>
            <p className="vf-small" style={{ margin: "0 0 24px" }}>
              {COFFIN_SAMPLE_NOTE} The full price list runs from {php(cheapestCasket)} to{" "}
              {php(priciestCasket)}.
            </p>
            <Link className="vf-btn" href="/products">
              See the whole collection
            </Link>
          </div>
        </section>

        {/* ==================================================================
            THE PLANS — the five tiers' live monthly.
            ================================================================== */}
        <section id="plans" data-vf-section="plans">
          <div className="vf-w">
            <h2>Villa Memorial Plan</h2>
            <p className="vf-lead">
              An affordable life plan for all. Assignable, transferable, with no forfeiture. Pay
              a little each month, and your family never faces the full bill.
            </p>
            <div className="vf-plans">
              {PLAN_TIERS.map((tier) => {
                const monthly = planMonthlyPrice(planPricing, tier.id);
                return (
                  <div key={tier.id}>
                    <b>{tier.name}</b>
                    <span className="vf-pr">{php(monthly.monthly)}</span>
                    <small>a month</small>
                  </div>
                );
              })}
            </div>
            <div className="vf-btn-row">
              <Link className="vf-btn" href="/plans">
                Compare the five plans
              </Link>
              <Link className="vf-btn vf-btn--outline" href="/price-list">
                The 2026 price list
              </Link>
            </div>
          </div>
        </section>

        <Wave />

        {/* ==================================================================
            THE PARK — the winner, with the plot map.
            ================================================================== */}
        <section id="park" data-vf-section="park">
          <div className="vf-w vf-park">
            <div>
              <h2>The first memorial park in Basilan.</h2>
              <p>
                A family-run memorial park in {contact.location}, the first in the province,
                built so every life rests in beauty and peace.
              </p>
              <div className="vf-dl">
                <div>
                  <b>Where</b>
                  <span>{contact.parkAddress}</span>
                </div>
                <div>
                  <b>What is there</b>
                  <span>Garden lots, garden niches and mausoleums</span>
                </div>
                <div>
                  <b>Before you visit</b>
                  <span>Walk every plot on the live map. Tap a plot to see if it is free.</span>
                </div>
              </div>
              <a className="vf-btn" href="#map">
                Walk the grounds
              </a>
            </div>
            <HomePlotMap inventory={inventory} />
          </div>
        </section>

        {/* ==================================================================
            THE FAMILY PAGE — what the portal feels like.
            ================================================================== */}
        <section data-vf-section="feel">
          <div className="vf-w vf-feel">
            <div>
              <h2>You will always know where things stand.</h2>
              <ol>
                <li>
                  <span className="vf-num" aria-hidden="true">
                    1
                  </span>
                  <span>One sentence answers your page. Nothing else needs you today.</span>
                </li>
                <li>
                  <span className="vf-num" aria-hidden="true">
                    2
                  </span>
                  <span>
                    You see what is left to pay, and the papers your family already holds.
                  </span>
                </li>
                <li>
                  <span className="vf-num" aria-hidden="true">
                    3
                  </span>
                  <span>Anything that is not there is ours to carry, not yours.</span>
                </li>
              </ol>
            </div>
            <div className="vf-card vf-card--hot" style={{ borderRadius: "24px 80px 24px 24px" }}>
              <span className="vf-tag">Your family&rsquo;s page</span>
              <p className="vf-big">
                {php(entryPlan.monthly)} a month on {PLAN_TIERS[0].name}.
              </p>
              <div className="vf-progress" aria-hidden="true">
                <i />
              </div>
              <p>
                You see what is still to pay, the papers your family holds, and the office&rsquo;s
                next date for you.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================
            THE QUESTIONS.
            ================================================================== */}
        <section id="faq" data-vf-section="faq">
          <div className="vf-w">
            <h2>{faq.heading}</h2>
            <div style={{ marginTop: 30 }}>
              {faq.items.map((item) => (
                <details key={item.id}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <div className="vf-btn-row" style={{ marginTop: 28 }}>
              <Link className="vf-btn vf-btn--outline" href="/faq">
                More questions
              </Link>
              <Link className="vf-btn" href="/contact">
                Ask us anything
              </Link>
            </div>
          </div>
        </section>

        {/* ==================================================================
            THE CLOSING BAND.
            ================================================================== */}
        <section id="talk" className="vf-talk" data-vf-section="talk">
          <div className="vf-w">
            <div className="vf-cta">
              <h2>Talk to us.</h2>
              <p>Any hour, any day. A person will answer.</p>
              <div className="vf-btn-row">
                <a className="vf-btn" href={contact.phoneHref}>
                  Call {contact.phoneDisplay}
                </a>
                <Link className="vf-btn vf-btn--outline" href="/faq">
                  Ask a question
                </Link>
                {contact.secondPhoneHref ? (
                  <a className="vf-btn vf-btn--outline" href={contact.secondPhoneHref}>
                    Start the arrangement
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter content={content} />
    </div>
  );
}
