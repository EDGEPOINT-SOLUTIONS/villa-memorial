/**
 * Portal navigation data (family + agent) — villa-memorial's CLIENT_NAV /
 * AGENT_NAV order and labels. Icons are resolved by key inside the client
 * frame (lucide), keeping this file renderer-agnostic.
 *
 * ONE HOUSE STYLE (captain, 2026-09-17): the family portal now uses the same
 * grouped rail as the agent portal (components/portal-frame.tsx). The family
 * keeps its own plain words and its own destinations — routes are unchanged —
 * but the navigation pattern, order and grouping are the agent portal's.
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

/**
 * The family rail, grouped the way the agent rail is (design §3 IA): the
 * family's own plain words, in the family's reading order — the answer, the
 * funeral, the money, the memory, the people, then help and the account.
 */
export const FAMILY_PORTAL_GROUPS: PortalNavGroup[] = [
  {
    label: "",
    items: [{ key: "dashboard", label: "Home", to: "/client/dashboard" }],
  },
  {
    label: "The funeral",
    items: [
      { key: "cases", label: "The funeral", to: "/client/cases" },
      { key: "documents", label: "Papers", to: "/client/documents" },
      { key: "appointments", label: "Ask for a visit", to: "/client/appointments" },
    ],
  },
  {
    label: "Money and your plan",
    items: [
      { key: "payments", label: "Payments", to: "/client/payments" },
      { key: "plans", label: "Your plan", to: "/client/plans" },
      { key: "property", label: "Your lot", to: "/client/property" },
    ],
  },
  {
    label: "Remembering",
    items: [
      { key: "memorials", label: "Remembering", to: "/client/memorials" },
      { key: "family", label: "Your family", to: "/client/family" },
    ],
  },
  {
    label: "Help",
    items: [
      { key: "support", label: "Help and requests", to: "/client/support" },
      { key: "requests", label: "Ask us for something", to: "/client/requests" },
    ],
  },
  {
    label: "Your account",
    items: [
      { key: "notifications", label: "What we tell you about", to: "/client/notifications" },
      { key: "privacy", label: "Privacy Center", to: "/client/privacy" },
      { key: "profile", label: "Your details", to: "/client/profile" },
    ],
  },
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

/** Every family destination, in rail order. */
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
  {
    label: "Your account",
    items: [{ key: "profile", label: "Profile", to: "/agent/profile" }],
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
