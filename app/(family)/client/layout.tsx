import Link from "next/link";
import { cookies } from "next/headers";
import { FamilyFrame } from "@/components/family/family-frame";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { familyHousehold } from "@/lib/family/family-view";

/**
 * Family portal layout — the approved 2026-09-16 redesign: one plain top bar
 * with six names and the Call button, a single reading column, and five phone
 * tabs with More. Signed-out visitors get a slim brand bar; guarding happens
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
    <FamilyFrame household={household} logoutTo="/client/login">
      {children}
    </FamilyFrame>
  );
}
