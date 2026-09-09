import Link from "next/link";
import { cookies } from "next/headers";
import { NotificationBell } from "@/components/notification-bell";
import { PortalFrame } from "@/components/portal-frame";
import { FAMILY_PORTAL_NAV } from "@/components/portal-nav";
import { FAMILY_NOTICES } from "@/lib/demo-notices";

/**
 * Family portal layout — villa-style PortalFrame (left sidebar desktop,
 * top bar + drawer mobile). Signed-out visitors (the /client/login page) get a
 * slim brand bar; guarding happens per-page via requireFamilySessionOrRedirect.
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

  return (
    <PortalFrame
      portal="family"
      brandLabel="Family Portal"
      email={email}
      logoutTo="/client/login"
      nav={FAMILY_PORTAL_NAV}
      bell={<NotificationBell to="/client/notifications" notices={FAMILY_NOTICES} />}
    >
      {children}
    </PortalFrame>
  );
}
