import Link from "next/link";
import { cookies } from "next/headers";
import { Phone } from "lucide-react";
import { PortalFrame } from "@/components/portal-frame";
import { PortalPage } from "@/components/portal/portal-ui";
import { FAMILY_PORTAL_GROUPS, FAMILY_PORTAL_TABS } from "@/components/portal-nav";
import { BRAND_NAME } from "@/lib/brand";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { familyHousehold, monogram } from "@/lib/family/family-view";
import { FAMILY_HELP } from "@/lib/family/contact";
import { currentPortalSession } from "@/lib/auth/family-session";
import { familyImageUrl, readFamilyImage } from "@/lib/family-image-store";

/**
 * Family portal layout — ONE HOUSE STYLE (captain, 2026-09-17): the same
 * PortalFrame chrome as the agent portal (grouped white rail with a sky active
 * edge, white content, phone bottom tabs and drawer), carrying the family's own
 * destinations and plain words. The Call button stays in the phone top bar, so a person is still one
 * tap away on every screen; the sidebar help block names the household and the
 * office line. Signed-out visitors get a slim brand bar; guarding happens
 * per-page via requirePortalSessionOrRedirect.
 *
 * 2026-09-30 (the command-centre rebuild): the chrome gains the captain's TWO
 * additions — the collapsible rail (a persisted per-device choice, 64px when
 * collapsed, with tooltips + labels on every icon) and the account block at the
 * top right (the owner's picture + name + menu, initials disc until a picture
 * exists). ONE identity: this account picture is the same one the Remembering
 * panel shows for the loved one is a DIFFERENT person and lives in the panel.
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
              {BRAND_NAME} <span className="family-shell__brand-sub">· Family</span>
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
  let accountName = "your account";
  try {
    const snapshot = await getFamilySnapshot();
    accountName = snapshot?.family?.display_name?.trim() || "your account";
    household = snapshot
      ? familyHousehold(snapshot.loved_one?.name, snapshot.family?.display_name)
      : "your family";
  } catch {
    household = "your family";
  }

  // The account owner's own picture (the guarded store). Absent is the shipped
  // initials state, never a placeholder face.
  let avatarSrc: string | null = null;
  try {
    const session = await currentPortalSession();
    if (session) {
      const stored = await readFamilyImage(session.userId, "avatar");
      if (stored) avatarSrc = familyImageUrl("avatar", stored.updated_at);
    }
  } catch {
    avatarSrc = null;
  }

  return (
    <>
      {/* Apply the remembered rail choice before first paint, so the rail never
          flashes from expanded to collapsed (plan §7.3). One tiny inline script,
          family chrome only; the toggle writes the same key. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('fv-rail')==='collapsed'){document.documentElement.dataset.rail='collapsed';}}catch(e){}",
        }}
      />
      <PortalFrame
        portal="family"
        brandLabel="Family Portal"
        email={email}
        profileTo="/client/profile"
        logoutTo="/client/login"
        nav={FAMILY_PORTAL_GROUPS}
        tabs={FAMILY_PORTAL_TABS}
        collapsible
        account={{
          name: accountName,
          email,
          initials: monogram(accountName),
          avatarSrc,
          profileTo: "/client/profile",
          familyTo: "/client/family",
          privacyTo: "/client/privacy",
          logoutTo: "/client/login",
        }}
        headerAction={
          <a className="portal-topbar__call" href={FAMILY_HELP.phoneHref}>
            <Phone size={18} aria-hidden="true" />
            <span>Call</span>
          </a>
        }
        railCall={{ href: FAMILY_HELP.phoneHref, label: `Call ${FAMILY_HELP.phone}` }}
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
        {/* The family reading scope: same kit, the family's own text scale. The
            dashboard adds its own dense scope inside this one. */}
        <div className="fv-body">
          <PortalPage>{children}</PortalPage>
        </div>
      </PortalFrame>
    </>
  );
}
