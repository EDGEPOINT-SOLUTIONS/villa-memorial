/**
 * Shared sign-in door configuration — one design, three doors.
 * Personas for quick-fill live with each page (they mirror the auth fixtures).
 */
export type SignInDoor = "staff" | "family" | "agent";

/**
 * Persona demo hints (the chips on the sign-in cards) — ONE switch, build-time.
 *
 * `NEXT_PUBLIC_DEMO_HINTS` is inlined into the bundle at build time, so this is a
 * constant in a running server: demo stacks build with 1 (the Dockerfile's
 * `NEXT_PUBLIC_DEMO_HINTS` arg, which `docker-compose.yml` passes) and the
 * production image builds with 0 (docker-compose.production.yml pins it).
 *
 * The doors read this to decide whether to hand the card a persona list AT ALL:
 * a client component's props travel in the server response's RSC payload even
 * when the card does not render them, so a production build that passed the list
 * would still ship the demo addresses to every visitor. Unset means visible
 * (the local-dev default, matching .env.example).
 */
export function demoHintsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_HINTS !== "0";
}

export const SIGN_IN_BLURBS: Record<
  SignInDoor,
  { eyebrow: string; title: string; blurb: string }
> = {
  staff: {
    eyebrow: "Villa Memorial · Staff",
    title: "Staff portal",
    blurb: "Operations, finance, property and the people who run it all.",
  },
  family: {
    eyebrow: "Villa Memorial · Family",
    title: "Sign in to see what is happening",
    blurb:
      "This private page shows your family’s arrangement — the schedule, the payments and the papers. Only your family and the staff who serve you can see it.",
  },
  agent: {
    eyebrow: "Villa Memorial · Agent",
    title: "Agent portal",
    blurb: "Clients, prospects and commissions for our sales partners.",
  },
};
