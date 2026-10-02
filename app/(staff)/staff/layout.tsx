import { AppShell } from "@/components/ui/app-shell";
import { NotificationBell } from "@/components/notification-bell";
import { PortalSwitch } from "@/components/portal-switch";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { totalOfficeUnread } from "@/lib/api-client/chat-store";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { portalForSession, portalHomeForSession } from "@/lib/auth/destination";
import { BRAND_NAME } from "@/lib/brand";
import { STAFF_NOTICES } from "@/lib/demo-notices";
import { visibleNav } from "@/lib/rbac/nav";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Admin Portal frame (RBAC-gated). Session is validated server-side on every
 * navigation; nav items render only for scopes the session actually holds.
 * A signed-in customer or agent who lands here is sent to their own portal
 * home instead of seeing a hollow staff shell.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrRedirect();
  if (portalForSession(session) !== "staff") {
    redirect(portalHomeForSession(session));
  }
  const sections = visibleNav(session.scopes);

  // The Inbox badge: the office's unread family/agent messages. Best-effort — a store
  // that cannot be read must never take down every staff screen, so it degrades to no
  // badge rather than an error.
  let unread = 0;
  try {
    unread = await totalOfficeUnread();
  } catch {
    unread = 0;
  }
  const decorated =
    unread > 0
      ? sections.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            item.href === "/staff/inbox" ? { ...item, badge: unread } : item,
          ),
        }))
      : sections;

  return (
    <AppShell
      brandEyebrow={BRAND_NAME}
      brandTitle="Admin Portal"
      sections={decorated}
      topbar={
        <div className="app-topbar__group">
          <span className="app-topbar__context">Workspace</span>
          <TenantSwitcher />
          <span className="chip">Demo</span>
          <NotificationBell to="/staff/notifications" notices={STAFF_NOTICES} />
          {/* AI Copilot (PRD S29) left the curated rail in the 2026-10-02 revision
              but keeps its route: the workspace topbar is its door, beside the bell. */}
          <Link href="/staff/copilot" className="chip" aria-label="AI Copilot">
            Copilot
          </Link>
          <span className="topbar-avatar" aria-hidden="true">
            {session.displayName.charAt(0)}
          </span>
        </div>
      }
      footer={
        <div className="stack-3">
          <p className="mb-0 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Signed in as
            <br />
            <strong style={{ color: "var(--color-text-primary)" }}>
              {session.email}
            </strong>
          </p>
          <SignOutButton />
          <div style={{ marginTop: "var(--space-2)" }}>
            <PortalSwitch current="staff" inverse />
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
