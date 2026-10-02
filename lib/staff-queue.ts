/**
 * "Needs you today" — the dashboard's cross-record work queue (PURE).
 *
 * The captain's 2026-10-02 brief: family requests, inquiries, orders, payment
 * notifications, and who is due. The product keeps those in five different
 * stores, so this module is the ONE place that ranks them into a single typed
 * list, so the dashboard never buries a due payment under a module's own screen.
 *
 * It is a READ: every row names a real record and the screen it opens. Nothing
 * is invented — a store that is not handed in contributes no rows, and a row
 * with no owner says "Not recorded" rather than guessing.
 */
import type { PaymentAlertSummary } from "@/lib/payment-alerts";
import type { Inquiry } from "@/lib/api-client/crm";
import type { FamilyRequest } from "@/lib/api-client/family";
import type { Document } from "@/lib/api-client/documents";
import { ORDER_LIFECYCLE_LABEL, type AdminOrder } from "@/lib/api-client/order-store";
import { workOrderList } from "@/lib/work-orders";
import type { WorkOrderList } from "@/lib/api-client/work-orders";

export type QueueKind = "payment" | "family" | "inquiry" | "order" | "document" | "task" | "service";

export const QUEUE_KIND_LABEL: Record<QueueKind, string> = {
  payment: "Payment",
  family: "Family request",
  inquiry: "Inquiry",
  order: "Order",
  document: "Document",
  task: "Task",
  service: "Service",
};

export type QueueTone = "danger" | "warning" | "info" | "neutral" | "success";

export const QUEUE_KIND_TONE: Record<QueueKind, QueueTone> = {
  payment: "danger",
  family: "warning",
  inquiry: "info",
  order: "neutral",
  document: "success",
  task: "info",
  service: "success",
};

export type QueueRow = {
  id: string;
  kind: QueueKind;
  /** The record's own name. */
  title: string;
  /** The reference and what it is. */
  detail: string;
  /** What the row is waiting on, in the office's words. */
  waiting: string;
  /** The role that carries the next step, or "Not recorded". */
  owner: string;
  href: string | null;
  tone: QueueTone;
  /** Lower is more urgent; the queue sorts on it, then on `title`. */
  rank: number;
};

export type NeedsYouInput = {
  alerts?: PaymentAlertSummary | null;
  inquiries?: readonly Inquiry[];
  orders?: readonly AdminOrder[];
  workOrders?: WorkOrderList | null;
  familyRequests?: readonly FamilyRequest[];
  documents?: readonly Document[];
  servicesToday?: ReadonlyArray<{ id: string; title: string; detail: string; href: string | null }>;
};

const OPEN_INQUIRY_STATES: ReadonlyArray<Inquiry["status"]> = ["new", "contacted", "qualified"];

/**
 * Rank the cross-record queue. Order is deliberate and stable:
 *   overdue money → overdue work → an unanswered family request → due-soon money
 *   → a new order → a contacted inquiry → an open task → today's services.
 */
