/**
 * Server-only demo quick-fill password for the sign-in persona buttons.
 *
 * The demo buttons on /login, /client/login and /agent/login fill the persona
 * email; when a DEMO deployment opts in they also fill the password. The value
 * is resolved per request (this module) and handed to the client card as a prop,
 * so it travels in that response's HTML/RSC payload — never in the compiled
 * public JS bundle. Contrast `NEXT_PUBLIC_DEMO_PASSWORD`, which is inlined into
 * public JavaScript at build time and therefore stays LOCAL-DEV-ONLY.
 *
 * Enable with the server-side runtime env `DEMO_QUICK_FILL=1` (no NEXT_PUBLIC_
 * prefix, so it is read at request time, not baked into a build):
 *   DEMO_QUICK_FILL_PASSWORD set → that value. This is the source a deployment
 *     pointed at a gateway (e.g. docker compose → stub-gateway) must use.
 *   no password + fixture mode (AUTH_BASE_URL unset) → the recorded dev seed
 *     password from lib/fixtures/auth/personas.json (already public with the
 *     repo; fixture mode never runs in production).
 *   no password + a gateway configured → null. The repo seed is never handed to
 *     a live gateway, so a mis-set flag degrades to today's email-only fill.
 *
 * Unset/anything-but-"1" → null: exactly today's behaviour (email-only fill).
 *
 * Import this ONLY from server components. A client import would make Next
 * bundle the fixture file into public JS through the client graph.
 */
import personas from "@/lib/fixtures/auth/personas.json";

export function demoQuickFillPassword(): string | null {
  if (process.env.DEMO_QUICK_FILL !== "1") return null;

  const explicit = process.env.DEMO_QUICK_FILL_PASSWORD?.trim();
  if (explicit) return explicit;

  // Read AUTH_BASE_URL directly instead of authLiveModeEnabled() so this stays a
  // tiny server-only helper (no identity-access client import) and resolves at
  // request time rather than at module init.
  const gatewayConfigured = (process.env.AUTH_BASE_URL ?? "").length > 0;
  return gatewayConfigured ? null : personas.password;
}
