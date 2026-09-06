// Order confirmation / receipt — shown after checkout. Reads the just-placed
// PlacedOrder from cart context by reference. Demo only (no backend); if the
// reference isn't found (e.g. after a refresh), show a friendly empty state.

import { Link, useParams } from "react-router-dom";
import { useCart } from "../lib/cart";
import { money } from "../lib/shop";

export function OrderPage() {
  const { reference = "" } = useParams();
  const { placed } = useCart();
  const order = placed.find((p) => p.reference === reference);

  if (!order) {
    return (
      <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-20 text-center">
        <h1 className="text-headline-md font-headline-md text-primary mb-3">Order not found</h1>
        <p className="text-body-md font-body-md text-on-surface-variant mb-8">
          This is a front-end demo — placed orders live only for the current session.
        </p>
        <Link
          to="/site/plans"
          className="bg-secondary text-on-secondary px-6 py-3 rounded-lg text-label-md font-label-md transition-colors hover:no-underline!"
        >
          Browse memorial plans
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-margin-mobile md:px-margin-desktop py-16">
      {/* Success header */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined" style={{ fontSize: 44 }}>
            check
          </span>
        </div>
        <h1 className="text-headline-md font-headline-md text-primary mb-2">
          Request received — thank you
        </h1>
        <p className="text-body-md font-body-md text-on-surface-variant">
          Reference <span className="font-semibold text-on-surface">{order.reference}</span> ·{" "}
          {order.date}
        </p>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-lg mx-auto mt-3">
          Our care team will contact <span className="font-semibold text-on-surface">{order.name}</span>{" "}
          shortly to confirm the details below.
        </p>
      </div>

      {/* Receipt */}
      <div className="bg-surface-container-lowest rounded-xl p-8 md:p-10 shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant">
        <div className="flex items-center justify-between border-b border-outline-variant pb-5 mb-6">
          <div>
            <p className="text-label-md font-label-md text-primary uppercase tracking-wider mb-1">Villa Memorial</p>
            <p className="text-body-md font-body-md text-on-surface-variant">Planning request</p>
          </div>
          <span className="bg-primary-fixed text-on-primary-fixed text-label-md font-label-md px-4 py-2 rounded-full">
            {order.status}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {order.lines.map((l) => (
            <div key={l.id} className="flex items-center gap-4 text-body-md font-body-md">
              {l.image ? (
                <img src={l.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }} aria-hidden="true">
                    {l.kindLabel === "Memorial plan" ? "description" : l.kindLabel === "Memorial lot" ? "park" : "package_2"}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-on-surface">{l.name}</p>
                {l.kindLabel ? (
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">{l.kindLabel}</p>
                ) : null}
                {l.detail ? (
                  <p className="text-xs text-on-surface-variant truncate">{l.detail}</p>
                ) : null}
                {l.qty > 1 ? <p className="text-xs text-on-surface-variant">Qty {l.qty}</p> : null}
              </div>
              <div className="text-right shrink-0">
                {l.unit !== null && l.qty > 1 ? (
                  <p className="text-xs text-on-surface-variant">{money(l.unit)} each</p>
                ) : null}
                <p className="text-secondary font-semibold">
                  {l.unit === null ? "On arrangement" : money(l.unit * l.qty)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant mt-6 pt-6">
          <span className="text-body-lg font-body-lg text-on-surface font-semibold">Estimated total</span>
          <span className="text-headline-sm font-headline-sm text-secondary font-bold">{money(order.total)}</span>
        </div>

        {order.lines.some((l) => l.unit === null) ? (
          <p className="mt-4 text-xs text-on-surface-variant leading-relaxed">
            Some items have no listed price — final pricing is confirmed by our care team.
          </p>
        ) : null}

        <div className="mt-8 bg-surface-container-low rounded-lg p-4 text-xs text-on-surface-variant leading-relaxed">
          <span className="font-semibold text-on-surface">Demo notice:</span> this is a front-end
          prototype. No payment was collected and no order was created in a real system. In the
          live platform this request would be routed to the staff Orders queue.
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-10">
        <Link
          to="/"
          className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-6 py-3 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center hover:no-underline!"
        >
          Return home
        </Link>
        <Link
          to="/site/products"
          className="border-2 border-primary text-primary hover:bg-primary-fixed px-6 py-3 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center hover:no-underline!"
        >
          Continue browsing
        </Link>
      </div>
    </div>
  );
}
