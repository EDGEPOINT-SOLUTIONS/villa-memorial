"use client";

/**
 * Notification bell — villa-memorial parity (generic chrome: count + link).
 * Count comes from the demo notices fixture until the real notification
 * contract lands; the bell links to the portal's notifications page.
 */
import Link from "next/link";
import { Bell } from "lucide-react";
import { unreadCount, type DemoNotice } from "@/lib/demo-notices";

export function NotificationBell({
  to,
  notices,
  tone = "light",
}: {
  to: string;
  notices: DemoNotice[];
  tone?: "light" | "dark";
}) {
  const count = unreadCount(notices);
  return (
    <Link
      href={to}
      aria-label={`Notifications${count > 0 ? `, ${count} unseen` : ""}`}
      className={`notice-bell${tone === "dark" ? " notice-bell--dark" : ""}`}
      title="Notifications"
    >
      <Bell size={18} aria-hidden="true" />
      {count > 0 ? (
        <span className="notice-bell__badge" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
