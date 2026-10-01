import Link from "next/link";
import { cookies } from "next/headers";
import { PortalFrame } from "@/components/portal-frame";
import { AGENT_PORTAL_GROUPS, AGENT_PORTAL_TABS } from "@/components/portal-nav";
import { getAgentWorkspace } from "@/lib/api-client/agent";
import { BRAND_NAME } from "@/lib/brand";
import { FAMILY_HELP } from "@/lib/family/contact";
import { monogram } from "@/lib/family/family-view";

/**
 * Agent portal layout — the approved agent design (docs/08-delivery/
 * agent-portal-design) on the shipped PortalFrame: grouped white rail with a
 * sky active edge, phone bottom bar and the office number pinned in the sidebar.
 *
 * The account chip carries the agent's own identity (plan §7.6): the office's
 * agent record (`lib/fixtures/agent/workspace.json` `agent`) is the source, with
 * the signed-in cookie only as a fallback. There is no recorded agent picture
 * and no agent image store, so `avatarSrc` is absent and the shared Avatar
 * renders its initials disc — never a borrowed client photograph.
 */
export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const rawUser = jar.get("im_u")?.value;
  let email: string | null = null;
  let cookieName = "Agent";
  if (rawUser) {
    try {
      const user = JSON.parse(Buffer.from(rawUser, "base64").toString("utf8")) as {
        email?: string;
        display_name?: string;
      };
      email = user.email ?? null;
      cookieName = user.display_name ?? cookieName;
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
              {BRAND_NAME} <span className="family-shell__brand-sub">· Agent</span>
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

  // The office's agent record is the identity source; the cookie is the fallback
  // so a fixture read that ever fails still leaves a usable account chip.
  let accountName = cookieName;
  try {
    const record = (await getAgentWorkspace()).agent;
    if (record.display_name?.trim()) accountName = record.display_name.trim();
  } catch {
    /* keep the cookie name — the frame must still render */
  }
  const initials = monogram(accountName) || "A";

  return (
    <>
      {/* Apply the remembered rail choice before first paint, so the rail never
          flashes from expanded to collapsed (the family portal's rule, now
          shared). The toggle writes the same `fv-rail` key. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('fv-rail')==='collapsed'){document.documentElement.dataset.rail='collapsed';}}catch(e){}",
        }}
      />
      <PortalFrame
        portal="agent"
        brandLabel="Agent Portal"
        email={email}
        profileTo="/agent/profile"
        logoutTo="/agent/login"
        nav={AGENT_PORTAL_GROUPS}
        tabs={AGENT_PORTAL_TABS}
        collapsible
        account={{
          name: accountName,
          email,
          initials,
          profileTo: "/agent/profile",
          logoutTo: "/agent/login",
        }}
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
    </>
  );
}
