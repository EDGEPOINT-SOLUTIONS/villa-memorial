// ============================================================================
// CooHomePage — content section of the COO "Luminous Home" variant
// (ui-ux-demo/stitch_villa_memorial_digital_platform/villa_memorial_luminous_home_variant/code.html).
// Rendered INSIDE CooPublicShell, which provides the global header, footer,
// chat bubble and mobile drawer. This page contributes only its content.
// Luminous palette accents (gold #fdc003 etc.) kept from the mockup.
// ============================================================================

import { Link } from "react-router-dom";

// Verbatim asset from the mockup file (decoded, byte-exact).
const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBQq-UOJ0KfuIVqfbiMlShkwLI_FdfmEjiWlcH6qCzXZixqAOS1TpPyuAzN-Be_5ubGK8qucL2x-whForb4qFh8SB-wYDTlYNayGuY7zJ0VtS-5aca7umxYBIKsM37FnKCgk-B4WQRaF9wVZFUsBGFQpxNvj_kxH2fenMHpi3-QeznQsHcxpysy4ftMmEZMC3B7zsQqKiIPWZZ5fvhIUadkb44Jtt_yvDiMvc3ifyuiNkWe4gtLvsq3P5E8jMdHnp_-7Q";

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
