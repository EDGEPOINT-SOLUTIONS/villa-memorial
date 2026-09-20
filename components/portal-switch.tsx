import Link from "next/link";

/**
 * Portal switcher — the glue that makes the four surfaces feel like ONE product:
 * Public site · Admin · Family · Agent all share one identity; this lets a user
 * move between doors instead of treating sign-out as the only exit.
 *
 * current marks the surface the user is on (public | staff | family | agent).
 * inverse is for dark surfaces (the Admin Portal sidebar) where link colours must
 * flip. The `staff` KEY is the route family (/staff/*); its visible label names
 * the area — the Admin Portal.
 */
const PORTALS = [
  { key: "public", label: "Public site", href: "/" },
  { key: "staff", label: "Admin", href: "/staff/dashboard" },
  { key: "family", label: "Family", href: "/client/dashboard" },
  { key: "agent", label: "Agent", href: "/agent/dashboard" },
] as const;

export function PortalSwitch({
  current,
  inverse = false,
}: {
  current?: (typeof PORTALS)[number]["key"];
  inverse?: boolean;
}) {
  return (
    <nav
      className={`portal-switch${inverse ? " portal-switch--inverse" : ""}`}
      aria-label="Switch portal"
    >
      <span className="portal-switch__label">Portals</span>
      {PORTALS.map((p) => (
        <Link
          key={p.key}
          href={p.href}
          aria-current={current === p.key ? "page" : undefined}
          className={current === p.key ? "portal-switch__link--active" : undefined}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
