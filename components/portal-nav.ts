/**
 * Portal navigation data (family + agent) — mirror of villa-memorial's
 * CLIENT_NAV / AGENT_NAV order and labels. Icons are resolved by key inside
 * the client PortalFrame (lucide), keeping this file renderer-agnostic.
 *
 * FAMILY: the approved family-portal design (docs/08-delivery/family-portal-design)
 * groups the pages by the family's own questions instead of listing thirteen
 * staff nouns flat. Routes are unchanged; only the grouping, the labels and the
 * mobile tab set are new. `FAMILY_PORTAL_NAV` stays exported as the flat route
 * list so existing tests and consumers keep working.
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

/**
 * The family portal, grouped (design §"Information architecture"):
 *   Home · Our arrangement · Money & papers · Remembering ·
 *   Getting help · Our family & privacy
 * Labels are the family's words — never "My Funeral Cases" / "My Memorial Property".
 */
export const FAMILY_PORTAL_GROUPS: PortalNavGroup[] = [
  {
    label: "",
    items: [{ key: "dashboard", label: "Home", to: "/client/dashboard" }],
  },
  {
    label: "Our arrangement",
    items: [
      { key: "cases", label: "Funeral case", to: "/client/cases" },
      { key: "plans", label: "Memorial plans", to: "/client/plans" },
      { key: "property", label: "Memorial property", to: "/client/property" },
    ],
  },
  {
    label: "Money & papers",
    items: [
      { key: "payments", label: "Payments", to: "/client/payments" },
      { key: "documents", label: "Documents", to: "/client/documents" },
    ],
  },
  {
    label: "Remembering",
    items: [{ key: "memorials", label: "Memorials", to: "/client/memorials" }],
  },
  {
    label: "Getting help",
    items: [
      { key: "appointments", label: "Appointments", to: "/client/appointments" },
      { key: "requests", label: "Requests", to: "/client/requests" },
      { key: "support", label: "Support & tickets", to: "/client/support" },
    ],
  },
  {
    label: "Our family & privacy",
    items: [
      { key: "family", label: "Family & access", to: "/client/family" },
      { key: "notifications", label: "Notifications", to: "/client/notifications" },
      { key: "privacy", label: "Privacy Center", to: "/client/privacy" },
      { key: "profile", label: "My profile", to: "/client/profile" },
    ],
  },
];

/**
 * Mobile bottom bar (design §"Mobile bottom bar"): four pinned destinations plus
 * More, which opens the same grouped navigation in the drawer. Order is the
 * family's priority during an arrangement — home, the funeral, money, help.
 * `more` is a drawer trigger, not a route.
 */
export const FAMILY_PORTAL_TABS = [
  { key: "dashboard", label: "Home", to: "/client/dashboard", more: false },
  { key: "cases", label: "Case", to: "/client/cases", more: false },
  { key: "payments", label: "Payments", to: "/client/payments", more: false },
  { key: "support", label: "Help", to: "/client/support", more: false },
  { key: "more", label: "More", to: "", more: true },
] as const;

/** Flat route list for the family portal (derived from the groups). */
export const FAMILY_PORTAL_NAV: PortalNavItem[] = FAMILY_PORTAL_GROUPS.flatMap(
  (group) => group.items,
);

/**
 * The agent portal, grouped (design §"Information architecture"):
 *   Today · My pipeline · Sell & earn · Tools
 * Labels are the agent's working words; the routes are the shipped ones plus
 * the three new ones the working day needs (Appointments & tasks, Lot
 * availability, New lead). `AGENT_PORTAL_NAV` stays exported as the flat
 * route list so existing consumers keep working.
 */
export const AGENT_PORTAL_GROUPS: PortalNavGroup[] = [
  {
    label: "",
    items: [{ key: "dashboard", label: "Today", to: "/agent/dashboard" }],
  },
  {
    label: "My pipeline",
    items: [
      { key: "prospects", label: "Prospects", to: "/agent/prospects" },
      { key: "clients", label: "Clients", to: "/agent/clients" },
      { key: "appointments", label: "Appointments & tasks", to: "/agent/appointments" },
    ],
  },
  {
    label: "Sell & earn",
    items: [
      { key: "lots", label: "Lot availability", to: "/agent/lots" },
      { key: "sales", label: "Sales & commissions", to: "/agent/sales" },
      { key: "applications", label: "Applications", to: "/agent/applications" },
    ],
  },
  {
    label: "Tools",
    items: [
      { key: "marketing", label: "Marketing & materials", to: "/agent/marketing" },
      { key: "capture", label: "New lead", to: "/agent/new" },
    ],
  },
];

/**
 * Mobile bottom bar (design §"Phone bottom bar"): four pinned destinations plus
 * More, which opens the same groups in the drawer. Order is the agent's day —
 * today's work, the people, the place they are shown, then everything else.
 * `more` is a drawer trigger, not a route.
 */
export const AGENT_PORTAL_TABS = [
  { key: "dashboard", label: "Today", to: "/agent/dashboard", more: false },
  { key: "prospects", label: "Pipeline", to: "/agent/prospects", more: false },
  { key: "clients", label: "Clients", to: "/agent/clients", more: false },
  { key: "lots", label: "Lots", to: "/agent/lots", more: false },
  { key: "more", label: "More", to: "", more: true },
] as const;

/** Flat route list for the agent portal (derived from the groups). */
export const AGENT_PORTAL_NAV: PortalNavItem[] = AGENT_PORTAL_GROUPS.flatMap(
  (group) => group.items,
);

/** Wrap an ungrouped portal's items so PortalFrame takes one shape. */
export function asSingleGroup(items: PortalNavItem[]): PortalNavGroup[] {
  return [{ label: "", items }];
}
