import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, buildSession } from "@/lib/auth/session";
import type { SafeUser } from "@/lib/auth/types";

/**
 * Server-side gate for the portal. Reads httpOnly cookies, validates claim
 * structure defensively; anything unexpected/expired → sign-in screen.
 * Returns the full UI-facing session view for layouts/pages.
 */
export async function requireSessionOrRedirect() {
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

  const session = buildSession(token, user);
  if (!session) {
    redirect("/login");
  }
  // Satisfy TS: redirect() never returns, so session is non-null below.
  return session as NonNullable<typeof session>;
}

export type { SafeUser };

/**
 * OPTIONAL session read for PUBLIC pages: the same defensive cookie parse as the
 * portal guard, but a signed-out (or malformed/expired) session is simply `null`
 * instead of a redirect. Used where a page is public but a signed-in staff member
 * gets extra capability — e.g. the park map's admin-only plotting tools.
 */
export async function optionalSession() {
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

  // Unknown shape → logged out, never a crash (web/AGENTS.md trap).
  return buildSession(token, user);
}
