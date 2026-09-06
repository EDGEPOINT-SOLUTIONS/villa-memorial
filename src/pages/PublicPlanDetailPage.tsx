// Public plan detail — a single pre-need memorial plan with payment calculator,
// benefits, and add-to-cart. Reads the admin's shelf (Store) so price/name/copy
// edits reflect live.

import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useCart } from "../lib/cart";
import { money } from "../lib/catalog";
import { useToast } from "../components/toast";

const SELECT_CLASS =
  "w-full bg-surface-container-lowest border border-outline-variant rounded focus:ring-1 text-body-md font-body-md text-on-surface h-10 px-2";

const TERM_OPTIONS = [1, 3, 5, 10];

function sqmOf(features: string[]): string {
  const m = features.find((f) => /sqm/i.test(f));
  return m?.replace(/\s*Area\s*/i, "") ?? "—";
}

export function PublicPlanDetailPage() {
  const { slug = "" } = useParams();
  const { get } = useStore();
  const maybe = get(slug) ?? get(`plan-${slug}`);
  const { add } = useCart();
  const { toast } = useToast();
  const [term, setTerm] = useState("5");
  const [freq, setFreq] = useState("12");

  if (!maybe) return <Navigate to="/site/plans" replace />;
  const plan = maybe;
  const gold = plan.accent === "gold";
  const sqm = sqmOf(plan.features);

  const totalPayments = Number(term) * Number(freq);
  const installment = (plan.price ?? 0) * 0.9 / totalPayments;

  function addToCart() {
    add({
      id: plan.sku,
      name: plan.name,
      kindLabel: "Memorial plan",
      detail: `${sqm} sqm · pre-need`,
      image: plan.image,
      unit: plan.price,
    });
    toast(`${plan.name} added to your cart.`, "success");
  }

  return (
    <div className="text-on-background">
      <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-8">
          <Link className="hover:text-primary" to="/site/plans">
            PLANS
          </Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{plan.name.toUpperCase()}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">
          <div className="rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(51,51,51,0.08)]">
            <img className="w-full h-full object-cover aspect-[4/3]" src={plan.image} alt={plan.imageAlt ?? plan.name} />
          </div>

          <div className="lg:pl-4">
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-3">
              {plan.name}
            </h1>
            <p className="text-headline-md font-headline-md text-secondary font-semibold mb-6">
              {plan.price === null ? "On arrangement" : money(plan.price)} total value
            </p>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">
              Pre-need memorial plan covering a {sqm} area. Lock in today's price and
              protect your family from rising costs, with funds held in a trusted trust fund.
            </p>

            <ul className="space-y-3 mb-8">
              {plan.features.map((b) => (
                <li key={b} className="flex items-start gap-3 text-body-md font-body-md text-on-surface">
                  <span className={`material-symbols-outlined ${gold ? "text-secondary" : "text-primary"} mt-0.5`} aria-hidden="true">
                    check_circle
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            {/* Calculator */}
            <div className="bg-surface-container-low p-5 rounded-lg mb-6">
              <h3 className={`text-label-md font-label-md ${gold ? "text-secondary" : "text-primary"} mb-3`}>
                PAYMENT CALCULATOR
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label htmlFor="pd-term" className="text-label-md font-label-md text-on-surface-variant block mb-1">
                    Term
                  </label>
                  <select id="pd-term" className={SELECT_CLASS} value={term} onChange={(e) => setTerm(e.target.value)}>
                    {TERM_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y} {y === 1 ? "Year" : "Years"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pd-freq" className="text-label-md font-label-md text-on-surface-variant block mb-1">
                    Frequency
                  </label>
                  <select id="pd-freq" className={SELECT_CLASS} value={freq} onChange={(e) => setFreq(e.target.value)}>
                    <option value="12">Monthly</option>
                    <option value="4">Quarterly</option>
                    <option value="1">Annual</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-body-md font-body-md text-on-surface-variant">Estimated Installment:</span>
                <span className={`text-headline-sm font-headline-sm font-bold ${gold ? "text-secondary" : "text-primary"}`}>
                  {plan.price === null ? "—" : money(installment)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={addToCart}
                className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                ADD TO CART
              </button>
              <Link
                to="/site/plans/senior-benefits"
                className="border-2 border-primary text-primary hover:bg-primary-fixed px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center justify-center gap-2 hover:no-underline!"
              >
                View senior-citizen rates
              </Link>
            </div>
          </div>
        </div>

        {/* Cross-link: compare all plans */}
        <div className="mt-16 text-center bg-surface-container-low rounded-xl p-8">
          <p className="text-body-md font-body-md text-on-surface-variant mb-4">
            Not sure which plan fits? See how our plans compare.
          </p>
          <Link
            to="/site/plans/compare"
            className="inline-flex items-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-lg text-label-md font-label-md transition-colors hover:no-underline!"
          >
            Compare memorial plans
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
