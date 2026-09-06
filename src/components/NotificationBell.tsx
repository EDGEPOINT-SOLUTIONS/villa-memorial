// NotificationBell — a header bell showing how many notices are still unseen.
// Generic (ⓡ): it only renders a count and a link; the target and state come
// from the caller via the notifications context.

import { Link } from "react-router-dom";
import { useNotifications } from "../lib/notifications";

export function NotificationBell({
  to,
  tone = "light",
}: {
  to: string;
  tone?: "light" | "dark";
}) {
  const { unread } = useNotifications();
  const base =
    tone === "dark"
      ? "text-on-surface-variant hover:text-primary"
      : "text-on-surface-variant hover:text-primary";
  return (
    <Link
      to={to}
      aria-label={`Notifications${unread > 0 ? `, ${unread} unseen` : ""}`}
      className={`relative inline-flex items-center p-2 rounded-full hover:bg-surface-container-low transition-colors hover:no-underline! ${base}`}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        notifications
      </span>
      {unread > 0 ? (
        <span
          className="absolute -top-0.5 -right-0.5 bg-[#ba1a1a] text-white text-[11px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center"
          aria-hidden="true"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
