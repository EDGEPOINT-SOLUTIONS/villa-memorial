/**
 * Shared sign-in door configuration — one design, three doors.
 * Personas for quick-fill live with each page (they mirror the auth fixtures).
 */
export type SignInDoor = "staff" | "family" | "agent";

export const SIGN_IN_BLURBS: Record<
  SignInDoor,
  { eyebrow: string; title: string; blurb: string }
> = {
  staff: {
    eyebrow: "In Memoriam · Staff",
    title: "Staff portal",
    blurb: "Operations, finance, property and the people who run it all.",
  },
  family: {
    eyebrow: "In Memoriam · Family",
    title: "Family portal",
    blurb: "Arrangements, plans, payments and documents — one calm place for your family.",
  },
  agent: {
    eyebrow: "In Memoriam · Agent",
    title: "Agent portal",
    blurb: "Clients, prospects and commissions for our sales partners.",
  },
};
