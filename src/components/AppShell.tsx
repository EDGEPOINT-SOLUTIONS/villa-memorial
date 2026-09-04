// Application shell: COO-themed sidebar + topbar with tenant/role switchers.
// Brand + nav are derived from the active tenant and role (multi-tenant demo).

import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useDemo } from "../lib/demo";
import { visibleNav } from "../lib/nav";

export function AppShell() {
  const { tenant, role, tenants, roles, setTenant, setRole } = useDemo();
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const sections = visibleNav(role.scopes);

  function signOut() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <p className="app-sidebar__eyebrow">Powered by In-Memoriam</p>
          <p className="app-sidebar__title">{tenant.name}</p>
          <p className="app-sidebar__facility">
            {tenant.branch} · {tenant.facility}
          </p>
        </div>

        <nav className="app-sidebar__nav" aria-label="Primary">
          {sections.map((section) => (
            <div key={section.label} className="app-sidebar__section">
              <span className="app-sidebar__label">{section.label}</span>
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="app-sidebar__footer">
          <div className="small muted" style={{ marginBottom: "var(--space-2)" }}>
            Signed in as
            <div style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{email}</div>
          </div>
          <button className="btn btn--accent btn--sm" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <div className="topbar">
          <div className="topbar__context">
            <span className="topbar__tenant" aria-hidden="true">
              {role.label}
            </span>
            <select
              className="select"
              style={{ width: "auto" }}
              value={tenant.id}
              aria-label="Active tenant"
              onChange={(e) => setTenant(e.target.value)}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <span className="chip">Demo · no backend</span>

          <select
            className="select"
            style={{ width: "auto" }}
            value={role.id}
            aria-label="Preview as role"
            onChange={(e) => setRole(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                View as: {r.label}
              </option>
            ))}
          </select>

          <div className="avatar" aria-hidden>
            {role.label.charAt(0)}
          </div>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function BreadcrumbLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to}>{children}</Link>;
}
