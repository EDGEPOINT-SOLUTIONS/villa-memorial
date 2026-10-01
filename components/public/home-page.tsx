import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/public-forms/contact-form";
import { HomeCostBuilder } from "@/components/public/home-cost-builder";
import { HomeTitleRotator } from "@/components/public/home-title-rotator";

import { HomePlotExplorer } from "@/components/public/home-plot-explorer";
import { PublicImage } from "@/components/public/public-image";
import { SectionHead } from "@/components/public/section-head";
import { ItemQuoteButton } from "@/components/villa/item-quote-button";
import { IconChapel, ServiceIcons } from "@/components/villa/service-icons";
import { catalogueItemPhoto } from "@/lib/catalogue-imagery";
import { ALACARTE_LINES } from "@/lib/catalogue-skus";
import { directionsUrl } from "@/lib/location-map";
import {
  COFFINS,
  PLAN_TIERS,
  php,
} from "@/lib/villa-pricing";
import { planRateOf, type LotCategory } from "@/lib/pricing-model";
import {
  PARK_MAP_DERIVATIVE,
  SERVICE_SAMPLE_NOTE,
  compositionThumbSet,
  libraryThumb,
  libraryThumbSet,
} from "@/lib/media";
import {
  homeBuilderModel,
  homeLotInventory,
  lotRowFor,
  recordedPlotCount,
  type HomeLotRow,
} from "@/lib/home-model";
import type { BuilderCatalog } from "@/lib/service-builder";
import type { Lot } from "@/lib/api-client/property";
import type { Cta, LandingContent } from "@/lib/api-client/landing";
import type { PlanPricing } from "@/lib/pricing-model";

/**
 * HomePage — the public home, RE-VISIONED 2026-10-02 for the captain's standing
 * brief (one approved language, nothing above ~40px, familiar over inventive,
 * empathetic pacing, not crowded, one clear action per step, no unnecessary
 * large imagery). The same product and the same truth as the seven-band page it
 * replaces, composed better.
 *
 * SIX bands, in the order a family actually needs them:
 *
 *   1 · the opening    TWO text rows — the office's rotating title set
 *                      (captain, 2026-10-02) and the ONE action that matters,
 *                      beside the park's own entrance photograph at a
 *                      right-sized frame
 *   2 · the arrange    the live cost builder (the band's lead) + the two rooms
 *   3 · the grounds    the pinned masterplan + the four lot families, priced
 *   4 · plan ahead     the five rising tiers, a rate card
 *   5 · the services   five scannable lines, Request-for-Quote only — NO amount
 *   6 · contact        the enquiry form, the map and the office's real numbers
 *
 * THE OPENING IS TWO ROWS (main, 6dc03dc — the captain's "shorter, simpler, just
 * relax"). The place line, the title set, both actions and the facts ribbon
 * stay; the lead paragraph is NOT printed, because the any-hour promise already
 * reads in the promise line, the call button and the ribbon. The lead stays in
 * the content store for the editor to use elsewhere.
 *
 * THE TITLE IS STILL THE OFFICE'S. Band 1 renders `HomeTitleRotator` (main,
 * b250513): the h1 itself is the client component, the sets cross-fade on the
 * office's interval, and the band keeps `aria-labelledby="home-gateway-title"`
 * because that is the id the component stamps on the heading. Its type step and
 * its promise line are declared for the component's own classes alongside this
 * band's (one rule, two selectors), so the rotation changed no visual decision.
 *
 * UNIFORM CONTENT WIDTH (captain, 2026-10-02). Every band is a direct child of
 * `.home` and no band, grid or inner panel declares a second measure — the page
 * has ONE envelope (the folio) and the only `max-width` left in this block
 * bounds a PARAGRAPH, never a band's content. That is what stopped the 2nd, 5th
 * and 6th bands reading narrower than the rest.
 *
 * WHAT THE RE-VISION CUTS, and why (each is a decision, not an omission):
 *   · the 74rem hero photograph BAND — the picture now sits beside the words it
 *     supports at a 3:2 / 22rem ceiling. A band whose only content is a
 *     1184px-wide picture is the "unnecessary large imagery" the brief names.
 *   · the four lot MARKETING TILES — the masterplan is the honest picture of
 *     the grounds, and the four families read better as four priced rows than
 *     as four near-identical squares. The plots behind the tiles were
 *     illustrations; the map is the client's own drawing.
 *   · the five rising ARCH shapes — decoration that fought the figures. The
 *     tiers now read as a rate card: the monthly leads, the name supports, and
 *     the sheet's own difference line sits behind one disclosure.
 *   · the five service PLATES at tile size — a row of five small dark pictures
 *     is noise. Each line keeps its photograph as a 5.5rem identification plate,
 *     read from the ONE catalogue-imagery map (/services shows the same picture
 *     for the same line), and its one-line description from the SAME services
 *     page document — so a line is never a bare label beside a button, and the
 *     home's copy can never drift from the services page's.
 *   · the centred-everything rhythm — every band was centred, so nothing led.
 *     The heads are now the shared `SectionHead` shape (kicker · title · one
 *     action at the right) and each band has exactly one dominant element.
 *     The centred `.home-band-head` grammar is NOT retired — `/contact`,
 *     `/gallery`, `/price-list`, `/facilities` and `/park` still render it; it
 *     moved out of the home's own stylesheet block, which is where it belongs
 *     now that the home does not use it.
 *
 * DESIGN RULES THAT ARE BINDING (captain, 2026-10-02):
 *   · NOTHING on this page is above the ladder's own top step. The h1 rides
 *     `--text-page-title` (35.2px at the 80% root); the previous 86.4px "1.5×"
 *     gateway scale is gone. Hierarchy is weight, colour and space.
 *   · the gold call and its gold-outline pair are the ONE gold action pair on
 *     the page (office, inbox 041); per-line commerce wears the item gold.
 *   · the section heads are centred NO LONGER; the action sits at the right.
 *
 * EVERY FIGURE IS A READ: plan monthlies AND the yearly figure beside them from
 * the pricing store, casket and service figures from the live catalogue + 2026
 * sheets, lot areas and totals from the pricing store, plot pins and each
 * family's open count from the plot records' own outlines. The services band
 * prints no amount; the contact form keeps the Data Privacy Act consent line.
 * The home is edited section by section at /staff/landing/home.
 */

