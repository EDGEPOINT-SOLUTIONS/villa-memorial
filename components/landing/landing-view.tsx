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
import { ArrowRight, Calculator, FileText, MapPin, MessageCircle, Phone } from "lucide-react";
import type {
  BlogPost,
  ContactInfo,
  LandingContent,
  MediaItem,
  RailConfig,
  RailItem,
} from "@/lib/api-client/landing";
import { SiteHeaderBar } from "@/components/landing/site-header";
import { NextSteps } from "@/components/landing/next-steps";
import { PhoneActionBar } from "@/components/landing/phone-action-bar";
import { PlanBoard } from "@/components/landing/plan-board";
import { MonthlyPriceBlock } from "@/components/villa/monthly-price";
import { ProductCard } from "@/components/kit/product-card";
import { ResultsGrid } from "@/components/kit/results-grid";
import { PublicDisclosure } from "@/components/public/public-disclosure";
import { PublicHero } from "@/components/public/public-hero";
import { SectionHead } from "@/components/public/section-head";
import { PLAN_PACKAGES_IMAGE, libraryThumb, libraryThumbSet, planLotCardPhoto } from "@/lib/media";
import { planLotCardFigures, planLotKindLabel } from "@/lib/landing/plan-lots";
import { directionsUrl } from "@/lib/location-map";
import { type LotCategory, type PlanPricing } from "@/lib/pricing-model";

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
        {/* The rail's featured item. The visible word is "Featured", NOT "Lead":
            on a public memorial page "Lead" reads as a sales lead, which is CRM
            vocabulary on a grieving family's screen. The flag itself is a staff
            editorial choice (`item.featured`), so "Featured" is also the honest
            word — never "Popular"/"Most chosen", which would claim data the
            office has not recorded (components/kit/README.md, honest data only). */}
        <span className="rail-lead-flag">Featured</span>
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
 * One fixed rail: an optional fixed lead card (the help/call card on the left,
 * the quick-actions card on the right) + a staff-editable heading and any
 * number of pinned items (staff can pin as many products/services/plans/links
 * per rail as they want — the rail scrolls internally, so an unlimited list
 * never breaks the page).
 */
