/**
 * Demo notices for the notification bell (villa-memorial parity).
 *
 * ⚠ DEMO ONLY: the real notification service (scaffold) has no outward contract
 * yet, so these are display fixtures for the bell + its unread count. The bell
 * links to the notifications page, which honestly says it is not wired yet.
 */
export type DemoNotice = {
  id: string;
  title: string;
  detail: string;
  channel: string;
  time: string;
  unread: boolean;
};

export const STAFF_NOTICES: DemoNotice[] = [
  {
    id: "sn-1",
    title: "New web order placed",
    detail: "ORD-5021 from the public site is awaiting confirmation.",
    channel: "Commerce",
    time: "2h",
    unread: true,
  },
  {
    id: "sn-2",
    title: "Case ready for intake",
    detail: "CS-1042 needs the deceased's details completed.",
    channel: "Operations",
    time: "4h",
    unread: true,
  },
  {
    id: "sn-3",
    title: "Payment received",
    detail: "INV-7698 installment of ₱3,600 was collected.",
    channel: "Finance",
    time: "1d",
    unread: true,
  },
  {
    id: "sn-4",
    title: "Lot reserved",
    detail: "A-003 placed on hold for a reservation.",
    channel: "Property",
    time: "2d",
    unread: false,
  },
];

export const FAMILY_NOTICES: DemoNotice[] = [
  {
    id: "fn-1",
    title: "Receipt ready",
    detail: "Your official receipt is ready to view.",
    channel: "Documents",
    time: "3h",
    unread: true,
  },
  {
    id: "fn-2",
    title: "Arrangement update",
    detail: "Your coordinator updated the schedule.",
    channel: "Arrangements",
    time: "1d",
    unread: true,
  },
  {
    id: "fn-3",
    title: "Reminder",
    detail: "Next installment is due this month.",
    channel: "Payments",
    time: "3d",
    unread: false,
  },
];

export function unreadCount(notices: DemoNotice[]): number {
  return notices.filter((n) => n.unread).length;
}
