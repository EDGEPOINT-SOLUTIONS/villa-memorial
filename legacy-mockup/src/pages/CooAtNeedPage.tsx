// Content-only COO page (At-Need Services hub) — rendered inside the global
// CooPublicShell (fixed header, footer, chat, drawer). Content is a verbatim
// port of stitch_villa_memorial_digital_platform/at_need_funeral_services/code.html.

import { Link } from "react-router-dom";

export function CooAtNeedPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full min-h-[614px] flex flex-col items-center justify-center py-section-gap px-margin-mobile md:px-margin-desktop overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center w-full h-full opacity-30"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAArxc2fUH6VDxkndcdy81txao-bi3SSL30b7wLOx_jrsGlTrujxT1m4wNTzusaoZOy443Z03rqMaGF62UrDvXX5D2nBm6_S4Wjs1Iv8hi520A8JPsgtclHUa5wc8Q5HmwEA9Uacz4VQq5GZRicSFi9aKmAaLhv_XzIzFQba4HdyAISvoXwzka6mRWbxQgnnYLb0i7HrQuzDrB5_gbUB8TP-LOt2hmJQMISw8j7HZ4AT2-L5EvWoqcp')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/80 to-surface" />
        <div className="relative z-10 w-full max-w-[1200px] flex flex-col items-center text-center space-y-8">
          <button className="bg-error text-on-error font-label-md text-label-md py-4 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 animate-pulse">
            <span
              className="material-symbols-outlined"
              data-icon="emergency"
              style={{ fontVariationSettings: '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24' }}
            >
              emergency
            </span>
            {" 🕊️ I NEED FUNERAL ASSISTANCE NOW"}
          </button>
          <div className="space-y-4 max-w-2xl mx-auto">
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary">
              Immediate At-Need Services
            </h1>
            <p className="text-body-lg font-body-lg text-on-surface-variant">
              We're here to help. Tell us what you need and our compassionate funeral care team
              will assist you immediately.
            </p>
          </div>
          {/* Quick Choice Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mt-8">
            <Link
              to="/site/services/death-at-hospital"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col items-center text-center gap-3 hover:border-primary-fixed hover:bg-primary-fixed/10 hover:shadow-md transition-all duration-300 group no-underline hover:no-underline"
            >
              <span className="material-symbols-outlined text-3xl text-primary group-hover:text-secondary transition-colors" data-icon="local_hospital">
                local_hospital
              </span>
              <span className="text-label-md font-label-md text-on-surface">
                Death occurred at Hospital
              </span>
            </Link>
            <Link
              to="/site/services/death-at-home"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col items-center text-center gap-3 hover:border-primary-fixed hover:bg-primary-fixed/10 hover:shadow-md transition-all duration-300 group no-underline hover:no-underline"
            >
              <span className="material-symbols-outlined text-3xl text-primary group-hover:text-secondary transition-colors" data-icon="home">
                home
              </span>
              <span className="text-label-md font-label-md text-on-surface">
                Death occurred at Home
              </span>
            </Link>
            <Link
              to="/site/transport"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col items-center text-center gap-3 hover:border-primary-fixed hover:bg-primary-fixed/10 hover:shadow-md transition-all duration-300 group no-underline hover:no-underline"
            >
              <span className="material-symbols-outlined text-3xl text-primary group-hover:text-secondary transition-colors" data-icon="local_shipping">
                local_shipping
              </span>
              <span className="text-label-md font-label-md text-on-surface">
                Need Transportation
              </span>
            </Link>
            <Link
              to="/site/packages"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col items-center text-center gap-3 hover:border-primary-fixed hover:bg-primary-fixed/10 hover:shadow-md transition-all duration-300 group no-underline hover:no-underline"
            >
              <span className="material-symbols-outlined text-3xl text-primary group-hover:text-secondary transition-colors" data-icon="inventory_2">
                inventory_2
              </span>
              <span className="text-label-md font-label-md text-on-surface">
                Need a Package
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
