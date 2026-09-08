// Staff notifications — cross-module alerts for the operations staff.
// Reads the shared notifications context so the header bell's unread count
// clears when items are read here.

import { PageHeader, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { useNotifications } from "../lib/notifications";

function iconFor(channel: string): string {
  switch (channel) {
    case "Commerce": return "shopping_cart";
    case "Operations": return "local_florist";
    case "Finance": return "payments";
    case "Catalog": return "inventory_2";
    default: return "notifications";
  }
}

export function NotificationsPage() {
  const { toast } = useToast();
  const { items, unread, markAllRead } = useNotifications();

  function markAll() {
    markAllRead();
    toast("All notifications marked as read.", "success");
  }

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        actions={
          <button className="btn btn--secondary btn--sm" onClick={markAll}>
            Mark all read
          </button>
        }
      />
      {unread > 0 ? (
        <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
          {unread} unseen notification{unread === 1 ? "" : "s"}.
        </p>
      ) : null}
      <div className="stack">
        {items.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              borderLeft: n.unread ? "3px solid var(--color-accent)" : undefined,
            }}
          >
            <span
              className="avatar"
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{iconFor(n.meta ?? "")}</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                <strong>{n.title}</strong>
                {n.unread && <Badge tone="info">New</Badge>}
              </div>
              <p className="muted" style={{ marginTop: "var(--space-1)" }}>{n.detail}</p>
              <div className="small muted" style={{ marginTop: "var(--space-1)" }}>{n.time} ago</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
