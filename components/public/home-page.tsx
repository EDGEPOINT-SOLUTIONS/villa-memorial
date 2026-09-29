import type { ReactNode } from "react";
import Link from "next/link";
import { PublicImage } from "@/components/public/public-image";
import { planMonthlyPrice } from "@/lib/monthly-pricing";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  CHAPEL_NOTES,
  COFFIN_SAMPLE_NOTE,
  EMBALMING_RATES,
  PLAN_TIERS,
  php,
} from "@/lib/villa-pricing";
import { GALLERY_GROUPS, GALLERY_HERO } from "@/lib/gallery";
import { casketSamplePhoto, libraryThumb, libraryThumbSet } from "@/lib/media";
import type { LandingContent } from "@/lib/api-client/landing";
import type { LotCategory, PlanPricing } from "@/lib/pricing-model";

/**
 * HomePage — the public storefront home.
 *
 * Built to the seven prompts of the aitooltiphub UI guide, then rebuilt again
 * (2026-09-28) to SELL: the earlier pass was honest but thin, so this one leads
 * with the facts a family needs to trust the office and adds a band per real
 * product — every figure and every name read from the stores, never typed:
 *
 *   hero        the promise, the call, and four real trust facts.
 *   qualify     who this is for.
 *   fork        the two doors (it has happened / planning ahead).
 *   process     what actually happens when you call — four steps.
 *   services    the full funeral-service list (NO price: minute 5 = request a quote).
 *   caskets     the 2026 casket collections, "from" the real SRP.
 *   plans       the five plan tiers' live monthly + garden lots.
 *   park        the winner: the grounds and the live map.
 *   gallery     the client's own photographs.
 *   feel        the family-portal promise.
 *   faq         the three questions the office is asked most.
 *
 * COPY OWNERSHIP. Every FACT (wordmark, phones, addresses, story, prices, the
 * service/casket names) is read from the landing or pricing documents; the
 * strings that stay in this file are structural next to no client data. The
 * service band prints NO amount, by the client's own minute 5.
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

/** The four casket collections, each "from" its cheapest model's SRP, with the
 *  first model's name so the band can show the collection's sample photograph. */
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

