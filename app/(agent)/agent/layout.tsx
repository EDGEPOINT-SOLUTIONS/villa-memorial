import Link from "next/link";
import { cookies } from "next/headers";
import { PortalFrame } from "@/components/portal-frame";
import { AGENT_PORTAL_NAV, asSingleGroup } from "@/components/portal-nav";

/**
 * Agent portal layout — same PortalFrame chrome as the family portal.
 */
export default async function AgentLayout({ children }: { children: React.ReactNode }) {
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
              Villa Memorial <span className="family-shell__brand-sub">· Agent</span>
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
      portal="agent"
      brandLabel="Agent Portal"
      email={email}
      logoutTo="/agent/login"
      nav={asSingleGroup(AGENT_PORTAL_NAV)}
    >
      {children}
    </PortalFrame>
  );
}
