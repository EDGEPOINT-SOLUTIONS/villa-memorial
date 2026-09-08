// ============================================================================
// CooPublicShell — ONE global chrome for the whole COO public site.
// The COO mockups were standalone pages with differing headers/footers, which
// made navigation feel inconsistent. This shell gives every public page the
// same fixed nav bar, the same footer, and the same page background so the
// client demo feels like one coherent site. Page bodies keep their own
// COO-designed heroes/cards/sections. (Dev/COO note: chrome is unified per the
// non-dev's demo-readiness request; page content/colors are unchanged.)
// ============================================================================

import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useToast } from "./toast";
import { useCart } from "../lib/cart";
import { CooMobileMenu, type CooMenuLink } from "./CooMobileMenu";

const NAV = [
  { label: "HOME", to: "/" },
  { label: "SERVICES", to: "/site/services", prefix: true },
  { label: "PLANS", to: "/site/plans", prefix: true },
  { label: "LOTS", to: "/site/lots" },
  { label: "PACKAGES", to: "/site/packages" },
  { label: "PRODUCTS", to: "/site/products" },
  { label: "TRANSPORT", to: "/site/transport" },
  { label: "MEMORIAL MAP", to: "/site/map" },
];

const LINK_CLS =
  "text-label-md font-label-md text-on-surface-variant hover:text-primary hover:no-underline! transition-colors duration-200 px-1 py-1";

export function CooPublicShell() {
  const { toast } = useToast();
  const { count } = useCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const notice = (message: string) => toast(message);

  const menuLinks: CooMenuLink[] = [
    ...NAV.map((n) => ({
      key: n.label,
      label: n.label,
      to: n.to,
      active: n.to === "/" ? location.pathname === "/" || location.pathname === "/home" : location.pathname === n.to || (Boolean(n.prefix) && location.pathname.startsWith(n.to)),
    })),
    {
      key: "cart",
      label: `CART${count > 0 ? ` (${count})` : ""}`,
      to: "/cart",
      active: location.pathname === "/cart",
    },
    { key: "contact", label: "CONTACT US", to: "/site/contact" },
    { key: "faq", label: "FAQ", to: "/site/faq" },
    {
      key: "portal",
      label: "CLIENT SIGN IN · FAMILY PORTAL",
      to: "/client/login",
      section: "Portals",
    },
    { key: "agent", label: "AGENT SIGN IN", to: "/agent/login" },
    { key: "staff", label: "STAFF (ADMIN) SIGN IN", to: "/login" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body-md antialiased">
      {/* Global fixed header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest shadow-sm">
        <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 hover:no-underline!">
            <span className="text-headline-sm font-headline-sm font-bold text-primary tracking-tight">
              Villa Memorial
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-gutter" aria-label="Primary">
            {NAV.map((n) => {
              const active =
                n.to === "/"
                  ? location.pathname === "/" || location.pathname === "/home"
                  : location.pathname === n.to ||
                    (Boolean(n.prefix) && location.pathname.startsWith(n.to));
              return (
                <NavLink
                  key={n.label}
                  to={n.to}
                  className={`${LINK_CLS}${
                    active
                      ? " !text-secondary font-bold border-b-2 border-secondary pb-0.5"
                      : ""
                  }`}
                >
                  {n.label}
                </NavLink>
              );
            })}
            <Link
              to="/site/contact"
              className="ml-1 text-label-md font-label-md text-on-secondary bg-secondary hover:opacity-90 transition-opacity px-5 py-2.5 rounded-full cursor-pointer hover:no-underline!"
            >
              CONTACT US
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              aria-label={`Shopping cart${count > 0 ? `, ${count} items` : ""}`}
              className="hidden lg:inline-flex text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low relative hover:no-underline!"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                shopping_cart
              </span>
              {count > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 bg-[#D4AF37] text-[#1b1c1c] text-[11px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {count}
                </span>
              ) : null}
            </Link>
            {/* Admin / staff sign in (the main "sign in" entry) */}
            <Link
              to="/login"
              aria-label="Staff sign in"
              className="text-label-md font-label-md border-2 border-primary text-primary hover:bg-primary-fixed transition-colors rounded-full px-4 py-2 whitespace-nowrap hover:no-underline!"
            >
              SIGN IN
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              className="lg:hidden text-on-surface-variant p-2 cursor-pointer"
              onClick={() => setMenuOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page body sits below the fixed header */}
      <main className="flex-1 pt-[76px]">
        <Outlet />
      </main>

      {/* Global footer */}
      <footer className="bg-surface-container-highest border-t border-outline-variant/40">
        <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <p className="text-headline-sm font-headline-sm font-bold text-primary mb-3">
              Villa Memorial
            </p>
            <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
              © 2024 Villa Memorial. All rights reserved.
              <br />
              Luminous Comfort in every guide.
            </p>
          </div>
          <div>
            <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-3">
              Explore
            </p>
            <div className="flex flex-col items-start gap-2">
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/services">
                Services
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/plans">
                Memorial Plans
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/lots">
                Memorial Lots
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/packages">
                Funeral Packages
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/products">
                Products &amp; Keepsakes
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/transport">
                Transportation
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/map">
                Memorial Map
              </Link>
            </div>
          </div>
          <div>
            <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-3">
              Portals
            </p>
            <div className="flex flex-col items-start gap-2">
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/client/login">
                Client (Family) Portal
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/agent/login">
                Agent Portal
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/login">
                Staff (Admin) Portal
              </Link>
            </div>
          </div>
          <div>
            <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-3">
              Support
            </p>
            <div className="flex flex-col items-start gap-2">
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/contact">
                Contact us
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/faq">
                FAQ
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/quote">
                Request a quote
              </Link>
              <Link className="text-body-md text-on-surface-variant hover:text-primary hover:no-underline!" to="/site/appointments">
                Book an appointment
              </Link>
              <p className="text-body-md text-on-surface-variant opacity-80 mt-2">
                Available 24/7 for immediate assistance.
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-outline-variant/30 py-4 text-center text-xs text-on-surface-variant/70">
          Powered by In-Memoriam · Demo · no backend
        </div>
      </footer>

      {/* Mobile/tablet drawer */}
      <CooMobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={menuLinks} />

      {/* Consistent floating chat (demo) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          aria-label="Open Chat"
          className="w-14 h-14 bg-gold text-[#1b1c1c] rounded-full shadow-ambient hover:-translate-y-1 transition-all duration-300 flex items-center justify-center cursor-pointer"
          onClick={() => notice("Chat (demo)")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
            chat_bubble
          </span>
        </button>
      </div>
    </div>
  );
}
