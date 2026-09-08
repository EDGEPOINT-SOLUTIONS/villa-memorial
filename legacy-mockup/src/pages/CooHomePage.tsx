// ============================================================================
// CooHomePage — content section of the COO "Luminous Home" variant
// (ui-ux-demo/stitch_villa_memorial_digital_platform/villa_memorial_luminous_home_variant/code.html).
// Rendered INSIDE CooPublicShell, which provides the global header, footer,
// chat bubble and mobile drawer. This page contributes only its content.
// Luminous palette accents (gold #fdc003 etc.) kept from the mockup.
// ============================================================================

import { Link } from "react-router-dom";

// Real uploaded photos (mirrored from the production web app's uploads).
const HERO_IMG = "/media/hero-1.jpg";
const STORE_PACKAGES_IMG = "/media/plan-packages.png";
const STORE_PRODUCTS_IMG = "/media/gold-casket.jpg";
const STORE_TRANSPORT_IMG = "/media/transport.jpg";
const PARK_AERIAL_IMG = "/media/villa-park-aerial.jpg";

const SHOWCASE_TYPES = [
  { img: "/media/lot-primary.png", label: "Primary lots", to: "/site/lots" },
  { img: "/media/lot-premium.png", label: "Premium lots", to: "/site/lots" },
  { img: "/media/lot-garden-niches.png", label: "Garden niches", to: "/site/lots" },
  { img: "/media/lot-mausoleum.png", label: "Mausoleum", to: "/site/lots" },
] as const;

const BENTO_CARDS = [
  {
    title: "Pre-Need Plans",
    blurb: "Secure peace of mind for the future with structured, thoughtful planning.",
    icon: "description",
    circleCls:
      "w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-6 text-primary group-hover:scale-110 group-hover:bg-[#fdc003] group-hover:text-[#6c5000] transition-all duration-300",
    to: "/site/plans",
  },
  {
    title: "Memorial Lots",
    blurb: "Serene, beautifully maintained resting places designed for reflection.",
    icon: "park",
    circleCls:
      "w-16 h-16 rounded-full bg-[#ffdf9e] flex items-center justify-center mb-6 text-[#785900] group-hover:scale-110 group-hover:bg-[#fdc003] group-hover:text-[#6c5000] transition-all duration-300",
    to: "/site/lots",
  },
  {
    title: "At-Need Services",
    blurb: "Immediate, compassionate assistance when you need it most.",
    icon: "volunteer_activism",
    circleCls:
      "w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-6 text-primary group-hover:scale-110 group-hover:bg-[#fdc003] group-hover:text-[#6c5000] transition-all duration-300",
    to: "/site/services",
  },
  {
    title: "Contact Us",
    blurb: "Reach out to our gentle guides for personalized support.",
    icon: "support_agent",
    circleCls:
      "w-16 h-16 rounded-full bg-[#e4e9ee] flex items-center justify-center mb-6 text-on-surface-variant group-hover:scale-110 group-hover:bg-[#fdc003] group-hover:text-[#6c5000] transition-all duration-300",
    to: "/site/contact",
  },
] as const;

