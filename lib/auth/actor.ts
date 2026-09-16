/**
 * Who performed a staff action — for the app-authored records that carry an
 * actor (booking confirmations/cancellations, chapel closures). Prefers the
 * human display name in the `im_u` cookie and falls back to the token subject,
 * exactly like the Orders admin's timeline does.
 */
import type { JwtClaims } from "@/lib/auth/session";

export function actorFromUserCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const user = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as {
      display_name?: unknown;
      email?: unknown;
    };
    if (typeof user.display_name === "string" && user.display_name.trim().length > 0) {
      return user.display_name;
    }
    if (typeof user.email === "string" && user.email.trim().length > 0) {
      return user.email;
    }
  } catch {
    // fall through to the claims subject
  }
  return null;
}

/** The actor name for the current session's cookies. */
export function staffActorName(
  userCookie: string | undefined,
  claims: Pick<JwtClaims, "sub">,
): string {
  return actorFromUserCookie(userCookie) ?? claims.sub;
}
