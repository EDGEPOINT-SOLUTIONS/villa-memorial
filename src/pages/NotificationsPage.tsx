// Staff notifications — cross-module alerts for the operations staff.

import { useState } from "react";
import { PageHeader, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { STAFF_NOTICES } from "../lib/data";

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
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const unread = (id: string) => STAFF_NOTICES.find((n) => n.id === id)?.unread && !readIds.has(id);

  function markAllRead() {
    setReadIds(new Set(STAFF_NOTICES.map((n) => n.id)));
    toast("All notifications marked as read.", "success");
  }

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        actions={
          <button className="btn btn--secondary btn--sm" onClick={markAllRead}>
            Mark all read
          </button>
        }
      />
      <div className="stack">
        {STAFF_NOTICES.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              borderLeft: unread(n.id) ? "3px solid var(--color-accent)" : undefined,
            }}
          >
            <span
              className="avatar"
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{iconFor(n.channel)}</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                <strong>{n.title}</strong>
                <Badge tone="neutral">{n.channel}</Badge>
                {unread(n.id) && <Badge tone="info">New</Badge>}
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