export function CooHomePage() {
  return (
    <div className="w-full">
      {/* Hero — demo-ready (COO mockup's overlay text was empty; copy added for a
          presentable homepage; design language unchanged) */}
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,#00658d_0%,#003e58_100%)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${HERO_IMG}")` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,30,45,0.20)_0%,rgba(0,30,45,0.55)_100%)]" />
        <div className="relative z-10 max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop flex min-h-[540px] md:min-h-[640px] items-center justify-center text-center">
          <div className="max-w-3xl">
            <p className="text-label-md font-label-md tracking-[0.14em] uppercase text-[#fdc003]">
              Villa Memorial · Isabela City
            </p>
            <h1 className="mt-4 font-serif text-[clamp(2.25rem,5.5vw,3.5rem)] leading-tight text-white">
              Honoring every life with dignity and light.
            </h1>
            <p className="mt-5 text-body-lg font-body-lg text-white/90 leading-relaxed">
              Funeral services, memorial plans, and garden lots — planned with
              care and guided with compassion, so your family is never alone
              during life's most difficult moments.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/site/plans"
                className="bg-[#fdc003] hover:bg-[#fabd00] text-[#6c5000]! font-label-md text-label-md px-8 py-4 rounded-full transition-colors duration-300 min-h-[48px] shadow-ambient flex items-center justify-center gap-2 hover:no-underline!"
              >
                EXPLORE MEMORIAL PLANS{" "}
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/site/lots"
                className="border-2 border-white/80 text-white! hover:bg-white/10 font-label-md text-label-md px-8 py-4 rounded-full transition-colors duration-300 min-h-[48px] flex items-center justify-center hover:no-underline!"
              >
                VIEW MEMORIAL LOTS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The very first memorial park in Basilan — premium showcase */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
          <div>
            <p className="text-label-md font-label-md tracking-[0.14em] uppercase text-secondary">
              Villa Memorial · Isabela City, Basilan
            </p>
            <h2 className="mt-3 font-serif text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight text-primary">
              The very first memorial park in Basilan
            </h2>
            <p className="mt-4 text-body-lg font-body-lg text-on-surface-variant leading-relaxed">
              Serene, landscaped grounds created to give Mindanao families a place of quiet
              rest — planned ahead or at the moment of need, close to home.
            </p>
            <ul className="mt-6 space-y-3 text-body-md font-body-md text-on-surface-variant">
              {[
                "Walk the grounds online — zoom and pan the park map and find any lot.",
                "Every plot carries its type: Primary lots, Premium lots, Garden niches and Mausoleum.",
                "Browse every lot with its real 2026 asking price — no surprises.",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary mt-0.5">check_circle</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/site/map"
                className="bg-secondary hover:bg-secondary-fixed-dim text-on-secondary hover:text-on-secondary-fixed text-label-md font-label-md px-6 py-3 rounded-lg transition-colors duration-300 min-h-[48px] flex items-center justify-center gap-2 hover:no-underline!"
              >
                Explore the interactive map
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                to="/site/lots"
                className="border border-primary-container text-primary hover:bg-primary-fixed text-label-md font-label-md px-6 py-3 rounded-lg transition-colors duration-300 min-h-[48px] flex items-center justify-center hover:no-underline!"
              >
                See lots &amp; prices
              </Link>
            </div>
          </div>
          <figure className="rounded-xl overflow-hidden shadow-ambient bg-surface-container-low">
            <img
              src={PARK_AERIAL_IMG}
              alt="Aerial view of the first memorial park in Basilan"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            <figcaption className="text-label-md font-label-md text-on-surface-variant text-center py-3 italic">
              The First Ever Memorial Park in Basilan
            </figcaption>
          </figure>
        </div>

        {/* Lot-type quick links under the showcase */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter mt-section-gap">
          {SHOWCASE_TYPES.map((x) => (
            <Link
              key={x.label}
              to={x.to}
              className="group rounded-xl overflow-hidden border border-[#eaeef4] shadow-ambient hover:shadow-[0_16px_32px_-12px_rgba(51,51,51,0.18)] transition-all duration-300 hover:no-underline!"
            >
              <img
                src={x.img}
                alt={x.label}
                loading="lazy"
                className="w-full h-36 md:h-44 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="block text-center text-label-md font-label-md text-primary py-3 bg-surface-container-lowest">
                {x.label} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* From the store — packages, products, transport */}
      <section className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto">
        <p className="text-label-md font-label-md tracking-[0.14em] uppercase text-secondary text-center">
          From the store
        </p>
        <h2 className="mt-2 text-headline-lg-mobile md:text-headline-md font-headline-lg-mobile md:font-headline-md text-primary text-center mb-section-gap">
          Packages, products &amp; transport
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {[
            { img: STORE_PACKAGES_IMG, title: "Packages", blurb: "Thoughtfully bundled services at one clear price.", to: "/site/packages" },
            { img: STORE_PRODUCTS_IMG, title: "Products &amp; keepsakes", blurb: "Caskets, urns and keepsakes for remembrance.", to: "/site/products" },
            { img: STORE_TRANSPORT_IMG, title: "Transport", blurb: "Dignified transport, day or night.", to: "/site/transport" },
          ].map((c) => (
            <Link
              key={c.title}
              to={c.to}
              className="group rounded-xl overflow-hidden bg-surface-container-lowest border border-[#eaeef4] shadow-ambient hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(51,51,51,0.18)] transition-all duration-300 hover:no-underline!"
            >
              <img
                src={c.img}
                alt={c.title.replace(/&amp;/g, "&")}
                loading="lazy"
                className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="p-6">
                <h3 className="text-headline-sm font-headline-sm text-on-surface mb-1" dangerouslySetInnerHTML={{ __html: c.title }} />
                <p className="text-body-md font-body-md text-on-surface-variant">{c.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Access Bento Grid */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {BENTO_CARDS.map((card) => {
            const cardCls =
              "group bg-surface-container-lowest rounded-xl p-8 shadow-ambient hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(51,51,51,0.1)] flex flex-col items-center text-center h-full border border-[#eaeef4] border-opacity-50 hover:border-[#fdc003] hover:border-opacity-50 transition-all duration-300 hover:no-underline!";
            const inner = (
              <>
                <div className={card.circleCls}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: 32 }}
                  >
                    {card.icon}
                  </span>
                </div>
                <div className="text-headline-sm font-headline-sm text-primary mb-3">
                  {card.title}
                </div>
                <p className="text-body-md font-body-md text-on-surface-variant!">
                  {card.blurb}
                </p>
              </>
            );
            return (
              <Link className={cardCls} key={card.title} to={card.to}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
