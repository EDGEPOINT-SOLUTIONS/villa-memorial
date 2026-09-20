import { AppShell } from "@/components/ui/app-shell";
import { NotificationBell } from "@/components/notification-bell";
import { PortalSwitch } from "@/components/portal-switch";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { isStaffSession, portalHomeFor } from "@/lib/auth/destination";
import { STAFF_NOTICES } from "@/lib/demo-notices";
import { visibleNav } from "@/lib/rbac/nav";
import { redirect } from "next/navigation";

/**
 * Admin Portal frame (RBAC-gated). Session is validated server-side on every
 * navigation; nav items render only for scopes the session actually holds.
 * A signed-in customer or agent who lands here is sent to their own portal
 * home instead of seeing a hollow staff shell.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrRedirect();
  if (!isStaffSession(session.scopes)) {
    redirect(portalHomeFor(session.scopes));
  }
  const sections = visibleNav(session.scopes);

  return (
    <AppShell
      brandEyebrow="Villa Memorial"
      brandTitle="Admin Portal"
      sections={sections}
      topbar={
        <div className="app-topbar__group">
          <span className="app-topbar__context">Workspace</span>
          <TenantSwitcher />
          <span className="chip">Demo</span>
          <NotificationBell to="/staff/notifications" notices={STAFF_NOTICES} />
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
