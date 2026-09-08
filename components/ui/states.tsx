import { EmptyState } from "@/components/ui/empty-state";

/** Graceful permission-denied state — UI only; services enforce authz. */
export function ForbiddenState({ requiredScopes }: { requiredScopes: string[] }) {
  return (
    <div className="empty-state" role="alert">
      <p className="empty-state__title">You don&rsquo;t have access to this area</p>
      <p className="empty-state__hint">
        Your sign-in doesn&rsquo;t include the permissions this screen needs
        {requiredScopes.length > 0 ? ` (${requiredScopes.join(", ")})` : ""}. Ask an
        administrator if you believe this is a mistake.
      </p>
    </div>
  );
}

export function SignedOutState() {
  return (
    <div className="empty-state">
      <p className="empty-state__title">Signed out</p>
      <p className="empty-state__hint">Sign in again to continue.</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="alert alert--danger" role="alert">
      <span>{message}</span>
    </div>
  );
}

export function NotWiredState({ area, reason }: { area: string; reason?: string }) {
  return (
    <EmptyState
      title={`${area} screen is not wired yet`}
      hint={
        reason ??
        `This section of the portal frame exists so navigation and permissions can be verified. The working ${area.toLowerCase()} screen arrives with its module's delivery.`
      }
    />
  );
}
