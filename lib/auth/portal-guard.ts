import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, buildSession } from "@/lib/auth/session";
import { portalForSession, portalHomeForSession } from "@/lib/auth/destination";

type Portal = "family" | "agent";

/**
 * Portal membership guard — a signed-in user may enter a portal when they BELONG
 * there (family portal: family or staff-preview; agent portal: agents or staff).
 * Anyone else is routed to their own portal home; signed-out visitors go to the
 * portal's sign-in door. Staff may preview both portals; customers never see the
 * agent portal and agents never see the family portal.
 */
export async function requirePortalSessionOrRedirect(portal: Portal) {
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
    redirect(portal === "family" ? "/client/login" : "/agent/login");
  }

  const portalOfSession = portalForSession(session);
  const allowed =
    portal === "family"
      ? portalOfSession === "staff" || portalOfSession === "family"
      : portalOfSession === "staff" || portalOfSession === "agent";

  if (!allowed) {
    // Belongs to another portal — send them home, never show a hollow shell.
    redirect(portalHomeForSession(session));
  }

  return session as NonNullable<typeof session>;
}
