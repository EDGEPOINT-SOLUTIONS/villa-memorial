/**
 * PRD coverage for the family portal — the machine-readable answer to
 * “is every family screen the PRD names actually on the portal, and in what
 * state?”.
 *
 * Source of truth for the screen list: the in-memoriam PRD,
 * `docs/04-modules/screen-inventory.md` §“Customer/family portal” (12 screens).
 * The module column names the PRD file that owns each screen's contents; the
 * `missing` column is the honest answer to “what is still needed for it to be
 * real” (nothing here promises a contract that does not exist).
 *
 * States:
 *   built   — the screen does its job today with real data/actions;
 *   partial — real data on screen, with named honest states for what is not
 *             switched on yet;
 *   honest  — the service does not exist yet, so the screen is the designed
 *             honest page (what will be here, what is missing, who to call).
 *
 * The four screens that needed a family-facing service (lots, memorials,
 * requests, appointments) moved from `honest` to `partial` on 2026-09-18: each
 * now shows the office's own record through one provisional fixture
 * (`lib/fixtures/family/workspace.json`), each ends in the calm note naming the
 * contract it still waits on, and none of them invents a figure, a chapel, a
 * ticket number or a published memorial.
 *
 * tests/unit/family-prd-coverage.test.ts pins every route to a page on disk and
 * every screen to a family rail entry, so this table cannot drift.
 */
export type FamilyScreenState = "built" | "partial" | "honest";

export type FamilyScreenCoverage = {
  /** The PRD screen name, exactly as the screen inventory spells it. */
  screen: string;
  /** The family route that answers it. */
  route: string;
  state: FamilyScreenState;
  /** The PRD module that owns the screen's contents. */
  module: string;
  /** What is still missing for the screen to be fully real. */
  missing: string;
};

/** The 12 family screens of PRD `04-modules/screen-inventory.md`. */
export const FAMILY_PRD_SCREENS: FamilyScreenCoverage[] = [
  {
    screen: "Customer Dashboard",
    route: "/client/dashboard",
    state: "partial",
    module: "crm-cases.md · finance-billing.md",
    missing:
      "The funeral schedule and case progress are not projected yet, and the full payment history is not wired — the command centre names each gap in place and points to the office phone.",
  },
  {
    screen: "Family Dashboard",
    route: "/client/family",
    state: "partial",
    module: "crm-cases.md » Family account / memorial archive",
    missing:
      "Family membership with its own roles needs the identity service; lot, interment and memorial projections are not wired (each row links to its own honest screen).",
  },
  {
    screen: "My Plans",
    route: "/client/plans",
    state: "partial",
    module: "finance-billing.md",
    missing:
      "The instalment schedule now shows from the family's own recorded plan; the plan certificate and the frozen family contract still wait on the contracts/documents service.",
  },
  {
    screen: "My Lots",
    route: "/client/property",
    state: "partial",
    module: "memorial-property-gis.md",
    missing:
      "The family's lot record shows the place, the plan and the money already on it; the ownership papers, co-owners, right of interment and lot history wait on a family-facing lot/ownership projection.",
  },
  {
    screen: "My Payments",
    route: "/client/payments",
    state: "partial",
    module: "finance-billing.md",
    missing:
      "Upcoming and overdue instalments show from the family's own plan; the payment history, receipts and online payment still need the payments/AR service.",
  },
  {
    screen: "My Documents",
    route: "/client/documents",
    state: "partial",
    module: "documents-contracts.md",
    missing:
      "The full family document repository, downloads and certified copies need the documents service.",
  },
  {
    screen: "My Memorials",
    route: "/client/memorials",
    state: "partial",
    module: "06-cultural-digital-memorial/digital-memorial.md",
    missing:
      "The record we hold (name, dates, place) and the choices are on the page, and the state is plainly “nothing published”; the digital-memorial service (content, moderation, visibility) is not built, so the page itself cannot open.",
  },
  {
    screen: "My Funeral Cases",
    route: "/client/cases",
    state: "honest",
    module: "crm-cases.md » Funeral case management",
    missing:
      "The case projection (viewing, service, burial, what the office is handling) needs the case service.",
  },
  {
    screen: "My Requests",
    route: "/client/requests",
    state: "partial",
    module: "crm-cases.md » Customer service ticketing",
    missing:
      "The office's own record of the family's requests shows with each state; the service desk / ticket contract (assignment, SLA, history) does not exist yet, so a phone call is the one route that reaches a person.",
  },
  {
    screen: "My Appointments",
    route: "/client/appointments",
    state: "partial",
    module: "facilities-scheduling.md",
    missing:
      "Confirmed, waiting and past times show from the office's record; scheduling has no family-facing read/write contract, so booking, moving and reminders stay with the office and a time is only real once a person confirms it.",
  },
  {
    screen: "Support/Ticket",
    route: "/client/support",
    state: "built",
    module: "crm-cases.md » Customer service ticketing",
    missing:
      "Creating and tracking a ticket waits on the service desk; the real numbers and places are on the page today.",
  },
  {
    screen: "Privacy Center",
    route: "/client/privacy",
    state: "honest",
    module: "docs/02-architecture/roles-permissions.md · Data Privacy Act",
    missing:
      "Consent controls and the staff access log need a privacy service; the promises are published and no default is invented.",
  },
];

/**
 * Screens the family-portal requirements add beyond the inventory list
 * (blueprint §39 “Family portal” and the notifications engine in
 * documents-contracts.md). They are real routes and are covered the same way.
 */
export const FAMILY_SUPPORTING_SCREENS: FamilyScreenCoverage[] = [
  {
    screen: "Notifications / what we tell the family",
    route: "/client/notifications",
    state: "honest",
    module: "documents-contracts.md » Notifications engine",
    missing:
      "The notification service is not switched on; nothing is listed and no placeholder notice fakes delivery.",
  },
  {
    screen: "Permitted profile updates",
    route: "/client/profile",
    state: "partial",
    module: "digital-memorial.md » Family portal (blueprint §39)",
    missing:
      "Editing the family's own details needs the identity write path; the device-local reading preferences work today.",
  },
];

/** Every family screen this table covers. */
export const FAMILY_COVERED_SCREENS: FamilyScreenCoverage[] = [
  ...FAMILY_PRD_SCREENS,
  ...FAMILY_SUPPORTING_SCREENS,
];
