// Public site shell — marketing/nav/footer. No auth. Villa Memorial brand
// ("Radiant Compassion" blue + gold), powered by In-Memoriam.

import { Link, NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/site/services", label: "Services" },
  { to: "/site/plans", label: "Plans" },
  { to: "/site/lots", label: "Lots" },
  { to: "/site/packages", label: "Packages" },
  { to: "/site/transport", label: "Transport" },
  { to: "/site/map", label: "Memorial map" },
];

export function PublicShell() {
  return (
    <div className="public-shell">
      <nav className="public-nav" aria-label="Primary">
        <Link to="/" className="public-nav__brand">
          Villa Memorial
        </Link>
        <div className="public-nav__links">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `public-nav__link${isActive ? " public-nav__link--active" : ""}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <Link to="/login" className="btn btn--primary btn--sm">
            Staff sign in
          </Link>
        </div>
      </nav>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div>
          <div className="public-footer__brand">Villa Memorial</div>
          <div className="small muted">Honoring every life · Powered by In-Memoriam</div>
        </div>
        <div className="public-footer__links">
          <Link to="/client/login">Family portal</Link>
          <Link to="/agent/login">Agent portal</Link>
          <Link to="/login">Staff portal</Link>
          <Link to="/site/map">Park map</Link>
        </div>
      </footer>
    </div>
  );
}