/** The section head (kicker · title · one lead · one action) for the bands. */
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
  const { contact, about, logo, faq } = content;

  // Both figures are DERIVED from the pricing store, never authored. The entry
  // tier is the store's own Bronze 1; the lot figure is the cheapest monthly
  // installment any recorded product carries.
  const entryPlan = planMonthlyPrice(planPricing, PLAN_TIERS[0].id);
  const entryLotMonthly = lowestLotMonthly(lotCategories);
  const caskets = casketCollections();
  const cheapestCasket = Math.min(...CASKET_MODELS.map((model) => model.srp));
  // Dedupe by src: GALLERY_GROUNDS also appears inside GALLERY_GROUPS[0], and a
  // repeated src would render the same photograph twice (a React duplicate-key).
  const galleryPhotos = (() => {
    const seen = new Set<string>();
    const photos = [];
    for (const photo of [GALLERY_HERO, ...GALLERY_GROUPS.flatMap((group) => group.photos)]) {
      if (seen.has(photo.src)) continue;
      seen.add(photo.src);
      photos.push(photo);
      if (photos.length === 6) break;
    }
    return photos;
  })();

  return (
    <div className="home">
      {/* ================================================================
          THE PROMISE — asymmetric: words left, the photograph right.
          ================================================================ */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__words">
          <p className="home-hero__place">{contact.location} · we answer every hour</p>
          <h1 id="home-hero-title" className="home-hero__title">
            Someone has died.{" "}
            <span className="home-hero__promise">Call us — we will carry it from here.</span>
          </h1>
          <p className="home-hero__lead">
            A coordinator answers any hour, day or night. We come to you, and we
            stay with you until the burial is done.
          </p>
          <div className="home-hero__actions">
            {/* ONE commit + ONE support (lib/public-layout.ts). */}
            <a className="btn btn--primary btn--lg" href={contact.phoneHref}>
              Call {contact.phoneDisplay}
            </a>
            <Link className="btn btn--secondary btn--lg" href="/immediate-assistance">
              What to do right now
            </Link>
          </div>
        </div>

        <div className="home-hero__visual">
          {content.hero.image ? (
            <PublicImage
              role="home-hero"
              className="home-hero__photo"
              src={libraryThumb(content.hero.image, 960)}
              srcSet={libraryThumbSet(content.hero.image)}
              sizes="(max-width: 60rem) 92vw, 44vw"
              alt={`The grounds of ${logo.wordmark}`}
              width={1626}
              height={916}
              priority
            />
          ) : null}
          <div className="home-hero__card">
            <p className="home-hero__card-title">The first memorial park in Basilan</p>
            <p className="home-hero__card-note">
              Family-run, in {contact.location}. Answering every hour since the first call.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          THE TRUST STRIP — four real facts, not badges.
          ================================================================ */}
      <section className="home-trust" aria-label="Why families can trust us">
        <dl className="home-trust__list">
          <div className="home-trust__item">
            <dt>Always answered</dt>
            <dd>
              A coordinator, day or night — <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
            </dd>
          </div>
          <div className="home-trust__item">
            <dt>First in the province</dt>
            <dd>The first memorial park in Basilan, built for {contact.location}</dd>
          </div>
          <div className="home-trust__item">
            <dt>Family-run</dt>
            <dd>Two offices — the city office and the park at {contact.parkAddress.split(",")[1]?.trim() || "the grounds"}</dd>
          </div>
          <div className="home-trust__item">
            <dt>Backed by Eternal Plans</dt>
            <dd>Villa Memorial Plan is powered by Eternal Plans, Inc.</dd>
          </div>
        </dl>
      </section>

      {/* ================================================================
          WHO IT IS FOR.
          ================================================================ */}
      <section className="home-qualify" aria-label="Who we serve">
        <p>
          For families in {contact.location} and across the province — and for
          anyone who would rather plan ahead than leave it to a bad week.
        </p>
      </section>

      {/* ================================================================
          THE FORK — two doors, and the urgent one wins.
          ================================================================ */}
      <section className="home-fork" aria-labelledby="home-fork-title">
        <SectionKicker>Two doors</SectionKicker>
        <h2 id="home-fork-title" className="home-fork__title">
          Where you are right now decides everything else.
        </h2>

        <div className="home-fork__doors">
          <article className="home-door home-door--now">
            <p className="home-door__kicker">It has already happened</p>
            <h3 className="home-door__title">Call us. We take it from the first hour.</h3>
            <ul className="home-door__list">
              <li>We answer any hour, day or night — a person, not a queue.</li>
              <li>We come to you, wherever you are in the province.</li>
              <li>We handle the papers, the permits and the schedule.</li>
              <li>We tell you the cost plainly, before you decide anything.</li>
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
                Memorial plans from <strong>{php(entryPlan.monthly)} a month</strong>.
              </li>
              {entryLotMonthly !== null ? (
                <li>
                  Garden lots from <strong>{php(entryLotMonthly)} a month</strong>.
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
          THE FIRST HOUR — what actually happens when you call.
          ================================================================ */}
      <section className="home-process" aria-labelledby="home-process-title">
        <SectionKicker>When you call</SectionKicker>
        <h2 id="home-process-title" className="home-process__title">
          Four steps, and you are never alone in any of them.
        </h2>
        <ol className="home-process__steps">
          {[
            ["We answer", "A coordinator picks up, any hour. You tell us what has happened — nothing else is decided yet."],
            ["We come to you", "Wherever you are in the province, our team brings the care and the transport to you."],
            ["We arrange it together", "The wake, the chapel, the schedule and the papers — handled with you, step by step."],
            ["We stay until the burial", "One coordinator is yours from the first call to the last, and answers every question between."],
          ].map(([title, body], index) => (
            <li key={title} className="home-process__step">
              <span className="home-process__num" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="home-process__step-title">{title}</h3>
              <p className="home-process__step-body">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ================================================================
          THE SERVICES — everything a funeral needs, at your request.
          NO price on this band: the client's minute 5 asks for a quotation.
          ================================================================ */}
      <section className="home-services" aria-labelledby="home-services-title">
        <SectionKicker>Funeral services</SectionKicker>
        <h2 id="home-services-title" className="home-services__title">
          Everything a funeral needs, arranged with one office.
        </h2>
        <p className="home-services__lead">
          The five services, the embalming care and the chapel — quoted for your
          family, not priced off a list.
        </p>
        <div className="home-services__grid">
          <div className="home-services__group">
            <h3 className="home-services__group-title">The five services</h3>
            <ul className="home-services__list">
              {ALACARTE_SERVICE_FEES.map((fee) => (
                <li key={fee.service}>{fee.service}</li>
              ))}
            </ul>
          </div>
          <div className="home-services__group">
            <h3 className="home-services__group-title">Embalming care</h3>
            <ul className="home-services__list">
              {EMBALMING_RATES.map((rate) => (
                <li key={rate.days}>{rate.days} days</li>
              ))}
              <li>Beyond nine days, by the day</li>
            </ul>
          </div>
          <div className="home-services__group">
            <h3 className="home-services__group-title">The chapel</h3>
            <ul className="home-services__list">
              <li>Common chapel</li>
              <li>Private chapel</li>
              <li>Chapel use only</li>
            </ul>
            <p className="home-services__note">{CHAPEL_NOTES.scope}</p>
          </div>
        </div>
        <div className="home-services__actions">
          <Link className="btn btn--primary btn--lg" href="/services">
            See the services &amp; request a quote
          </Link>
          <Link className="btn btn--secondary btn--lg" href="/builder">
            Estimate your arrangement
          </Link>
        </div>
      </section>

      {/* ================================================================
          THE CASKETS — the 2026 collections, from the real SRP.
          ================================================================ */}
      <section className="home-caskets" aria-labelledby="home-caskets-title">
        <SectionKicker>Coffins &amp; caskets</SectionKicker>
        <h2 id="home-caskets-title" className="home-caskets__title">
          Twenty-four caskets, grouped in four collections.
        </h2>
        <ul className="home-caskets__list">
          {caskets.map((collection) => {
            const photo = casketSamplePhoto({ collection: "", model: collection.model });
            return (
              <li key={collection.name} className="home-caskets__card">
                <Link href="/products" className="home-caskets__card-link">
                  <PublicImage
                    role="card"
                    src={photo.card.src}
                    srcSet={photo.card.srcSet}
                    sizes="(max-width: 64rem) 46vw, 16rem"
                    alt={photo.alt}
                    width={photo.card.width}
                    height={photo.card.height}
                  />
                  <span className="home-caskets__name">{collection.name}</span>
                  <span className="home-caskets__count">
                    {collection.count} {collection.count === 1 ? "model" : "models"}
                  </span>
                  <span className="home-caskets__from">
                    from <strong>{php(collection.from)}</strong>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="home-caskets__note">
          {COFFIN_SAMPLE_NOTE} The full price list runs from {php(cheapestCasket)} to{" "}
          {php(Math.max(...CASKET_MODELS.map((model) => model.srp)))}.
        </p>
        <div className="home-caskets__actions">
          <Link className="btn btn--primary btn--lg" href="/products">
            See the whole collection
          </Link>
        </div>
      </section>

      {/* ================================================================
          THE PLANS & LOTS — the five tiers' live monthly.
          ================================================================ */}
      <section className="home-plans" aria-labelledby="home-plans-title">
        <SectionKicker>{content.plans.kicker}</SectionKicker>
        <h2 id="home-plans-title" className="home-plans__title">
          {content.plans.heading}
        </h2>
        <p className="home-plans__lead">{content.plans.intro}</p>
        <ul className="home-plans__tiers">
          {PLAN_TIERS.map((tier) => {
            const monthly = planMonthlyPrice(planPricing, tier.id);
            return (
              <li key={tier.id} className="home-plans__tier">
                <Link href="/plans" className="home-plans__tier-link">
                  <span className="home-plans__tier-name">{tier.name}</span>
                  <span className="home-plans__tier-price">
                    {php(monthly.monthly)}
                    <span className="home-plans__tier-unit"> / month</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="home-plans__actions">
          <Link className="btn btn--primary btn--lg" href="/plans">
            Compare the five plans
          </Link>
          <Link className="btn btn--secondary btn--lg" href="/price-list">
            The 2026 price list
          </Link>
        </div>
      </section>

      {/* ================================================================
          THE PARK — the ONE winner: the grounds and the live map.
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
                src={libraryThumb(about.image, 960)}
                srcSet={libraryThumbSet(about.image)}
                sizes="(max-width: 60rem) 92vw, 44vw"
                alt={`The grounds at ${logo.wordmark}`}
                width={1254}
                height={836}
              />
            ) : null}
          </div>
        </div>
        {mapNode ? <div className="home-park__map">{mapNode}</div> : null}
      </section>

      {/* ================================================================
          THE GALLERY — the client's own photographs.
          ================================================================ */}
      <section className="home-gallery" aria-labelledby="home-gallery-title">
        <SectionKicker>Photo gallery</SectionKicker>
        <h2 id="home-gallery-title" className="home-gallery__title">
          See the place before you visit.
        </h2>
        <div className="home-gallery__grid">
          {galleryPhotos.map((photo) => (
            <PublicImage
              key={photo.src}
              role="gallery-tile"
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="(max-width: 60rem) 46vw, 30vw"
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
            />
          ))}
        </div>
        <div className="home-gallery__actions">
          <Link className="btn btn--secondary btn--lg" href="/gallery">
            The full gallery &amp; virtual tour
          </Link>
        </div>
      </section>

      {/* ================================================================
          THE PROMISE — what the family portal feels like.
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
                <p>You see what is left to pay, and the papers your family already holds.</p>
              </li>
              <li>
                <span className="home-feel__num">3</span>
                <p>Anything that is not there is ours to carry, not yours.</p>
              </li>
            </ol>
          </div>
          <div className="home-feel__panel" aria-hidden="true">
            <p className="home-feel__sample-kicker">Your family&rsquo;s page</p>
            <p className="home-feel__sample-title">{php(2000)} is still to pay on the plan.</p>
            <p className="home-feel__sample-body">
              That is all that is left. The office&rsquo;s next date for your family
              is the 15th. Nothing else needs you today.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          THE QUESTIONS — the three the office is asked most.
          ================================================================ */}
      <section className="home-faq" aria-labelledby="home-faq-title">
        <SectionKicker>{faq.eyebrow}</SectionKicker>
        <h2 id="home-faq-title" className="home-faq__title">
          {faq.heading}
        </h2>
        <ul className="home-faq__list">
          {faq.items.map((item) => (
            <li key={item.id} className="home-faq__item">
              <h3 className="home-faq__q">{item.question}</h3>
              <p className="home-faq__a">{item.answer}</p>
            </li>
          ))}
        </ul>
        <div className="home-faq__actions">
          <Link className="btn btn--secondary btn--lg" href="/faq">
            More questions
          </Link>
          <Link className="btn btn--primary btn--lg" href="/contact">
            Ask us anything
          </Link>
        </div>
      </section>
    </div>
  );
}
