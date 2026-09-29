/**
 * The home entrance's two session keys (office, inbox 058).
 *
 * They live in a PLAIN module, not beside the component: a constant exported
 * from a `"use client"` file reaches a Server Component as a client-reference
 * proxy, so `cookieStore.get(INTRO_COOKIE)` silently reads `undefined` and the
 * gate never closes. Both sides import from here.
 */

/** The cookie the home route reads before paint. A SESSION cookie: no
 *  Max-Age/Expires, so it dies with the browser session exactly as the
 *  sessionStorage guard does. */
export const INTRO_COOKIE = "villa_home_intro_seen";

/** sessionStorage key — the client-side half of the once-per-session guard. */
export const SEEN_KEY = "villa-home-intro-seen";
