import { cookies } from "next/headers";
import { ACCESS_COOKIE, buildSession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/types";
import { portalForSession } from "@/lib/auth/destination";

/**
 * The read-only session view for a family-scoped BFF route.
 *
 * Server-side only. The family pages use `requirePortalSessionOrRedirect`
 * (which redirects a stranger to the sign-in door); an API route must instead
 * answer 401/404, so it asks this helper and decides. A session belongs to the
 * family surface when its portal is `family` — or `staff`, who may preview the
 * family portal (the same rule as `lib/auth/portal-guard.ts`).
 *
 * The returned `userId` (the token `sub`) is the one identity key the private
 * family image store is written and read under.
 */
export async function currentPortalSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  let user: unknown = null;
  const rawUser = jar.get("im_u")?.value;
  if (rawUser) {
    try {
      user = JSON.parse(Buffer.from(rawUser, "base64").toString("utf8"));
    } catch {
      user = null;
    }
  }
  return buildSession(token, user);
}

/** The session when it may see family data, or null (signed out / wrong portal). */
export async function familySessionOrNull(): Promise<Session | null> {
  const session = await currentPortalSession();
  if (!session) return null;
  const portal = portalForSession(session);
  return portal === "family" || portal === "staff" ? session : null;
}
