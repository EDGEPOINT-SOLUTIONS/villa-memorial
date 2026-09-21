/**
 * LandingView — the approved three-column "anchored catalogue" home
 * (Lavish villa-landing-plan). Presentational and server-safe on purpose:
 * it takes the LandingPage content document + an optional live-map node as
 * props and renders everything the root page shows, so the exact same view
 * (a) is unit-rendered by the repo's node tests and (b) can be previewed
 * inside the staff editor. No data fetching, no leaflet here.
 *
 * Internal navigation deliberately uses plain <a> anchors (not next/link) so
 * the view stays framework-free and renders identically under the repo's node
 * tests and inside the staff editor — full-page navigation to the interior
 * pages is correct for a marketing landing page.
 */
/* eslint-disable @next/next/no-html-link-for-pages -- see note above: framework-free view */
import type { ReactNode } from "react";
import type {
  BlogPost,
  LandingContent,
  MediaItem,
  RailConfig,
  RailItem,
  ServiceCard,
} from "@/lib/api-client/landing";
import { SiteHeaderBar } from "@/components/landing/site-header";
import { NextSteps } from "@/components/landing/next-steps";
import { PhoneActionBar } from "@/components/landing/phone-action-bar";
import { PlanBoard } from "@/components/landing/plan-board";
import { serviceCardIcon } from "@/components/landing/service-icons";
import { heroBackgroundLayer, heroTextColourStyle } from "@/lib/landing/hero-background";
import { PLAN_PACKAGES_IMAGE, libraryThumb, libraryThumbSet, serviceCardPhoto } from "@/lib/media";
import {
  lotCategoryFromPriceOf,
  type LotCategory,
  type PlanPricing,
} from "@/lib/pricing-model";
import { php } from "@/lib/villa-pricing";

export type LandingViewProps = {
  content: LandingContent;
  /**
   * The CURRENT plan tables + lot families (lib/api-client/pricing.ts
   * `loadPricingDocument()`), supplied by the page. The service cards' “from …”
   * line and the "Plan ahead" board derive every amount from these — never a
   * build-time constant — so an office edit is what the home prints.
   */
  planPricing: PlanPricing;
  lotCategories: LotCategory[];
  /** Live interactive park map (supplied by the page; optional in tests). */
  mapNode?: ReactNode;
  /** True when the real lot listing is available for the map intro. */
  mapLive?: boolean;
  sectionCount?: number;
};

/* ---------------------------------- bits ---------------------------------- */

/** Shared brand glyph — live in components/landing/brand-mark.tsx (imported here
 * and re-exported so surfaces that already import { BrandMark } from landing-view
 * keep working; one source of truth keeps every header/footer identical). */
import { BrandMark } from "@/components/landing/brand-mark";
export { BrandMark };

export function RailThumb({ item }: { item: RailItem }) {
  const glyph = (item.title.trim().charAt(0) || "•").toUpperCase();
  if (!item.image) {
    return (
      <span className="rail-thumb rail-thumb--fallback" aria-hidden="true">
        {glyph}
      </span>
    );
  }
  // A rail thumbnail paints at 4.5rem (the size this pass fixed); the library
  // asset behind it can be 2.6 MB. `libraryThumb` serves the published 320/640
  // px WebP instead and returns the original untouched for anything the
  // thumbnail pass does not know (a staff URL, a device upload) — lib/media.ts.
  return (
    <span className="rail-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element -- catalogue photo */}
      <img
        src={libraryThumb(item.image)}
        srcSet={libraryThumbSet(item.image)}
        sizes="4.5rem"
        alt=""
        loading="lazy"
      />
    </span>
  );
}

function RailItemLink({ item }: { item: RailItem }) {
  // The rail's ONE oversized lead image (captain's home review) — same link,
  // photo-card presentation with the caption laid over the photo.
  if (item.featured) {
    return (
      <a className="rail-item rail-item--lead" href={item.href}>
        <span className="rail-lead-flag">Lead</span>
        <RailThumb item={item} />
        <span className="rail-item__text">
          <span className="rail-item__title">{item.title}</span>
          {item.price ? <span className="rail-item__price">{item.price}</span> : null}
          {item.caption ? <span className="rail-item__caption">{item.caption}</span> : null}
        </span>
      </a>
    );
  }
  return (
    <a className="rail-item" href={item.href}>
      <RailThumb item={item} />
      <span className="rail-item__text">
        <span className="rail-item__title">{item.title}</span>
        {item.price ? <span className="rail-item__price">{item.price}</span> : null}
        {item.caption ? <span className="rail-item__caption">{item.caption}</span> : null}
      </span>
    </a>
  );
}

