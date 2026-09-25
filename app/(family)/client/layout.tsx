import Link from "next/link";
import { cookies } from "next/headers";
import { Phone } from "lucide-react";
import { PortalFrame } from "@/components/portal-frame";
import { PortalPage } from "@/components/portal/portal-ui";
import { FAMILY_PORTAL_GROUPS, FAMILY_PORTAL_TABS } from "@/components/portal-nav";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { familyHousehold } from "@/lib/family/family-view";
import { FAMILY_HELP } from "@/lib/family/contact";

/**
 * Family portal layout — ONE HOUSE STYLE (captain, 2026-09-17): the same
 * PortalFrame chrome as the agent portal (grouped white rail with a sky active
 * edge, white content, phone bottom tabs and drawer), carrying the family's own
 * destinations and plain words. The Call button stays in the phone top bar, so a person is still one
 * tap away on every screen; the sidebar help block names the household and the
 * office line. Signed-out visitors get a slim brand bar; guarding happens
 * per-page via requirePortalSessionOrRedirect.
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

  // The household name is presentation only; the snapshot is provisional, so a
  // failure must never stop the shell from rendering.
  let household = "your family";
  try {
    const snapshot = await getFamilySnapshot();
    household = familyHousehold(snapshot.loved_one?.name, snapshot.family?.display_name);
  } catch {
    household = "your family";
  }

  return (
    <PortalFrame
      portal="family"
      brandLabel="Family Portal"
      email={email}
      logoutTo="/client/login"
      nav={FAMILY_PORTAL_GROUPS}
      tabs={FAMILY_PORTAL_TABS}
      headerAction={
        <a className="portal-topbar__call" href={FAMILY_HELP.phoneHref}>
          <Phone size={18} aria-hidden="true" />
          <span>Call</span>
        </a>
      }
      help={
        <p className="portal-sidebar__help">
          Looking after {household}
          <br />
          Call <strong>{FAMILY_HELP.phone}</strong>
          <br />
          <span>{FAMILY_HELP.hours}</span>
        </p>
      }
    >
      {/* The family reading scope: same kit, the family's own text scale. */}
      <div className="fv-body">
        <PortalPage>{children}</PortalPage>
      </div>
    </PortalFrame>
  );
}
