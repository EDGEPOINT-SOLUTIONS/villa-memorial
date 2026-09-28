import Link from "next/link";
import { cookies } from "next/headers";
import { PortalFrame } from "@/components/portal-frame";
import { AGENT_PORTAL_GROUPS, AGENT_PORTAL_TABS } from "@/components/portal-nav";
import { FAMILY_HELP } from "@/lib/family/contact";

/**
 * Agent portal layout — the approved agent design (docs/08-delivery/
 * agent-portal-design) on the shipped PortalFrame: grouped white rail with a
 * sky active edge, phone bottom bar and the office number pinned in the sidebar.
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
      profileTo="/agent/profile"
      logoutTo="/agent/login"
      nav={AGENT_PORTAL_GROUPS}
      tabs={AGENT_PORTAL_TABS}
      help={
        <p className="portal-sidebar__help">
          Need the office?
          <br />
          <strong>{FAMILY_HELP.phone}</strong>
          <br />
          <span>Mon–Sat · 8am–6pm</span>
        </p>
      }
    >
      {children}
    </PortalFrame>
  );
}
