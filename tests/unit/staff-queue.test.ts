import { describe, expect, it } from "vitest";
import { buildNeedsYou, needsYouCount, QUEUE_KIND_LABEL } from "@/lib/staff-queue";
import type { PaymentAlertSummary } from "@/lib/payment-alerts";
import type { Inquiry } from "@/lib/api-client/crm";
import type { FamilyRequest } from "@/lib/api-client/family";
import type { Document } from "@/lib/api-client/documents";
import type { AdminOrder } from "@/lib/api-client/order-store";
import type { WorkOrder } from "@/lib/work-orders";
import type { WorkOrderList } from "@/lib/api-client/work-orders";

const inquiry = (over: Partial<Inquiry> = {}): Inquiry => ({
  id: "inq-1",
  reference: "INQ-2026-0001",
  person: { full_name: "Liza Mendoza", email: "liza@example.test", phone: "+63 900 000 0000" },
  source: "messenger",
  topic: "Garden niche",
  message: "How much is a garden niche?",
  assigned_to: "Sales",
  status: "new",
  received_at: "2026-10-02T00:00:00Z",
  ...over,
});

const order = (status: AdminOrder["lifecycle_status"]): AdminOrder =>
  ({
    order: {
      number: "ORD-2026-00031",
      status: "paid",
      customer_name: "Marites Santos",
      total_cents: 6_352_000,
      currency: "PHP",
      items: [{ catalog_item_id: 1, item_type: "package", sku: "PKG-PREMIUM", name: "Premium", quantity: 1, unit_price_cents: 1 }],
      placed_at: "2026-10-01T00:00:00Z",
      event_uuid: "e1",
    },
    customer: { name: "Marites Santos", email: "m@example.test", phone: "+63 900 000 0001" },
    lifecycle_status: status,
    timeline: [],
  }) as unknown as AdminOrder;

const workOrder = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: "WO-2026-0001",
  title: "Replace the front brake pads on Hearse 1",
  detail: "",
  asset: { kind: "vehicle", ref: "veh-1", label: "Hearse 1" },
  priority: "high",
  assignee: { name: "Crew", employee_number: null },
  opened_on: "2026-09-01",
  due_on: "2026-09-04",
  history: [{ state: "open", on: "2026-09-01" }],
  ...over,
});

const workOrders: WorkOrderList = { as_of: "2026-09-28", work_orders: [workOrder()] };

const alerts: PaymentAlertSummary = {
  overdue: [
    {
      id: "inv-1",
      reference: "INV-2026-0042",
      client: "Roberto Santos",
      amount_cents: 1_800_000,
      amount_label: "₱18,000",
      due_on: "2026-08-14",
      days_until_due: -47,
      state: "overdue",
      state_label: "Overdue",
      countdown: "overdue by 47 days",
    },
  ],
  due_soon: [
    {
      id: "inv-2",
      reference: "INV-2026-0050",
      client: "Danilo Reyes",
      amount_cents: 2_400_000,
      amount_label: "₱24,000",
      due_on: "2026-10-02",
      days_until_due: 0,
      state: "due_soon",
      state_label: "Due soon",
      countdown: "due today",
    },
  ],
  overdue_count: 1,
  due_soon_count: 1,
  total: 2,
  overdue_cents: 1_800_000,
  due_soon_cents: 2_400_000,
};

describe("buildNeedsYou", () => {
  const rows = buildNeedsYou({
    alerts,
    inquiries: [inquiry()],
    orders: [order("new"), order("fulfilled")],
    workOrders,
    servicesToday: [{ id: "burial-1", title: "Pedro Santos", detail: "CASE-2026-0001", href: "/staff/schedule" }],
  });

  it("types every row and names its screen", () => {
    for (const row of rows) {
      expect(QUEUE_KIND_LABEL[row.kind]).toBeTruthy();
    }
    expect(rows.find((row) => row.kind === "payment")?.href).toBe("/staff/billing");
    expect(rows.find((row) => row.kind === "task")?.href).toBe("/staff/work-orders");
    expect(rows.find((row) => row.kind === "service")?.href).toBe("/staff/schedule");
  });

  it("ranks overdue money and overdue work above a new order", () => {
    const rankOf = (kind: string) => rows.find((row) => row.kind === kind)!.rank;
    expect(rankOf("payment")).toBeLessThan(rankOf("inquiry"));
    expect(rankOf("task")).toBeLessThan(rankOf("order"));
  });

  it("carries the family's own requests and documents still in review", () => {
    const request: FamilyRequest = {
      id: "req-1",
      title: "Cut the grass around your lot",
      detail: "The grass along the path has grown over the marker.",
      asked_on: "2026-09-12",
      state: "with_office",
      next: "The park team has it.",
      action_label: "Call for the latest",
    };
    const document: Document = {
      id: "doc-1",
      document_number: "DOC-2026-0001",
      title: "Service Agreement",
      document_type: "contract",
      related_case_number: "CASE-2026-0001",
      related_order_number: null,
      status: "pending_review",
      uploaded_by: "Ada",
      uploaded_at: "2026-09-20T00:00:00Z",
      file_size_bytes: 1000,
    };
    const extra = buildNeedsYou({ familyRequests: [request], documents: [document] });
    expect(extra.find((row) => row.kind === "family")?.title).toBe(request.title);
    expect(extra.find((row) => row.kind === "document")?.href).toBe("/staff/documents");
    // A finished request and an approved document never queue.
    expect(
      buildNeedsYou({
        familyRequests: [{ ...request, state: "done" }],
        documents: [{ ...document, status: "approved" }],
      }),
    ).toEqual([]);
  });

  it("drops a fulfilled order and keeps the open one", () => {
    const orderRows = rows.filter((row) => row.kind === "order");
    expect(orderRows).toHaveLength(1);
    expect(orderRows[0].detail).toContain("Marites Santos");
  });

  it("never invents an owner", () => {
    const ownerless = buildNeedsYou({ inquiries: [inquiry({ assigned_to: "" })] });
    expect(ownerless[0].owner).toBe("Not recorded");
  });

  it("is empty when nothing is handed in", () => {
    expect(buildNeedsYou({})).toEqual([]);
    expect(needsYouCount({})).toBe(0);
  });
});
