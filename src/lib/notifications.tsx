// ============================================================================
// notifications.tsx — shared in-memory notification state so portal headers can
// show a live unread badge. Seeded per portal from the demo data files; the
// bell routes to that portal's Notifications page. Frontend-only.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Notice = {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
  /** Optional grouping label (e.g. the module a notice came from). */
  meta?: string;
};

type NotificationsState = {
  items: Notice[];
  unread: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({
  seed,
  children,
}: {
  seed: Notice[];
  children: ReactNode;
}) {
  const [items, setItems] = useState<Notice[]>(seed);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }, []);

  const unread = useMemo(() => items.filter((n) => n.unread).length, [items]);

  const value = useMemo(
    () => ({ items, unread, markAllRead, markRead }),
    [items, unread, markAllRead, markRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

/** Map seed arrays to the shared Notice shape. */
export function toNotices<T extends { id: string; unread: boolean; title: string }>(
  rows: T[],
  detail: (t: T) => string,
  time: (t: T) => string,
  meta?: (t: T) => string | undefined,
): Notice[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    detail: detail(r),
    time: time(r),
    unread: r.unread,
    meta: meta ? meta(r) : undefined,
  }));
}