export function RailPanel({ config, lead }: { config: RailConfig; lead?: ReactNode }) {
  return (
    <div className="rail-panel">
      {lead}
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

/**
 * The left rail's always-reachable help card (captain, 2026-09-25): a grieving
 * visitor should never have to hunt for the phone. The big call action leads,
 * the office's own line and place sit under it. The number is read from the
 * landing content document — never typed here.
 */
function RailAssist({ contact }: { contact: ContactInfo }) {
  return (
    <div className="rail-assist">
      <p className="rail-assist__kicker">Need help now?</p>
      <a className="rail-assist__call" href={contact.phoneHref}>
        <Phone size={16} aria-hidden="true" />
        Call {contact.phoneDisplay}
      </a>
      <p className="rail-assist__note">
        Every hour, every day · {contact.location}
      </p>
    </div>
  );
}

/**
 * The right rail's quick actions (captain, 2026-09-25): four real doors — the
 * published price list, a quote request, the plan finder and directions to the
 * park — so the rail is useful from any scroll depth. App-authored, not
 * content-pinned: these are the storefront's own destinations.
 */
const RAIL_ACTIONS = [
  { href: "/price-list", label: "Price list", hint: "2026 coffins, services & plans", Icon: FileText },
  { href: "/quote", label: "Request a quote", hint: "We reply with real figures", Icon: MessageCircle },
  { href: "/builder", label: "Plan finder", hint: "Build an estimate in minutes", Icon: Calculator },
  { href: "/map", label: "Directions & park map", hint: "Find your way to the park", Icon: MapPin },
] as const;

function RailActions() {
  return (
    <nav className="rail-actions" aria-label="Quick actions">
      <h2 className="rail-heading">Quick actions</h2>
      <ul className="rail-actions__list">
        {RAIL_ACTIONS.map(({ href, label, hint, Icon }) => (
          <li key={href}>
            <a className="rail-action" href={href}>
              <span className="rail-action__icon" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="rail-action__text">
                <span className="rail-action__label">{label}</span>
                <span className="rail-action__hint">{hint}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The section-head "see all" action — a quiet outline-free link with a caret. */
function SeeAll({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="section-head__link" href={href}>
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </a>
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

function BlogPostCard({ post, brand }: { post: BlogPost; brand: string }) {
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
      <div className="post-card__body">
        {captionBody ? <p className="post-card__caption">{captionBody}</p> : null}
        <PostMediaGrid media={post.media} href={linked} />
      </div>
    </article>
  );
}

/* ------------------------------ main sections ------------------------------ */

/** Home header = the SAME shared bar every public page renders (SiteHeaderBar),
 * so navigating between the home and /services, /plans, /lots, /map never
 * changes the navigation. Framework-free: no active highlight here. */
function LandingHeader({ content }: { content: LandingContent }) {
  return <SiteHeaderBar brand={content.logo} />;
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

          {/* Quick links — the browse destinations. ONE entry per location:
              the plan lives in “Care & planning” (below) and the park has its
              one clear entry in the contact block's “Visit the park / Map &
              directions”, so neither repeats here (captain, 2026-09-21). */}
          <FooterColumn
            title="Explore"
            links={[
              { label: "Home", href: "/" },
              { label: "Funeraria Memorial Services", href: "/services" },
              { label: "Smart Service Builder", href: "/builder" },
              { label: "Memorial lots", href: "/lots" },
              { label: "Coffins & caskets", href: "/products" },
              { label: "Facilities", href: "/facilities" },
              { label: "Transport", href: "/transport" },
              { label: "Photo gallery & virtual tour", href: "/gallery" },
              { label: "Blog", href: "/blog" },
              { label: "Digital memorial search", href: "/memorials" },
              { label: "Find my loved one", href: "/memorials/find" },
            ]}
          />

          {/* Services & plans links — the planning products, the guide pages
              and the published prices. This is the plan's ONE footer entry. */}
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
                  <a
                    href={directionsUrl("google", contact.parkAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get directions
                  </a>{" · "}
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
            © {year} {logo.wordmark}. All rights reserved. · <a href="/quote">Your quote</a> ·{" "}
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

function AboutSection({ content }: { content: LandingContent }) {
  const { about } = content;
  return (
    <section className="mid-section" aria-labelledby="about-title">
      <div className="about-grid">
        <div>
          {/* The shared SectionHead (Phase 0 primitive) replaces the hand-rolled
              kicker/h2/story; the mission + vision now sit behind the shared
              disclosure so the band answers first and keeps the words available
              (captain call 5, public design plan). */}
          <SectionHead
            id="about-title"
            kicker="Our story"
            title={about.heading}
            lead={about.story}
          />
          <PublicDisclosure summary="Mission and vision">
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
          </PublicDisclosure>
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

function PlansLotsSection({
  content,
  lotCategories,
  planPricing,
}: {
  content: LandingContent;
  lotCategories: LotCategory[];
  planPricing: PlanPricing;
}) {
  const { plansLots } = content;
  return (
    <section className="mid-section" aria-labelledby="plans-lots-title">
      {/* Amazon-familiar band head (captain, 2026-09-25): kicker · answer · ONE
          "see all" action on the right, so the shelf never reads as a dead end. */}
      <SectionHead
        id="plans-lots-title"
        kicker={plansLots.kicker}
        title={plansLots.heading}
        lead={plansLots.intro}
        action={<SeeAll href="/lots">See all lots &amp; plans</SeeAll>}
      />
      {/* The kit grid + card (AGENTS "new screens render the kit"): `.plan-lot-grid`
          only narrows the shared column floor so five cards read three-across in
          the home's railed middle column. Every figure is a live read from the
          editable pricing store through lib/landing/plan-lots.ts — never typed. */}
      <ResultsGrid
        items={plansLots.items}
        itemKey={(card) => card.id}
        className="plan-lot-grid"
        emptyTitle="Plans and lots will appear here once staff publishes them."
        renderItem={(card) => {
          const figures = planLotCardFigures(card, lotCategories, planPricing);
          const src = card.image ?? planLotCardPhoto(card.kind, card.product);
          const href = card.href || "/lots";
          return (
            <ProductCard
              href={href}
              photo={
                src
                  ? { src, width: 720, height: 540, alt: "" }
                  : undefined
              }
              eyebrow={planLotKindLabel(card.kind)}
              title={card.title}
              supporting={figures?.supporting}
              price={
                figures ? <MonthlyPriceBlock price={figures.monthly} /> : "Ask the office"
              }
              actions={
                <a className="btn btn--accent btn--sm" href={href}>
                  {card.kind === "plan" ? "View the plan" : "View lots"}
                </a>
              }
            />
          );
        }}
      />
      {plansLots.note ? <p className="mid-note">{plansLots.note}</p> : null}
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
      <SectionHead
        id="vmp-title"
        kicker={plans.kicker}
        title={plans.heading}
        lead={plans.intro}
        action={<SeeAll href="/plans">See the full plan</SeeAll>}
      />
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
  // Newsfeed composition (captain 2026-09-21): ONE post per column. The feed is
  // a single row of equal columns — each story its own column — instead of a
  // spanning lead over a two-up grid that left two posts stacked in one column.
  // On a phone it becomes one column (one post per row).
  //
  // The band no longer carries a SectionHead: the page's title, `h1` and intro
  // moved to the interior opening at the top of the column (2026-09-27), and a
  // second "Blog" heading down here would have been the same words twice on one
  // screen. `aria-label` names the region because its heading is now elsewhere.
  return (
    <section className="mid-section" aria-label="Blog posts">
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
  const lead =
    mapLive && sectionCount !== undefined && sectionCount > 0
      ? `${map.intro} Explore all ${sectionCount} sections.`
      : map.intro;
  return (
    <section className="mid-section mid-section--map" aria-labelledby="map-title">
      <SectionHead
        id="map-title"
        kicker="Villa Memorial Park"
        title={map.heading}
        lead={lead}
        action={<SeeAll href="/map">Open the full map</SeeAll>}
      />
      <div className="map-embed">
        {mapNode ?? (
          <p className="mid-empty">The live park map is momentarily unavailable — open the full map directly.</p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ the storefront ------------------------------ */

/**
 * LandingBands — the storefront's three-column body: both rails and the middle
 * sheet, with NONE of the chrome. `/blog` renders the blog first and these
 * bands beneath it inside the shared `PublicShell` (office, inbox 025), where
 * the former page's own header, footer and phone bar would be a second set of
 * them — the one outcome worse than the bug being fixed. The bands read the
 * landing document and the live stores exactly as `LandingView` always did (the
 * blog's own part is the page document; the two stay independent).
 *
 *   · `midElement="main"` keeps `LandingView`'s own `<main id="main">`; on
 *     `/blog` the shell already owns the page's main, so the column nests as a
 *     `<div>`;
 *   · `open` is the column's opening block. `LandingView` passes the interior
 *     hero this page has used since 2026-09-27; `/blog` passes none, because
 *     its first band IS the blog document (heading, intro, posts).
 */
export function LandingBands({
  content,
  planPricing,
  lotCategories,
  mapNode,
  mapLive,
  sectionCount,
  midElement = "div",
  open,
}: LandingViewProps & { midElement?: "main" | "div"; open?: ReactNode }) {
  const mid = (
    <div className="anchored-mid__inner">
      {open}
      {/* Products first, story after (the Amazon order): the plans & lots
          shelf, then the plan board, then the park map a visitor can walk.
          The About/mission band and the newsfeed close the column. */}
      <PlansLotsSection content={content} lotCategories={lotCategories} planPricing={planPricing} />
      <PlansSection content={content} planPricing={planPricing} />
      <MapSection content={content} mapNode={mapNode} mapLive={mapLive} sectionCount={sectionCount} />
      <AboutSection content={content} />
      <BlogSection content={content} />
    </div>
  );

  return (
    <div className="anchored-grid">
      {/* Amazon-familiar storefront (captain, 2026-09-25): the left rail is
          the departments list, led by the always-reachable help card. */}
      <aside className="anchored-rail anchored-rail--left" aria-label="Departments">
        <RailPanel config={content.rails.left} lead={<RailAssist contact={content.contact} />} />
      </aside>

      {midElement === "main" ? (
        <main id="main" className="anchored-mid">
          {mid}
        </main>
      ) : (
        <div className="anchored-mid">{mid}</div>
      )}

      {/* The right rail is the short, useful action list (price list, quote,
          plan finder, directions) above the staff-pinned plans & lots. */}
      <aside className="anchored-rail anchored-rail--right" aria-label="Quick actions">
        <RailPanel config={content.rails.right} lead={<RailActions />} />
      </aside>
    </div>
  );
}

/* --------------------------------- the view --------------------------------- */

export function LandingView({ content, planPricing, lotCategories, mapNode, mapLive, sectionCount }: LandingViewProps) {
  // The author-settable hero text colour is now owned by the PublicHero
  // primitive (Phase 0), which paints `--hero-text-colour` on the hero root.
  // The page shell no longer needs the property: the rail's 24/7 card that used
  // to read it was removed (captain 2026-09-21).
  return (
    <div className="anchored-page has-phonebar">
      <LandingHeader content={content} />
      <LandingBands
        content={content}
        planPricing={planPricing}
        lotCategories={lotCategories}
        mapNode={mapNode}
        mapLive={mapLive}
        sectionCount={sectionCount}
        midElement="main"
        open={
          /* NO HOME HERO HERE (captain, 2026-09-27). This page opened with the
             old home's hero — the brand lock-up, "Honoring every life with
             dignity and light", the subline and the two doors. That is the
             HOME's argument; what replaces it is the same interior opening
             every other public page uses (`PublicHero` variant "interior": a
             kicker, the page's `h1`, one lead, no photograph and no actions),
             because the hero held the page's ONLY `h1`. The wrapper exists
             because a copy-only interior hero must not keep the desktop
             two-column track (it would strand an empty column beside the
             words) — the same reason `.mem-page` overrides it. */
          <div className="blog-open">
            <PublicHero
              variant="interior"
              id="blog-title"
              eyebrow="Blog"
              title={content.blog.heading}
              lead={content.blog.intro}
            />
          </div>
        }
      />
      {/* The home ends on the same three options every public page ends on
          (F-17) — the band the interior pages get from PublicShell. */}
      <NextSteps contact={content.contact} />
      <PhoneActionBar contact={content.contact} />
      <LandingFooter content={content} />
    </div>
  );
}

export default LandingView;
