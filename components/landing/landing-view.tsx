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
  PlanCard,
  RailConfig,
  RailItem,
  ServiceDetail,
} from "@/lib/api-client/landing";

export type LandingViewProps = {
  content: LandingContent;
  /** Live interactive park map (supplied by the page; optional in tests). */
  mapNode?: ReactNode;
  /** True when the real lot listing is available for the map intro. */
  mapLive?: boolean;
  sectionCount?: number;
};

/* ---------------------------------- bits ---------------------------------- */

/** Editable mark: uploaded mark image, else a gold serif monogram fallback. */
export function BrandMark({
  wordmark,
  markImage,
  className = "",
}: {
  wordmark: string;
  markImage: string | null;
  className?: string;
}) {
  const glyph = (wordmark.trim().charAt(0) || "V").toUpperCase();
  if (markImage) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded staff logo
    return <img src={markImage} alt="" className={`brand-mark brand-mark--img ${className}`.trim()} />;
  }
  return (
    <span aria-hidden="true" className={`brand-mark brand-mark--mono ${className}`.trim()}>
      {glyph}
    </span>
  );
}

export function RailThumb({ item }: { item: RailItem }) {
  const glyph = (item.title.trim().charAt(0) || "•").toUpperCase();
  return item.image ? (
    <span className="rail-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element -- catalogue photo */}
      <img src={item.image} alt="" loading="lazy" />
    </span>
  ) : (
    <span className="rail-thumb rail-thumb--fallback" aria-hidden="true">
      {glyph}
    </span>
  );
}

function RailItemLink({ item }: { item: RailItem }) {
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
        <a className="rail-call" href={contact.phoneHref}>
          <span className="rail-call__top">
            <span className="rail-call__pulse" aria-hidden="true" />
            <span className="rail-call__label">{contact.phoneLabel}</span>
          </span>
          <span className="rail-call__number">{contact.phoneDisplay}</span>
          <span className="rail-call__hint">
            {contact.location} · every hour, every day
          </span>
        </a>
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

/** A single media attachment (photo or inline video with poster). */
function PostMedia({ media }: { media: MediaItem }) {
  if (media.kind === "video") {
    return (
      <video className="post-media__video" controls preload="none" poster={media.poster ?? undefined}>
        <source src={media.src} />
        Your browser can&rsquo;t play this video.
      </video>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- staff-attached photo
  return <img src={media.src} alt={media.alt ?? ""} loading="lazy" />;
}

/** Media rows layout like a newsfeed: single / pair / gallery (video spans). */
function PostMediaGrid({ media }: { media: MediaItem[] }) {
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
          <PostMedia media={m} />
        </div>
      ))}
    </div>
  );
}

function BlogPostCard({ post, brand }: { post: BlogPost; brand: string }) {
  const author = post.author || brand;
  return (
    <article className="post-card">
      <header className="post-card__head">
        <span className="post-card__avatar" aria-hidden="true">
          {(author.trim().charAt(0) || "V").toUpperCase()}
        </span>
        <div className="post-card__byline">
          <span className="post-card__author">{author}</span>
          {post.date ? <span className="post-card__date">{formatPostDate(post.date)}</span> : null}
        </div>
      </header>
      {post.caption ? <p className="post-card__caption">{post.caption}</p> : null}
      <PostMediaGrid media={post.media} />
    </article>
  );
}

function PlanCardLink({ plan }: { plan: PlanCard }) {
  return (
    <a className="plan-card" href={plan.href}>
      <span className="plan-card__media">
        {plan.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- plan photo
          <img src={plan.image} alt={plan.name} loading="lazy" />
        ) : (
          <span className="plan-card__media-empty" aria-hidden="true">
            {(plan.name.charAt(0) || "P").toUpperCase()}
          </span>
        )}
      </span>
      <span className="plan-card__body">
        {plan.badge ? <span className="plan-card__badge">{plan.badge}</span> : null}
        <span className="plan-card__name">{plan.name}</span>
        <span className="plan-card__price">{plan.price}</span>
        {plan.note ? <span className="plan-card__note">{plan.note}</span> : null}
      </span>
    </a>
  );
}