export function buildNeedsYou(input: NeedsYouInput): QueueRow[] {
  const rows: QueueRow[] = [];

  for (const alert of input.alerts?.overdue ?? []) {
    rows.push({
      id: `alert-${alert.id}`,
      kind: "payment",
      title: alert.client,
      detail: `${alert.reference} · ${alert.amount_label}`,
      waiting: alert.countdown,
      owner: "Billing",
      href: "/staff/billing",
      tone: "danger",
      rank: 0,
    });
  }

  if (input.workOrders) {
    for (const view of workOrderList(input.workOrders.work_orders, input.workOrders.as_of)) {
      if (!view.overdue) continue;
      rows.push({
        id: `wo-${view.order.id}`,
        kind: "task",
        title: view.order.title,
        detail: view.order.asset.label,
        waiting: `overdue by ${view.days_overdue ?? 0} d`,
        owner: view.order.assignee.name,
        href: "/staff/work-orders",
        tone: "danger",
        rank: 1,
      });
    }
  }

  for (const inquiry of input.inquiries ?? []) {
    if (!OPEN_INQUIRY_STATES.includes(inquiry.status)) continue;
    rows.push({
      id: `inquiry-${inquiry.id}`,
      kind: "inquiry",
      title: inquiry.person.full_name,
      detail: inquiry.topic || inquiry.message.slice(0, 60),
      waiting: inquiry.status === "new" ? "new" : inquiry.status,
      owner: inquiry.assigned_to || "Not recorded",
      href: "/staff/inquiries",
      tone: inquiry.status === "new" ? "warning" : "info",
      rank: inquiry.status === "new" ? 2 : 6,
    });
  }

  // The family's own recorded requests (listFamilyRequests) — a request the office
  // has not finished is the office's to close. A finished request never queues.
  for (const request of input.familyRequests ?? []) {
    if (request.state === "done") continue;
    rows.push({
      id: `request-${request.id}`,
      kind: "family",
      title: request.title,
      detail: request.detail,
      waiting: request.state === "waiting_on_you" ? "waiting on you" : "with the office",
      owner: request.state === "waiting_on_you" ? "Family" : "Office",
      href: "/staff/customers",
      tone: request.state === "waiting_on_you" ? "warning" : "info",
      rank: 2,
    });
  }

  // A document still in review is a filing the office must clear; an approved or
  // uploaded one is not a queue item.
  for (const document of input.documents ?? []) {
    if (document.status !== "pending_review") continue;
    rows.push({
      id: `document-${document.id}`,
      kind: "document",
      title: document.document_number,
      detail: document.title,
      waiting: "pending review",
      owner: document.uploaded_by || "Documents",
      href: "/staff/documents",
      tone: "success",
      rank: 5,
    });
  }

  for (const alert of input.alerts?.due_soon ?? []) {
    rows.push({
      id: `alert-${alert.id}`,
      kind: "payment",
      title: alert.client,
      detail: `${alert.reference} · ${alert.amount_label}`,
      waiting: alert.countdown,
      owner: "Billing",
      href: "/staff/billing",
      tone: "warning",
      rank: 3,
    });
  }

  for (const order of input.orders ?? []) {
    if (order.lifecycle_status !== "new" && order.lifecycle_status !== "confirmed") continue;
    rows.push({
      id: `order-${order.order.number}`,
      kind: "order",
      title: order.order.number,
      detail: `${order.customer.name} · ${order.order.items.length} line${order.order.items.length === 1 ? "" : "s"}`,
      waiting: ORDER_LIFECYCLE_LABEL[order.lifecycle_status],
      owner: "Store",
      href: `/staff/orders/${encodeURIComponent(order.order.number)}`,
      tone: "neutral",
      rank: order.lifecycle_status === "new" ? 4 : 7,
    });
  }

  if (input.workOrders) {
    for (const view of workOrderList(input.workOrders.work_orders, input.workOrders.as_of)) {
      if (view.state === "done" || view.overdue || !view.order.due_on) continue;
      rows.push({
        id: `wo-${view.order.id}`,
        kind: "task",
        title: view.order.title,
        detail: view.order.asset.label,
        waiting: `due ${view.order.due_on}`,
        owner: view.order.assignee.name,
        href: "/staff/work-orders",
        tone: "info",
        rank: 8,
      });
    }
  }

  for (const service of input.servicesToday ?? []) {
    rows.push({
      id: service.id,
      kind: "service",
      title: service.title,
      detail: service.detail,
      waiting: "today",
      owner: "Coordinator",
      href: service.href,
      tone: "success",
      rank: 9,
    });
  }

  return rows.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.title.localeCompare(b.title)));
}

/** How many rows the header counts, without rendering the list. */
export function needsYouCount(input: NeedsYouInput): number {
  return buildNeedsYou(input).length;
}
