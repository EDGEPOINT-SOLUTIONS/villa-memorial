// ============================================================================
// ClientNotificationsPage — Client (family) portal → Notifications.
// Reads the shared family notifications context so the header bell count stays
// in sync. Demo only — no backend.
// ============================================================================

import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { useToast } from "../components/toast";
import { useNotifications } from "../lib/notifications";

function iconFor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("payment") || t.includes("installment")) return "payments";
  if (t.includes("document")) return "article";
  if (t.includes("request")) return "local_florist";
  return "notifications";
}

export function ClientNotificationsPage() {
  const { toast } = useToast();
  const { items, markAllRead, markRead } = useNotifications();

  function markAll() {
    markAllRead();
    toast("All notifications marked as read.", "success");
  }

  function openNotification(n: { id: string; title: string }) {
    markRead(n.id);
    toast(`Notification: ${n.title} (demo)`);
  }

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md font-label-md uppercase tracking-wider text-primary">
            Family portal
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-on-surface md:text-4xl">
            Notifications
          </h1>
          <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
            Updates about payments, requests, and documents.
          </p>
        </div>
        <button
          type="button"
          onClick={markAll}
          className="self-start rounded-full border-2 border-primary px-5 py-2.5 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed cursor-pointer sm:self-auto"
        >
          Mark all read
        </button>
      </div>

      {/* Notification list */}
      <div className="flex flex-col gap-3">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => openNotification(n)}
            className={`flex w-full items-start gap-4 rounded-xl border bg-surface-container-lowest p-5 text-left shadow-ambient transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift cursor-pointer ${
              n.unread
                ? "border-primary-container/60 border-l-4 border-l-primary"
                : "border-outline-variant/50"
            }`}
          >
            {/* Icon chip */}
            <span
              className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                n.unread ? "bg-primary-fixed text-primary" : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                style={{ fontSize: 20 }}
              >
                {iconFor(n.title)}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  className={`truncate text-label-md font-label-md ${
                    n.unread ? "font-bold text-on-surface" : "text-on-surface"
                  }`}
                >
                  {n.title}
                </span>
                {n.unread && (
                  <span
                    aria-label="Unread"
                    className="h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                  />
                )}
              </span>
              <span className="mt-1 block text-body-md leading-relaxed text-on-surface-variant">
                {n.detail}
              </span>
              <span className="mt-2 block text-xs font-medium uppercase tracking-wider text-on-surface-variant/70">
                {n.time} ago
              </span>
            </span>
          </button>
        ))}
      </div>
    </PortalFrame>
  );
}
