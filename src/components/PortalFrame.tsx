// ============================================================================
// PortalFrame — shared chrome (sidebar + top bar + drawer) for the Agent and
// Client (family) portal sections. Mirrors the COO portal dashboards' look so
// every portal page feels like the same app.
// ============================================================================

import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CooMobileMenu, type CooMenuLink } from "./CooMobileMenu";

export type PortalItem = {
  key: string;
  label: string;
  icon: string;
  to: string;
};

type Props = {
  items: PortalItem[];
  brandLabel: string; // e.g. "Agent Portal" / "Client Portal"
  topNote: string; // e.g. "Sales agent · Maria Fernandez"
  logoutTo: string;
  children: ReactNode;
};

export function PortalFrame({ items, brandLabel, topNote, logoutTo, children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const drawerLinks: CooMenuLink[] = items.map((i) => ({
    key: i.key,
    label: i.label.toUpperCase(),
    to: i.to,
    active: location.pathname === i.to,
  }));
  drawerLinks.push({
    key: "logout",
    label: "LOG OUT",
    action: () => navigate(logoutTo),
  });

  const logout = (
    <Link
      to={logoutTo}
      className="flex items-center gap-2 px-4 py-3 text-label-md font-label-md text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors hover:no-underline!"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        logout
      </span>
      Log Out
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body-md antialiased">
      {/* Mobile + tablet top bar */}
      <header className="lg:hidden fixed top-0 left-0 w-full z-50 flex items-center justify-between px-margin-mobile py-4 bg-surface-container-lowest shadow-sm">
        <div className="min-w-0">
          <p className="text-headline-sm font-headline-sm font-bold text-primary truncate">Villa Memorial</p>
          <p className="text-xs text-on-surface-variant truncate">{topNote}</p>
        </div>
        <div className="flex items-center gap-2">
          {logout}
          <button
            type="button"
            aria-label="Open menu"
            className="text-on-surface-variant p-1 cursor-pointer"
            onClick={() => setMenuOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant z-40 px-4 py-8">
        <div className="px-2 mb-8">
          <p className="text-headline-sm font-headline-sm font-bold text-primary mb-1">Villa Memorial</p>
          <p className="text-label-md font-label-md text-on-surface-variant">{brandLabel}</p>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {items.map((i) => {
            const active = location.pathname === i.to;
            return (
              <NavLink
                key={i.key}
                to={i.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:no-underline! ${
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {i.icon}
                </span>
                <span className="text-label-md font-label-md">{i.label}</span>
              </NavLink>
            );
          })}
        </div>
        <div className="border-t border-outline-variant pt-4">
          {logout}
          <p className="px-4 pt-3 text-xs text-on-surface-variant/70">Demo · no backend</p>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 lg:ml-64 pt-24 lg:pt-gutter px-margin-mobile md:px-margin-desktop pb-12">
        <div className="max-w-[1200px] mx-auto w-full">{children}</div>
      </main>

      {/* Mobile / tablet drawer */}
      <CooMobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={drawerLinks} note={`${brandLabel} · Demo · no backend`} />
    </div>
  );
}