/* ---------------------------- photograph helpers ---------------------------- */

type Photo = {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  alt?: string;
};

/**
 * Intrinsic hints for the whole photographs. The values are the shipped
 * derivatives' real sizes; an asset outside this map (a staff URL, a device
 * upload) gets a 3:2 hint, which is the shape of every photo the page uses.
 */
const PHOTO_HINTS: Readonly<Record<string, { width: number; height: number }>> = {
  "hero-1-960.webp": { width: 960, height: 541 },
  "the-very-first-memorial-park-in-basilan-960.webp": { width: 940, height: 788 },
  "at-need-services-960.webp": { width: 547, height: 365 },
  "transport-960.webp": { width: 678, height: 452 },
};

function photo(src: string, thumbWidth: 320 | 640 | 960 = 960): Photo {
  const resolved = libraryThumb(src, thumbWidth);
  const srcSet = libraryThumbSet(src) ?? compositionThumbSet(src);
  const file = resolved.split("/").pop() ?? "";
  const hint = PHOTO_HINTS[file] ?? { width: 960, height: 640 };
  return { src: resolved, srcSet, width: hint.width, height: hint.height };
}

/* ---------------------------------- view ---------------------------------- */

export function HomePage({
  content,
  pricing,
  lotCategories,
  builder,
  lots,
  mapSrc,
  chapelResources,
  serviceNotes,
}: {
  content: LandingContent;
  pricing: PlanPricing;
  lotCategories: ReadonlyArray<LotCategory>;
  builder: BuilderCatalog;
  lots: ReadonlyArray<Lot>;
  /** The embedded-map URL, built server-side (the API key never reaches client JS). */
  mapSrc: string;
  /** The chapel resources from the schedule store — their caps are figures. */
  chapelResources: ReadonlyArray<{ id: string; name: string; capacity: number }>;
  /**
   * The five a-la-carte one-line descriptions, read from the SAME services page
   * document /services prints (lib/service-content.ts). One content home: the
   * home's service line and the services page's line are the same sentence.
   */
  serviceNotes: Readonly<Record<string, string>>;
}) {
  const { contact, home } = content;
  const gateway = home.gateway;
  const park = home.park;
  const builderModel = homeBuilderModel(park.builder, builder);
  const groups = homeLotInventory(lots, home.lots.items);
  const rows: Record<string, HomeLotRow | null> = Object.fromEntries(
    home.lots.items.map((tile) => [tile.id, lotRowFor(lotCategories, tile)]),
  );
  const tierRows = PLAN_TIERS.map((tier) => {
    const coffin = COFFINS.find((entry) => entry.tier === tier.name);
    return {
      ...tier,
      monthly: planRateOf(pricing, tier.id, "monthly", false),
      annual: planRateOf(pricing, tier.id, "annual", false),
      seniorMonthly: planRateOf(pricing, tier.id, "monthly", true),
      description: coffin?.description ?? "",
      lid: coffin?.lid ?? "",
    };
  });
  const heroPhoto = home.photo.image ? photo(home.photo.image) : null;
  const parkPhoto = park.image ? photo(park.image) : null;
  const parkMapSrc = PARK_MAP_DERIVATIVE;
  const plotCount = recordedPlotCount(groups);
  // The opening's caption is READ from the office's own recorded address (its
  // place name), never a new typed string.
  const parkName =
    contact.parkAddress.split(",")[0]?.trim() || contact.location || "Villa Memorial Park";

  const directions: Cta = {
    label: home.contact.directionsLabel,
    href: directionsUrl("google", contact.parkAddress),
  };

  return (
    <div className="home">
      {/* The entrance overlay is NOT here: the route that renders this page
          (`app/(public)/page.tsx`) reads the session cookie and puts the
          cloud sign in the HTML for an unseen visitor, so the home itself
          stays a server component whose own content never moves. Its welcome
          line stays in the content store (home.intro), edited in the home
          editor. */}
      {/* ================================================================
          1 · THE OPENING — the words, the one action, the park's own gate.
          ================================================================ */}
      <section className="home-open" aria-labelledby="home-gateway-title">
        <div className="home-open__words">
          {gateway.place ? <p className="home-open__eyebrow">{gateway.place}</p> : null}
          {/* The band's title is a rotating set of pairs (captain, 2026-10-02):
              one set at a time, cross-fading on the office's interval. The
              client component renders the h1 and keeps `id="home-gateway-title"`
              so this section's aria-labelledby still resolves — that is why
              THIS band is labelled by the gateway's id, not its own: the
              heading is the office's, and it is inside the re-visioned band. */}
          <HomeTitleRotator
            sets={gateway.titleSets}
            intervalSeconds={gateway.titleIntervalSeconds}
          />
          {/* TWO ROWS, no lead paragraph (main, 6dc03dc — the captain's
              "shorter, simpler, just relax"). The any-hour promise already
              lives in the promise line, the call button and the facts ribbon
              below, so a third line said it a third time. The lead stays in
              the content store for the editor; the band does not print it. */}
          <div className="home-open__actions">
            <a className="btn btn--accent home-call" href={contact.phoneHref}>
              <Phone size={18} aria-hidden="true" />
              {contact.phoneDisplay}
            </a>
            {/* The office's explicit override (inbox 041): this ONE band action
                wears the call's gold as an outline, so the pair reads as a
                deliberate set. The variant lives in the stylesheet and is not
                for other bands; the call keeps the solid fill. */}
            <Link className="btn btn--secondary btn--gold-outline" href={gateway.secondary.href}>
              {gateway.secondary.label}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <ul className="home-open__trust">
            {gateway.facts.map((fact, index) => {
              const Icon = [Clock, MapPin, ShieldCheck][index % 3];
              return (
                <li key={fact.id} className="home-trust__item">
                  <Icon size={18} aria-hidden="true" />
                  <b>{fact.label}</b>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="home-open__media">
          {heroPhoto ? (
            <PublicImage
              src={heroPhoto.src}
              srcSet={heroPhoto.srcSet}
              sizes={heroPhoto.srcSet ? "(max-width: 64rem) 92vw, 26rem" : undefined}
              alt={home.photo.alt}
              role="band-lead"
              width={heroPhoto.width}
              height={heroPhoto.height}
              // The one picture above the fold: it is the page's LCP image.
              priority
              caption={
                <>
                  <span className="home-open__caption-kicker">{home.photo.kicker}</span>
                  <span className="home-open__caption-name">{parkName}</span>
                </>
              }
            />
          ) : (
            <div className="home-engraved home-engraved--band" role="img" aria-label={home.photo.alt}>
              {home.photo.alt}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          2 · ARRANGE IT — the live cost builder, then the two rooms.
          ================================================================ */}
      <section className="home-arrange" aria-labelledby="home-arrange-title">
        <div className="home-arrange__grid">
          <div className="home-arrange__builder">
            <HomeCostBuilder
              model={builderModel}
              title={park.builder.title}
              titleId="home-arrange-title"
              note={park.builder.note}
              secondary={park.builder.secondary}
              contact={contact}
            />
          </div>
          <div className="home-arrange__rooms">
            {parkPhoto ? (
              <PublicImage
                src={parkPhoto.src}
                srcSet={parkPhoto.srcSet}
                sizes={parkPhoto.srcSet ? "(max-width: 64rem) 92vw, 22rem" : undefined}
                alt={park.imageAlt}
                role="band-lead"
                width={parkPhoto.width}
                height={parkPhoto.height}
                className="home-arrange__plate"
              />
            ) : null}
            <h3 className="home-rooms__title">{park.chapelsHeading}</h3>
            <ul className="home-rooms">
              {park.chapels.map((chapel) => {
                const chapelPhoto = chapel.image ? photo(chapel.image, 640) : null;
                const resource = chapelResources.find((entry) => entry.id === chapel.resourceId);
                return (
                  <li key={chapel.id} className="home-room">
                    {chapelPhoto ? (
                      <PublicImage
                        src={chapelPhoto.src}
                        srcSet={chapelPhoto.srcSet}
                        sizes="7rem"
                        alt={`${chapel.name} — ${chapel.kind}`}
                        role="card"
                        width={chapelPhoto.width}
                        height={chapelPhoto.height}
                        className="home-room__plate"
                      />
                    ) : (
                      <span className="home-engraved home-engraved--chapel" aria-hidden="true">
                        {chapel.name}
                      </span>
                    )}
                    <div className="home-room__body">
                      <p className="home-room__name">
                        {chapel.name} <span className="home-room__kind">{chapel.kind}</span>
                      </p>
                      <p className="home-room__what">{chapel.what}</p>
                      <p className="home-room__cap">
                        {resource ? `Fits about ${resource.capacity} people. ` : ""}
                        {chapel.caption}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link className="section-head__link" href={park.chapelsAction.href}>
              {park.chapelsAction.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          3 · THE GROUNDS — the pinned masterplan + the four lot families.
          ================================================================ */}
      <HomePlotExplorer
        kicker={home.lots.kicker}
        heading={home.lots.heading}
        action={home.lots.action}
        quote={home.lots.quote}
        groups={groups}
        rows={rows}
        mapSrc={parkMapSrc}
        mapAlt={`The Villa Memorial Park map, with all ${plotCount} recorded plots`}
      />

      {/* ================================================================
          4 · PLAN AHEAD — the five tiers as a rate card.
          ================================================================ */}
      <section className="home-plans" aria-labelledby="home-plans-title">
        <SectionHead
          id="home-plans-title"
          kicker={home.plans.kicker}
          title={home.plans.heading}
          action={
            <Link className="btn btn--secondary" href={home.plans.action.href}>
              {home.plans.action.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <ul className="home-rates">
          {tierRows.map((tier, index) => (
            <li
              key={tier.id}
              className={`home-rate${index === tierRows.length - 1 ? " home-rate--gold" : ""}`}
            >
              <p className="home-rate__name">{tier.name}</p>
              <p className="home-rate__price">
                {php(tier.monthly)}
                <span className="home-rate__unit"> / month</span>
              </p>
              {/* The same plan read on the sheet's other terms, so the monthly
                  is never a figure without a scale: the year's own figure and
                  the tier's lid line — what actually separates the five. */}
              <p className="home-rate__scale">
                {php(tier.annual)} a year
                {tier.lid ? <span className="home-rate__lid">{tier.lid}</span> : null}
              </p>
              <details className="home-rate__more">
                <summary>What&rsquo;s different</summary>
                {tier.description ? <p>{tier.description}</p> : null}
                {tier.lid ? (
                  <p className="home-rate__more-lid">
                    <b>Lid:</b> {tier.lid}
                  </p>
                ) : null}
                <p className="home-rate__more-senior">
                  Senior citizen: <b>{php(tier.seniorMonthly)} / month</b>
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* ================================================================
          5 · THE SERVICES — five scannable lines. NO amounts (minute 5).
          ================================================================ */}
      <section className="home-services" aria-labelledby="home-services-title">
        <SectionHead
          id="home-services-title"
          kicker={home.services.kicker}
          title={home.services.heading}
          action={
            <Link className="btn btn--secondary" href={home.services.action.href}>
              {home.services.action.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <ul className="home-service-list">
          {home.services.items.map((tile) => {
            // The plate comes from the ONE catalogue-imagery map (the same
            // photograph /services shows for this line), not from a URL typed
            // into this view. The landing store's own image stays the fallback
            // for a line the map does not know; a line with neither picture
            // gets the service's own line icon on the quiet wash, never an
            // empty grey box.
            const sku =
              ALACARTE_LINES.find((fee) => fee.service === tile.service)?.sku ??
              `QUOTE-${tile.service.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
            const mapped = catalogueItemPhoto(sku);
            const tilePhoto = tile.image ? photo(tile.image, 640) : null;
            const plate: Photo | null = mapped
              ? { src: mapped.src, srcSet: mapped.srcSet, width: mapped.width ?? 960, height: mapped.height ?? 640, alt: mapped.alt }
              : tilePhoto
                ? { ...tilePhoto, alt: tile.imageAlt }
                : null;
            const IconShape = ServiceIcons[tile.service] ?? IconChapel;
            return (
              <li key={tile.id} className="home-service-row">
                {plate ? (
                  <PublicImage
                    src={plate.src}
                    srcSet={plate.srcSet}
                    sizes="5.5rem"
                    alt={plate.alt ?? tile.imageAlt}
                    role="card"
                    width={plate.width}
                    height={plate.height}
                    className="home-service-row__plate"
                  />
                ) : (
                  <span className="home-service-row__plate home-service-row__plate--icon" aria-hidden="true">
                    <IconShape />
                  </span>
                )}
                <div className="home-service-row__body">
                  <p className="home-service-row__name">{tile.label}</p>
                  {/* The staff-editable one-liner /services prints for this
                      line — the same content home, never a sentence typed here. */}
                  {serviceNotes[tile.service] ? (
                    <p className="home-service-row__note">{serviceNotes[tile.service]}</p>
                  ) : null}
                </div>
                {/* The action ADDS THE LINE to the quote basket (office, inbox
                    047); its label is the staff-editable one from the content
                    store. The SKU is the a-la-carte sheet line the tile names,
                    so the office quotes the exact catalogue item. */}
                <span className="home-service-row__action">
                  <ItemQuoteButton
                    lines={[
                      {
                        sku,
                        name: tile.service,
                        detail: "A-la-carte service — applies when the family does not take a package.",
                      },
                    ]}
                    name={tile.label}
                    label={tile.quote.label}
                  />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="home-services__note">{SERVICE_SAMPLE_NOTE}</p>
        {/* The one action for all five service lines (inbox 047). */}
        <div className="home-services__all">
          <ItemQuoteButton
            lines={ALACARTE_LINES.map((fee) => ({
              sku: fee.sku,
              name: fee.service,
              detail: "A-la-carte service — applies when the family does not take a package.",
            }))}
            name="At-need services — all five"
            label={home.services.allQuote.label}
          />
        </div>
      </section>

      {/* ================================================================
          6 · CONTACT — the enquiry form, the map and the real numbers.
          ================================================================ */}
      <section className="home-contact" aria-labelledby="home-contact-title">
        <SectionHead
          id="home-contact-title"
          kicker={home.contact.kicker}
          title={home.contact.heading}
          lead={home.contact.lead}
        />
        <div className="home-contact__grid">
          <div className="home-contact__form">
            <ContactForm />
          </div>
          <div className="home-contact__place">
            <h3 className="home-contact__map-title">{home.contact.mapTitle}</h3>
            <iframe
              className="home-contact__map"
              title={`Google map showing ${contact.parkAddress}`}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <p className="home-contact__addr">{contact.parkAddress}</p>
            {contact.officeAddress ? (
              <p className="home-contact__office">The office: {contact.officeAddress}</p>
            ) : null}
            {contact.secondPhoneDisplay ? (
              <p className="home-contact__office">
                Second line:{" "}
                <a href={contact.secondPhoneHref}>{contact.secondPhoneDisplay}</a>
              </p>
            ) : null}
            <p className="home-contact__note">{home.contact.mapNote}</p>
            <a className="btn btn--secondary" href={directions.href}>
              {directions.label}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
