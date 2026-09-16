import Link from "next/link";
import { cookies } from "next/headers";
import { NotificationBell } from "@/components/notification-bell";
import { PortalFrame } from "@/components/portal-frame";
import { FAMILY_PORTAL_GROUPS, FAMILY_PORTAL_TABS } from "@/components/portal-nav";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FAMILY_NOTICES } from "@/lib/demo-notices";

/**
 * Family portal layout — villa-style PortalFrame (left sidebar desktop,
 * top bar + drawer + bottom tabs mobile). Signed-out visitors (the
 * /client/login page) get a slim brand bar; guarding happens per-page via
 * requirePortalSessionOrRedirect.
 *
 * The layout follows the approved family-portal design
 * (docs/08-delivery/family-portal-design): grouped navigation, four pinned
 * phone tabs plus More, and the coordinator's number one tap away on every page.
 */
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const rawUser = jar.get("im_u")?.value;
  let email: string | null = null;
  if (rawUser) {
    try {
      const user = JSON.parse(Buffer.from(rawUser, "base64").toString("utf8")) as {
        email?: string;
      };
      email = user.email ?? null;
    } catch {
      email = null;
    }
  }

  if (!email) {
    return (
      <div className="family-shell">
        <header className="family-shell__header">
          <div className="container family-shell__bar">
            <Link href="/" className="family-shell__brand">
              Villa Memorial <span className="family-shell__brand-sub">· Family</span>
            </Link>
            <Link href="/login" className="btn btn--secondary btn--sm">
              Staff sign-in
            </Link>
          </div>
        </header>
        <main className="family-shell__main">{children}</main>
      </div>
    );
  }

  const help = (
    <p className="portal-sidebar__help">
      Need to talk to someone?
      <br />
      <strong>{FAMILY_HELP.phone}</strong>
      <br />
      <span>{FAMILY_HELP.hours}</span>
    </p>
  );

  return (
    <PortalFrame
      portal="family"
      brandLabel="Family Portal"
      email={email}
      logoutTo="/client/login"
      nav={FAMILY_PORTAL_GROUPS}
      tabs={FAMILY_PORTAL_TABS}
      help={help}
      bell={<NotificationBell to="/client/notifications" notices={FAMILY_NOTICES} />}
    >
      {children}
    </PortalFrame>
  );
}
