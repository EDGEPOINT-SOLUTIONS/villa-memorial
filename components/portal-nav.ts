/**
 * Portal navigation data (family + agent) — villa-memorial's CLIENT_NAV /
 * AGENT_NAV order and labels. Icons are resolved by key inside the client
 * frame (lucide), keeping this file renderer-agnostic.
 *
 * FAMILY (approved redesign, 2026-09-16 — docs/08-delivery/family-portal-design):
 * the shipped 14-link grouped rail was replaced by six plain names in one bar
 * plus five phone tabs. Routes are unchanged; only the presentation names and
 * the order changed. The labels are the family's words:
 *   Home · The funeral · Payments · Papers · Remembering · Your details
 * Everything else (plans, property, family access, notifications, privacy) is
 * one level down in the More list — still reachable, no longer equal weight.
 *
 * `FAMILY_PORTAL_NAV` stays exported as the complete route list so route and
 * test consumers keep working.
 */
export type PortalNavItem = {
  key: string;
  label: string;
  to: string;
};

/** A labelled group of nav items. An empty label renders without a heading. */
export type PortalNavGroup = {
  label: string;
  items: PortalNavItem[];
};

/** An item in the phone/desktop “More” list, with one plain line about it. */
export type FamilyMoreItem = PortalNavItem & { detail: string };

/**
 * The six destinations in the top bar (desktop) — the things a family reaches
 * for while an arrangement is running. Order is deliberate: the answer, the
 * funeral, the money, the papers, the memory, then the account.
 */
export const FAMILY_PRIMARY_NAV: PortalNavItem[] = [
  { key: "dashboard", label: "Home", to: "/client/dashboard" },
  { key: "cases", label: "The funeral", to: "/client/cases" },
  { key: "payments", label: "Payments", to: "/client/payments" },
  { key: "documents", label: "Papers", to: "/client/documents" },
  { key: "memorials", label: "Remembering", to: "/client/memorials" },
  { key: "profile", label: "Your details", to: "/client/profile" },
];

/**
 * Behind “More” — every remaining family page, one plain row each. Help and
 * requests are here too; the Call button in the bar is the always-visible
 * human path, so help does not need its own tab.
 */
export const FAMILY_MORE_NAV: FamilyMoreItem[] = [
  { key: "support", label: "Help and requests", to: "/client/support", detail: "Call us, or ask us for something" },
  { key: "appointments", label: "Ask for a visit", to: "/client/appointments", detail: "We can come to you" },
  { key: "plans", label: "Your plan", to: "/client/plans", detail: "The plan your family holds" },
  { key: "property", label: "Your lot", to: "/client/property", detail: "Your family's place at the park" },
  { key: "family", label: "Family and access", to: "/client/family", detail: "Who can see this arrangement" },
  { key: "notifications", label: "What we tell you about", to: "/client/notifications", detail: "Messages and reminders" },
  { key: "privacy", label: "Privacy Center", to: "/client/privacy", detail: "What we hold, and who looked" },
];

/**
 * Phone bottom bar: four pinned destinations plus More, which opens the same
 * secondary list. `more` is a sheet trigger, not a route.
 */
export const FAMILY_PORTAL_TABS = [
  { key: "dashboard", label: "Home", to: "/client/dashboard", more: false },
  { key: "cases", label: "Funeral", to: "/client/cases", more: false },
  { key: "payments", label: "Payments", to: "/client/payments", more: false },
  { key: "documents", label: "Papers", to: "/client/documents", more: false },
  { key: "more", label: "More", to: "", more: true },
] as const;

/** Every family destination, bar + More, in reading order. */
export const FAMILY_PORTAL_NAV: PortalNavItem[] = [
  ...FAMILY_PRIMARY_NAV,
  ...FAMILY_MORE_NAV.map(({ key, label, to }) => ({ key, label, to })),
];

export const AGENT_PORTAL_NAV: PortalNavItem[] = [
  { key: "dashboard", label: "Dashboard", to: "/agent/dashboard" },
  { key: "clients", label: "Clients", to: "/agent/clients" },
  { key: "prospects", label: "Prospects", to: "/agent/prospects" },
  { key: "applications", label: "Applications", to: "/agent/applications" },
  { key: "sales", label: "Sales & Commissions", to: "/agent/sales" },
  { key: "marketing", label: "Marketing Materials", to: "/agent/marketing" },
];

/** Wrap an ungrouped portal's items so PortalFrame takes one shape. */
export function asSingleGroup(items: PortalNavItem[]): PortalNavGroup[] {
  return [{ label: "", items }];
}