function ServiceBlock({ service, index }: { service: ServiceDetail; index: number }) {
  return (
    <article className="service-block">
      <span className="service-block__num" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="service-block__text">
        <h3>{service.title}</h3>
        {service.tagline ? <p className="service-block__tagline">{service.tagline}</p> : null}
        {service.body.map((para, pi) => (
          <p key={`${service.id}-p${pi}`} className="service-block__body">
            {para}
          </p>
        ))}
        {service.bullets.length > 0 ? (
          <ul className="service-block__bullets">
            {service.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
        <a className="service-block__link" href={service.link.href}>
          {service.link.label} →
        </a>
      </div>
      {service.image ? (
        <figure className="service-block__media">
          {/* eslint-disable-next-line @next/next/no-img-element -- service photo */}
          <img src={service.image} alt={service.title} loading="lazy" />
        </figure>
      ) : null}
    </article>
  );
}

/* ------------------------------ main sections ------------------------------ */

function LandingHeader({ content }: { content: LandingContent }) {
  const { logo, contact } = content;
  return (
    <header className="anchored-header">
      <div className="anchored-header__bar">
        <a className="anchored-header__brand" href="/">
          <BrandMark wordmark={logo.wordmark} markImage={logo.markImage} />
          <span className="anchored-header__wordmark">{logo.wordmark}</span>
        </a>
        <nav className="anchored-header__nav" aria-label="Sections">
          <a href="/services">Services</a>
          <a href="/plans">Plans</a>
          <a href="/lots">Lots</a>
          <a href="/map">Park map</a>
          <a href="/cart">Cart</a>
          <a href="/contact">Contact</a>
        </nav>
        <div className="anchored-header__actions">
          <a className="anchored-header__phone" href={contact.phoneHref}>
            <span className="anchored-header__phone-label">{contact.phoneLabel}</span>
            <span className="anchored-header__phone-number">{contact.phoneDisplay}</span>
          </a>
          <a className="anchored-header__signin" href="/login">
            Sign in
          </a>
        </div>
      </div>
    </header>
  );
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

function LandingFooter({ content }: { content: LandingContent }) {
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
              { label: "Services", href: "/services" },
              { label: "Memorial plans & lots", href: "/plans" },
              { label: "Browse the lots", href: "/lots" },
              { label: "Products & caskets", href: "/products" },
              { label: "Transport", href: "/transport" },
              { label: "Park map", href: "/map" },
            ]}
          />

          {/* Services & plans links */}
          <FooterColumn
            title="Care & planning"
            links={[
              { label: "Death at home", href: "/services/death-at-home" },
              { label: "Death at hospital", href: "/services/death-at-hospital" },
              { label: "Villa Memorial Plan", href: "/plans/villa-memorial-plan" },
              { label: "Compare plans", href: "/plans/compare" },
              { label: "2026 price list", href: "/lots/price-list-2026" },
            ]}
          />

          {/* Contact */}
          <address className="anchored-footer__contact">
            <div className="anchored-footer__contact-line">
              <span className="anchored-footer__contact-label">{contact.phoneLabel}</span>
              <a className="anchored-footer__phone" href={contact.phoneHref}>
                {contact.phoneDisplay}
              </a>
            </div>
            <div className="anchored-footer__contact-line">
              <span className="anchored-footer__contact-label">Open</span>
              <span className="anchored-footer__contact-value">Every hour, every day</span>
            </div>
            <div className="anchored-footer__contact-line">
              <span className="anchored-footer__contact-label">Visit the park</span>
              <span className="anchored-footer__contact-value">
                {contact.location}
                <br />
                <a href="/map">Map &amp; directions →</a>
              </span>
            </div>
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
            © {year} {logo.wordmark}. All rights reserved.
          </span>
          <span>
            Memorial &amp; funeral services · Isabela City, Basilan ·{" "}
            <a href="/cart">Cart</a> · <a href="/quote">Request a quote</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function HeroSection({ content }: { content: LandingContent }) {
  const { hero, logo, contact } = content;
  return (
    <section className="hero-home" aria-labelledby="hero-home-title">
      <div className="hero-home__brand">
        <BrandMark wordmark={logo.wordmark} markImage={logo.markImage} className="brand-mark--lg" />
        <span className="hero-home__wordmark">{logo.wordmark}</span>
      </div>
      <p className="hero-home__eyebrow">{hero.eyebrow}</p>
      <h1 id="hero-home-title" className="hero-home__title">
        {hero.headline}
      </h1>
      <p className="hero-home__lead">{hero.subline}</p>
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
            <img src={about.image} alt="Villa Memorial Park grounds" loading="lazy" />
          </figure>
        ) : null}
      </div>
    </section>
  );
}

function ServicesSection({ content }: { content: LandingContent }) {
  const { services } = content;
  return (
    <section className="mid-section" aria-labelledby="services-title">
      <p className="mid-kicker">What we do</p>
      <h2 id="services-title">{services.heading}</h2>
      <p className="mid-intro">{services.intro}</p>
      {services.items.length === 0 ? (
        <p className="mid-empty">Service details will appear here once staff publishes them.</p>
      ) : (
        <div className="services-list">
          {services.items.map((service, i) => (
            <ServiceBlock key={service.id} service={service} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

function PlansSection({ content }: { content: LandingContent }) {
  const { plans } = content;
  return (
    <section className="mid-section" aria-labelledby="plans-title">
      <p className="mid-kicker">Plan ahead</p>
      <h2 id="plans-title">{plans.heading}</h2>
      <p className="mid-intro">{plans.intro}</p>
      {plans.items.length === 0 ? (
        <p className="mid-empty">Plan cards will appear here once staff publishes them.</p>
      ) : (
        <div className="plan-grid">
          {plans.items.map((plan) => (
            <PlanCardLink key={plan.id} plan={plan} />
          ))}
        </div>
      )}
      {plans.note ? <p className="mid-note">{plans.note}</p> : null}
    </section>
  );
}

function BlogSection({ content }: { content: LandingContent }) {
  const { blog, logo } = content;
  return (
    <section className="mid-section" aria-labelledby="blog-title">
      <p className="mid-kicker">Newsfeed</p>
      <h2 id="blog-title">{blog.heading}</h2>
      <p className="mid-intro">{blog.intro}</p>
      {blog.posts.length === 0 ? (
        <p className="mid-empty">Stories will appear here once staff publishes the first post.</p>
      ) : (
        <div className="blog-feed">
          {blog.posts.map((post) => (
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

export function LandingView({ content, mapNode, mapLive, sectionCount }: LandingViewProps) {
  return (
    <div className="anchored-page">
      <LandingHeader content={content} />
      <div className="anchored-grid">
        <aside className="anchored-rail anchored-rail--left" aria-label="Care and services">
          <RailPanel config={content.rails.left} side="left" contact={content.contact} />
        </aside>

        <main className="anchored-mid">
          <div className="anchored-mid__inner">
            <HeroSection content={content} />
            <AboutSection content={content} />
            <ServicesSection content={content} />
            <PlansSection content={content} />
            <BlogSection content={content} />
            <MapSection
              content={content}
              mapNode={mapNode}
              mapLive={mapLive}
              sectionCount={sectionCount}
            />
          </div>
        </main>

        <aside className="anchored-rail anchored-rail--right" aria-label="Plans and lots">
          <RailPanel config={content.rails.right} side="right" contact={content.contact} />
        </aside>
      </div>
      <LandingFooter content={content} />
    </div>
  );
}

export default LandingView;