/**
 * One fixed rail: staff-editable heading + any number of pinned items (staff
 * can pin as many products/services/plans/links per rail as they want — the
 * rail scrolls internally, so an unlimited list never breaks the page).
 * Left rail carries the always-reachable 24/7 call card above its items; it
 * stays pinned while the rail list scrolls.
 */
export function RailPanel({
  config,
  side,
  contact,
}: {
  config: RailConfig;
  side: "left" | "right";
  contact: LandingContent["contact"];
}) {
  const phoneFirst = side === "left";
  return (
    <div className={`rail-panel ${phoneFirst ? "rail-panel--phone" : ""}`.trim()}>
      {phoneFirst ? (
        <div className="rail-call">
          <a className="rail-call__line" href={contact.phoneHref}>
            <span className="rail-call__top">
              <span className="rail-call__pulse" aria-hidden="true" />
              <span className="rail-call__label">{contact.phoneLabel}</span>
            </span>
            <span className="rail-call__number">{contact.phoneDisplay}</span>
            <span className="rail-call__hint">
              {contact.location} · every hour, every day
            </span>
          </a>
          {/* The home assistance card's one door to the Immediate Assistance
              screen (F-01): the number above stays the one-tap call. */}
          <a className="rail-call__assist" href="/immediate-assistance">
            What to do right now →
          </a>
        </div>
      ) : null}
      <h2 className="rail-heading">{config.heading}</h2>
      {config.items.length === 0 ? (
        <p className="rail-empty">Nothing pinned here yet.</p>
      ) : (
        <ul className="rail-list">
          {config.items.map((item) => (
            <li key={item.id}>
              <RailItemLink item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatPostDate(date: string): string {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** A single media attachment (photo or inline video with poster). When the
 * post carries a configured link (staff sets it on the "/" editor), photo
 * cells wrap in that anchor so clicking the photo navigates to the post's
 * route; videos stay playable and are never wrapped. */
function PostMedia({ media, href }: { media: MediaItem; href?: string | null }) {
  if (media.kind === "video") {
    return (
      <video className="post-media__video" controls preload="none" poster={media.poster ?? undefined}>
        <source src={media.src} />
        Your browser can&rsquo;t play this video.
      </video>
    );
  }
  // The staff-attached photo is served through `libraryThumb` for the same
  // reason the rail thumbnails are: the library holds print-sized uploads (the
  // lot tiles are 2.2–2.6 MB) and a newsfeed cell paints at ≤ 40rem, so four
  // posts used to ask a phone for ~12 MB of picture. An asset the thumbnail pass
  // does not know (a staff URL, a device upload) comes back unchanged.
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- staff-attached photo
    <img
      src={libraryThumb(media.src, 640)}
      srcSet={libraryThumbSet(media.src)}
      sizes="(max-width: 52rem) 92vw, 40rem"
      alt={media.alt ?? ""}
      loading="lazy"
    />
  );
  if (!href) return img;
  return (
    <a className="post-media__link" href={href} aria-label="Open linked story">
      {img}
    </a>
  );
}

/** Media rows layout like a newsfeed: single / pair / gallery (video spans).
 * The optional href (the post's configured route) threads through to photo
 * cells only — videos keep native playback. */
function PostMediaGrid({ media, href }: { media: MediaItem[]; href?: string | null }) {
  if (media.length === 0) return null;
  const singleVideo = media.length === 1 && media[0].kind === "video";
  const layout =
    singleVideo ? "post-media--solo-video"
    : media.length === 1 ? "post-media--solo"
    : media.length === 2 ? "post-media--pair"
    : "post-media--gallery";
  return (
    <div className={`post-media ${layout}`}>
      {media.map((m, i) => (
        <div key={`${m.kind}-${i}`} className={`post-media__cell${media.length > 2 && media.length % 2 === 1 && i === media.length - 1 ? " post-media__cell--span" : ""}`}>
          <PostMedia media={m} href={href} />
        </div>
      ))}
    </div>
  );
}

function BlogPostCard({ post, brand, lead = false }: { post: BlogPost; brand: string; lead?: boolean }) {
  const author = post.author || brand;
  // A post may carry the route/link staff configured in the "/" editor — when
  // set, the photo AND the caption become the door to that page; without one
  // the post stays a pure newsfeed item (no dead navigation).
  const linked = post.link && post.link.trim() ? post.link : null;
  const captionBody = post.caption ? (
    linked ? (
      <a className="post-card__caption-link" href={linked}>
        {post.caption}
      </a>
    ) : (
      post.caption
    )
  ) : null;
  return (
    <article className={lead ? "post-card post-card--lead" : "post-card"}>
      <header className="post-card__head">
        <span className="post-card__avatar" aria-hidden="true">
          {(author.trim().charAt(0) || "V").toUpperCase()}
        </span>
        <div className="post-card__byline">
          <span className="post-card__author">{author}</span>
          {post.date ? <span className="post-card__date">{formatPostDate(post.date)}</span> : null}
        </div>
      </header>
      <div className="post-card__body">
        {captionBody ? <p className="post-card__caption">{captionBody}</p> : null}
        <PostMediaGrid media={post.media} href={linked} />
      </div>
    </article>
  );
}

function ServiceCardLink({
  card,
  lotCategories,
  lead = false,
}: {
  card: ServiceCard;
  lotCategories: LotCategory[];
  /** The band's dominant card — the one that carries the photograph. */
  lead?: boolean;
}) {
  // The prototype's meta line ("from ₱75,000 · ₱1,125 / month, 6 yrs") is
  // DERIVED from the card's 2026 lot family — no amount is ever authored in
  // content (lib/pricing-model.ts is the one derivation home).
  const from = lotCategoryFromPriceOf(lotCategories, card.category);
  // …and so is the lead's photograph: the card stores a lot family + an icon
  // key, and those two name a REAL place in the park, so the lead shows the
  // client's own picture of it rather than an icon standing in for it
  // (lib/media.ts serviceCardPhoto — the same discipline as the price above).
  // Only the lead carries it: a picture repeated four times does not become four
  // pictures, it becomes wallpaper.
  const photo = lead ? serviceCardPhoto(card.icon) : null;
  return (
    <a className="svc-card" href={card.href}>
      {photo ? (
        // Decorative: the card's title already names the thing, so an alt text
        // here would only repeat the link's own words to a screen reader.
        <span className="svc-card__media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- client park photo */}
          <img src={photo} alt="" loading="lazy" width={720} height={480} />
        </span>
      ) : null}
      <span className="svc-card__body">
        <span className="svc-card__title">
          <span className="svc-card__icon" aria-hidden="true">
            {serviceCardIcon(card.icon)}
          </span>
          {card.title}
        </span>
        <span className="svc-card__text">{card.text}</span>
        {from ? (
          <span className="svc-card__meta">
            <span className="svc-card__from">from {php(from.selling)}</span>
            <span>· {php(from.monthly)} / month, 6 yrs</span>
          </span>
        ) : null}
      </span>
    </a>
  );
}

/* ------------------------------ main sections ------------------------------ */

/** Home header = the SAME shared bar every public page renders (SiteHeaderBar),
 * so navigating between the home and /services, /plans, /lots, /map never
 * changes the navigation. Framework-free: no active highlight here. */
function LandingHeader({ content }: { content: LandingContent }) {
  return <SiteHeaderBar brand={content.logo} contact={content.contact} />;
}

/* ------------------------- professional landing footer ------------------------- */

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h2 className="anchored-footer__col-title">{title}</h2>
      <ul className="anchored-footer__links">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shared public footer (blue/gold folio) — exported so PublicShell renders the
 * SAME footer on interior pages that the home renders, keeping the whole page
 * chrome stable while navigating. */
export function LandingFooter({ content }: { content: LandingContent }) {
  const { logo, contact } = content;
  const year = new Date().getFullYear();
  return (
    <footer className="anchored-footer">
      <div className="anchored-footer__inner">
        <div className="anchored-footer__grid">
          {/* Brand + one line */}
          <div className="anchored-footer__brand-col">
            <a className="anchored-header__brand" href="/">
              <BrandMark wordmark={logo.wordmark} markImage={logo.markImage} />
              <span className="anchored-header__wordmark">{logo.wordmark}</span>
            </a>
            <p className="anchored-footer__blurb">
              A family-run memorial park in <strong>{contact.location}</strong> —
              memorial &amp; funeral care that honors every life with dignity and
              light, day or night. The first memorial park in Basilan.
            </p>
          </div>

          {/* Quick links */}
          <FooterColumn
            title="Explore"
            links={[
              { label: "Home", href: "/" },
              { label: "Funeraria Memorial Services", href: "/services" },
              { label: "Smart Service Builder", href: "/builder" },
              { label: "Villa Memorial Plan", href: "/plans" },
              { label: "Browse the lots", href: "/lots" },
              { label: "Products & caskets", href: "/products" },
              { label: "Facilities", href: "/facilities" },
              { label: "Transport", href: "/transport" },
              { label: "Villa Memorial Park", href: "/map" },
              { label: "Photo gallery & virtual tour", href: "/gallery" },
              { label: "Digital memorial search", href: "/memorials" },
              { label: "Find my loved one", href: "/memorials/find" },
            ]}
          />

          {/* Services & plans links */}
          <FooterColumn
            title="Care & planning"
            links={[
              { label: "Death at home", href: "/services/death-at-home" },
              { label: "Death at hospital", href: "/services/death-at-hospital" },
              { label: "Villa Memorial Plan", href: "/plans" },
              { label: "Price list", href: "/price-list" },
              { label: "2026 lot price list", href: "/lots/price-list-2026" },
            ]}
          />

          {/* Contact */}
          <address className="anchored-footer__contact">
            <div className="anchored-footer__contact-line">
              <span className="anchored-footer__contact-label">{contact.phoneLabel}</span>
              <a className="anchored-footer__phone" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
            </div>
            {contact.secondPhoneDisplay.trim() && contact.secondPhoneHref.trim() ? (
              <div className="anchored-footer__contact-line">
                <span className="anchored-footer__contact-label">Second line</span>
                <a className="anchored-footer__phone" href={contact.secondPhoneHref}>
                  Call {contact.secondPhoneDisplay}
                </a>
              </div>
            ) : null}
            <div className="anchored-footer__contact-line">
              <span className="anchored-footer__contact-label">Open</span>
              <span className="anchored-footer__contact-value">Every hour, every day</span>
            </div>
            {contact.officeAddress.trim() ? (
              <div className="anchored-footer__contact-line">
                <span className="anchored-footer__contact-label">Main office</span>
                <span className="anchored-footer__contact-value">{contact.officeAddress}</span>
              </div>
            ) : null}
            {contact.parkAddress.trim() ? (
              <div className="anchored-footer__contact-line">
                <span className="anchored-footer__contact-label">Visit the park</span>
                <span className="anchored-footer__contact-value">
                  {contact.parkAddress}
                  <br />
                  <a href="/map">Map &amp; directions →</a>
                </span>
              </div>
            ) : null}
            <div className="anchored-footer__contact-line">
              <span className="anchored-footer__contact-label">Help</span>
              <span className="anchored-footer__contact-value">
                <a href="/contact">Contact us</a> · <a href="/faq">FAQ</a>
              </span>
            </div>
          </address>
        </div>

        <div className="anchored-footer__bottom">
          <span>
            © {year} {logo.wordmark}. All rights reserved. · <a href="/cart">Cart</a> ·{" "}
            <a href="/quote">Request a quote</a>
          </span>
          <span className="anchored-footer__portals">
            <a href="/client/login">Family sign-in</a>
            <a href="/agent/login">Agent sign-in</a>
            <a href="/login">Staff sign-in</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function HeroSection({ content }: { content: LandingContent }) {
  const { hero, logo, contact } = content;
  // Staff-chosen background colour (hero zone of the Landing Page editor): one
  // dedicated layer over the photo and under every copy block. Absent (null)
  // when no colour is set or transparency is 100% — the photograph is clear
  // (the old constant readability scrim was removed, captain 2026-09-21).
  const wash = heroBackgroundLayer(hero);
  // Image-only hero: a photograph and no authored copy. It renders the raw
  // photo — no brand, no buttons, no scrim, no gradient, no colour layer.
  const imageOnly =
    Boolean(hero.image) &&
    !hero.eyebrow.trim() &&
    !hero.headline.trim() &&
    !hero.subline.trim();
  return (
    <section
      className={`hero-home${hero.image ? " hero-home--photo" : ""}${imageOnly ? " hero-home--image-only" : ""}`}
      aria-label={imageOnly ? logo.wordmark : undefined}
      aria-labelledby={imageOnly ? undefined : "hero-home-title"}
    >
      {hero.image ? (
        <figure className="hero-home__photo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- staff-attached hero photo */}
          <img src={hero.image} alt="" />
        </figure>
      ) : null}
      {wash && !imageOnly ? <div className="hero-home__wash" aria-hidden="true" style={wash} /> : null}
      {imageOnly ? (
        // A pure photo hero still names the page for assistive tech.
        <h1 className="visually-hidden">{logo.wordmark}</h1>
      ) : (
        <>
          <div className="hero-home__brand">
            <BrandMark wordmark={logo.wordmark} markImage={logo.markImage} className="brand-mark--lg" />
            <span className="hero-home__wordmark">{logo.wordmark}</span>
          </div>
          {hero.eyebrow.trim() ? <p className="hero-home__eyebrow">{hero.eyebrow}</p> : null}
          <h1 id="hero-home-title" className="hero-home__title">
            {hero.headline}
          </h1>
          {hero.subline.trim() ? <p className="hero-home__lead">{hero.subline}</p> : null}
          <div className="hero-home__actions">
            <a className="btn btn--accent btn--lg" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </a>
            <a className="btn btn--secondary btn--lg" href={hero.secondaryCta.href}>
              {hero.secondaryCta.label}
            </a>
          </div>
          <p className="hero-home__careline">
            <a href={contact.phoneHref}>
              {contact.phoneLabel}: {contact.phoneDisplay}
            </a>{" "}
            — {contact.location}
          </p>
        </>
      )}
    </section>
  );
}

function AboutSection({ content }: { content: LandingContent }) {
  const { about } = content;
  return (
    <section className="mid-section" aria-labelledby="about-title">
      <div className="about-grid">
        <div>
          <p className="mid-kicker">Our story</p>
          <h2 id="about-title">{about.heading}</h2>
          <p className="about-story">{about.story}</p>
          <div className="about-cols">
            <div>
              <h3>Mission</h3>
              <p>{about.mission}</p>
            </div>
            <div>
              <h3>Vision</h3>
              <p>{about.vision}</p>
            </div>
          </div>
        </div>
        {about.image ? (
          <figure className="about-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- park photo */}
            <img
              src={libraryThumb(about.image, 640)}
              srcSet={libraryThumbSet(about.image)}
              sizes="(max-width: 75rem) 90vw, 24rem"
              alt="Villa Memorial Park grounds"
              loading="lazy"
            />
          </figure>
        ) : null}
      </div>
    </section>
  );
}

function ServicesSection({ content, lotCategories }: { content: LandingContent; lotCategories: LotCategory[] }) {
  const { services } = content;
  // The band's composition (captain 2026-09-18): the first card leads with the
  // client's photograph of the place it sells, the rest follow as
  // hairline-separated entries. Four equal boxes became one dominant element and
  // three supporting ones — the eye can no longer count the band as a grid.
  const [lead, ...rest] = services.items;
  return (
    <section className="mid-section" aria-labelledby="services-title">
      <p className="mid-kicker">{services.kicker}</p>
      <h2 id="services-title">{services.heading}</h2>
      <p className="mid-sub">{services.intro}</p>
      {services.items.length === 0 || !lead ? (
        <p className="mid-empty">Service cards will appear here once staff publishes them.</p>
      ) : (
        <div className="svc-grid">
          <div className="svc-band__lead">
            <ServiceCardLink card={lead} lotCategories={lotCategories} lead />
          </div>
          {rest.length > 0 ? (
            <ul className="svc-band__list">
              {rest.map((card) => (
                <li className="svc-band__entry" key={card.id}>
                  <ServiceCardLink card={card} lotCategories={lotCategories} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  );
}

/** "Plan ahead" — the prototype's Villa Memorial Plan board: the promo figure
 * beside the tier × term board (switch · table · footnote · partner logos).
 * Every amount on the board comes from the current pricing document. */
function PlansSection({ content, planPricing }: { content: LandingContent; planPricing: PlanPricing }) {
  const { plans } = content;
  return (
    <section className="mid-section" aria-labelledby="vmp-title">
      <p className="mid-kicker">{plans.kicker}</p>
      <h2 id="vmp-title">{plans.heading}</h2>
      <p className="mid-sub">{plans.intro}</p>
      <div className="plan-band">
        <figure className="promo-figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded promo art */}
          <img
            src={libraryThumb(PLAN_PACKAGES_IMAGE, 640)}
            srcSet={libraryThumbSet(PLAN_PACKAGES_IMAGE)}
            sizes="(max-width: 88rem) 90vw, 30rem"
            alt="Villa Memorial Plan — comprehensive packages for your peace of mind"
          />
        </figure>
        <PlanBoard note={plans.note} pricing={planPricing} />
      </div>
    </section>
  );
}

function BlogSection({ content }: { content: LandingContent }) {
  const { blog, logo } = content;
  // Newsfeed composition: the newest story leads the band at full width, the
  // rest sit two-up beneath it. Four identical stacked cards became a feed with
  // a clear first item — the same "one dominant element" rule as the bands.
  const [lead, ...rest] = blog.posts;
  return (
    <section className="mid-section" aria-labelledby="blog-title">
      <p className="mid-kicker">Newsfeed</p>
      <h2 id="blog-title">{blog.heading}</h2>
      <p className="mid-intro">{blog.intro}</p>
      {blog.posts.length === 0 || !lead ? (
        <p className="mid-empty">Stories will appear here once staff publishes the first post.</p>
      ) : (
        <div className="blog-feed">
          <BlogPostCard post={lead} brand={logo.wordmark} lead />
          {rest.map((post) => (
            <BlogPostCard key={post.id} post={post} brand={logo.wordmark} />
          ))}
        </div>
      )}
    </section>
  );
}

function MapSection({
  content,
  mapNode,
  mapLive,
  sectionCount,
}: {
  content: LandingContent;
  mapNode?: ReactNode;
  mapLive?: boolean;
  sectionCount?: number;
}) {
  const { map } = content;
  return (
    <section className="mid-section mid-section--map" aria-labelledby="map-title">
      <p className="mid-kicker">Interactive map</p>
      <h2 id="map-title">{map.heading}</h2>
      <p className="mid-intro">
        {map.intro}
        {mapLive && sectionCount !== undefined && sectionCount > 0
          ? ` Explore all ${sectionCount} sections — click any plot to see its type, status and asking price.`
          : ""}
      </p>
      <div className="map-embed">
        {mapNode ?? (
          <p className="mid-empty">The live park map is momentarily unavailable — open the full map directly.</p>
        )}
      </div>
      <p className="mid-note">
        Tip: the same map lives at <a href="/map">/map</a> — share any plot deep link, e.g.{" "}
        <a href="/map?park=villa&amp;plot=A-001">/map?park=villa&amp;plot=A-001</a>.
      </p>
    </section>
  );
}

/* --------------------------------- the view --------------------------------- */

export function LandingView({ content, planPricing, lotCategories, mapNode, mapLive, sectionCount }: LandingViewProps) {
  // Author-settable hero copy colour: ONE custom property on the page shell, so
  // both the hero copy rules and the left rail's 24/7 call card read the same
  // ink (captain's 2026-09-21 direction). null keeps the shipped token ink.
  const heroTextStyle = heroTextColourStyle(content.hero);
  return (
    <div className="anchored-page has-phonebar" style={heroTextStyle ?? undefined}>
      <LandingHeader content={content} />
      <div className="anchored-grid">
        <aside className="anchored-rail anchored-rail--left" aria-label="Care and services">
          <RailPanel config={content.rails.left} side="left" contact={content.contact} />
        </aside>

        <main id="main" className="anchored-mid">
          <div className="anchored-mid__inner">
            <HeroSection content={content} />
            <AboutSection content={content} />
            <ServicesSection content={content} lotCategories={lotCategories} />
            <PlansSection content={content} planPricing={planPricing} />
            <MapSection
              content={content}
              mapNode={mapNode}
              mapLive={mapLive}
              sectionCount={sectionCount}
            />
            {/* The live park map sits BEFORE the newsfeed — visitors see the
                grounds they can walk, then the park's stories. */}
            <BlogSection content={content} />
          </div>
        </main>

        <aside className="anchored-rail anchored-rail--right" aria-label="Plans and lots">
          <RailPanel config={content.rails.right} side="right" contact={content.contact} />
        </aside>
      </div>
      {/* The home ends on the same three options every public page ends on
          (F-17) — the band the interior pages get from PublicShell. */}
      <NextSteps contact={content.contact} />
      <PhoneActionBar contact={content.contact} />
      <LandingFooter content={content} />
    </div>
  );
}

export default LandingView;
