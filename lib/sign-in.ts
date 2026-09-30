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

/**
 * The sign-in page is ONE page for every door (captain, 2026-09-30): the same
 * title, the same form, and the three portals offered beneath it. There is no
 * per-door marketing copy — a sign-in screen should be practical, and the door
 * names at the foot already say which portal each account opens.
 */
export const SIGN_IN_TITLE = "Sign in";

/** The three account doors the sign-in page offers, in the order it shows them. */
export const SIGN_IN_DOORS: ReadonlyArray<{ key: SignInDoor; label: string; href: string }> = [
  { key: "staff", label: "Admin", href: "/login" },
  { key: "family", label: "Family", href: "/client/login" },
  { key: "agent", label: "Agent", href: "/agent/login" },
];
