"use client";

import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderResponse } from "@/lib/api-client/commerce";

const STATUS_TONE: Record<OrderResponse["status"], "success" | "warning" | "danger"> = {
  paid: "success",
  pending: "warning",
  cancelled: "danger",
};

const STATUS_HELP: Record<OrderResponse["status"], string> = {
  paid: "Payment received in full. Thank you.",
  pending: "We're waiting for payment to complete.",
  cancelled: "This order was cancelled. Contact us if this looks wrong.",
};

export default function OrderStatusPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = use(params);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetch(`/api/orders/${encodeURIComponent(number)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const payload = (await res.json()) as OrderResponse;
        if (alive) {
          setOrder(payload);
          setState("ready");
        }
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [number]);

  return (
    <>
      <PageHeader
        eyebrow="Order status"
        title={
          <>
            Order <code>{decodeURIComponent(number)}</code>
          </>
        }
        lead="What the store recorded for this order — its status, lines and total."
      />

      <div className="page-section" style={{ maxWidth: "42rem" }}>
        {state === "loading" ? <Skeleton lines={5} /> : null}

        {state === "error" ? (
          <EmptyState
            title="Order not found"
            hint="Check the order number on your receipt. Orders from earlier demo sessions are not kept."
          />
        ) : null}

        {state === "ready" && order ? (
          <>
            <div className="mb-4">
              <Badge tone={STATUS_TONE[order.status]}>{order.status.toUpperCase()}</Badge>{" "}
              <span className="text-sm text-muted">{STATUS_HELP[order.status]}</span>
            </div>

            <Card
              header={<h2 className="text-lg">Summary</h2>}
              footer={
                order.placed_at
                  ? `Placed ${new Date(order.placed_at).toLocaleString()}`
                  : null
              }
            >
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col" className="table__numeric">Qty</th>
                      <th scope="col" className="table__numeric">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.sku}>
                        <td>
                          <strong>{it.name}</strong> <code>{it.sku}</code>
                        </td>
                        <td className="table__numeric">{it.quantity}</td>
                        <td className="table__numeric">
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: order.currency,
                          }).format(it.unit_price_cents / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row mt-4" style={{ justifyContent: "space-between" }}>
                <span className="text-muted">Total (confirmed by store)</span>
                <strong style={{ fontSize: "var(--text-lg)" }}>
                  {new Intl.NumberFormat("en-PH", {
                    style: "currency",
                    currency: order.currency,
                  }).format(order.total_cents / 100)}
                </strong>
              </div>
            </Card>

            <p className="text-sm text-muted mt-4">
              For {order.customer_name}. Keep your order number &mdash; it&rsquo;s your receipt key.
            </p>
          </>
        ) : null}
      </div>
    </>
  );
}
