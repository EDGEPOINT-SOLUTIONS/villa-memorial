// Cart page — public buy journey. Lists cart lines (priced + "price on
// arrangement"), qty steppers, totals, checkout CTA, empty state.

import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../lib/cart";
import { money } from "../lib/shop";

export function CartPage() {
  const { lines, setQty, remove, subtotal, hasQuoteLines, count } = useCart();
  const navigate = useNavigate();

  if (lines.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-20 text-center">
        <span className="material-symbols-outlined text-primary text-[56px] mb-4" aria-hidden="true">
          shopping_cart
        </span>
        <h1 className="text-headline-md font-headline-md text-primary mb-3">Your cart is empty</h1>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-md mx-auto mb-8">
          Explore memorial plans, lots, packages, or products to begin planning with peace of mind.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/site/plans"
            className="bg-secondary text-on-secondary hover:bg-secondary-fixed-dim hover:text-on-secondary-fixed px-6 py-3 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center hover:no-underline!"
          >
            Browse memorial plans
          </Link>
          <Link
            to="/site/products"
            className="border-2 border-primary text-primary hover:bg-primary-fixed px-6 py-3 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center hover:no-underline!"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
      <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-6">
        <Link className="hover:text-primary" to="/">
          HOME
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">CART</span>
      </nav>
      <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-2">
        Your Cart
      </h1>
      <p className="text-body-md font-body-md text-on-surface-variant mb-10">
        {count} item{count === 1 ? "" : "s"} · review before checkout.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Lines */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {lines.map((l) => (
            <div
              key={l.id}
              className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant flex items-center gap-5"
            >
              {l.image ? (
                <img src={l.image} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {l.kindLabel === "Memorial plan"
                      ? "description"
                      : l.kindLabel === "Lot"
                        ? "park"
                        : "package_2"}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-1">
                  {l.kindLabel ?? "Item"}
                </p>
                <h3 className="text-headline-sm font-headline-sm text-on-surface truncate">{l.name}</h3>
                {l.detail ? (
                  <p className="text-body-md font-body-md text-on-surface-variant truncate">{l.detail}</p>
                ) : null}
                <div className="flex items-center gap-4 mt-3">
                  <div className="inline-flex items-center border border-outline-variant rounded-lg overflow-hidden">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${l.name}`}
                      onClick={() => setQty(l.id, l.qty - 1)}
                      className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <span className="px-3 py-2 text-body-md font-body-md min-w-[3ch] text-center">{l.qty}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${l.name}`}
                      onClick={() => setQty(l.id, l.qty + 1)}
                      className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.id)}
                    className="text-on-surface-variant hover:text-error text-label-md font-label-md uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-headline-sm font-headline-sm text-secondary font-semibold">
                  {l.unit === null ? "On arrangement" : money(l.unit * l.qty)}
                </p>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <Link
              to="/site/plans"
              className="text-primary text-label-md font-label-md uppercase tracking-wider hover:no-underline!"
            >
              ← Continue browsing
            </Link>
          </div>
        </div>

        {/* Summary */}
        <aside className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant lg:sticky lg:top-[96px]">
          <h2 className="text-headline-sm font-headline-sm text-primary mb-6">Order Summary</h2>
          <dl className="space-y-3 text-body-md font-body-md">
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Items</dt>
              <dd className="text-on-surface">{count}</dd>
            </div>
            {hasQuoteLines ? (
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Price on arrangement</dt>
                <dd className="text-on-surface-variant">Confirmed by our team</dd>
              </div>
            ) : null}
            <div className="flex justify-between pt-4 border-t border-outline-variant">
              <dt className="text-on-surface font-semibold">Estimated total</dt>
              <dd className="text-headline-sm font-headline-sm text-secondary font-bold">
                {money(subtotal)}
              </dd>
            </div>
          </dl>
          {hasQuoteLines ? (
            <p className="mt-4 text-xs text-on-surface-variant leading-relaxed">
              Some items have no listed price — our care team will confirm final pricing when they
              contact you.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="mt-6 w-full bg-[#D4AF37] hover:bg-[#c29f32] text-white px-6 py-4 rounded-lg text-label-md font-label-md transition-colors duration-200 min-h-[52px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">lock</span>
            PROCEED TO CHECKOUT
          </button>
        </aside>
      </div>
    </div>
  );
}
