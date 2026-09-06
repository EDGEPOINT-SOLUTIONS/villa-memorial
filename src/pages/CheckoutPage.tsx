// Checkout — connected public demo flow. Steps: 1) details, 2) review + terms,
// 3) confirmed. No real payment: placing an order records a demo PlacedOrder
// (visible in the staff Orders list) and clears the cart.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart, nextReference } from "../lib/cart";
import { money } from "../lib/shop";
import { useToast } from "../components/toast";
import { ORDERS } from "../lib/data";

const DOWN_PCT = 0.1; // mirrors the COO plans calculator: 10% down, finance 90%

export function CheckoutPage() {
  const { lines, subtotal, hasQuoteLines, count, clear, place, placed } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [registrant, setRegistrant] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [terms, setTerms] = useState<"full" | "installments">("installments");
  const [years, setYears] = useState("5");
  const [placing, setPlacing] = useState(false);

  if (lines.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-20 text-center">
        <h1 className="text-headline-md font-headline-md text-primary mb-3">Nothing to check out</h1>
        <p className="text-body-md font-body-md text-on-surface-variant mb-8">Your cart is empty.</p>
        <Link
          to="/site/plans"
          className="bg-secondary text-on-secondary px-6 py-3 rounded-lg text-label-md font-label-md transition-colors hover:no-underline!"
        >
          Browse memorial plans
        </Link>
      </div>
    );
  }

  const totalPayments = Number(years) * 12;
  const financed = subtotal * (1 - DOWN_PCT);
  const installment = financed / totalPayments;
  const validStep1 = registrant.trim() !== "" && contact.trim() !== "" && phone.trim() !== "";

  function submitStep1(e: FormEvent) {
    e.preventDefault();
    if (!validStep1) {
      toast("Please complete all contact details before continuing.", "danger");
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  }

  function confirmOrder() {
    if (placing) return;
    setPlacing(true);
    const reference = nextReference([...ORDERS.map((o) => o.id), ...placed.map((p) => p.reference)]);
    const snapshot = lines.map((l) => ({
      id: l.id,
      name: l.name,
      kindLabel: l.kindLabel,
      detail: l.detail,
      image: l.image,
      unit: l.unit,
      qty: l.qty,
    }));
    const today = new Date().toISOString().slice(0, 10);
    // Simulate a short processing beat so the confirmation feels real.
    setTimeout(() => {
      place({
        reference,
        name: registrant.trim(),
        lineCount: count,
        total: subtotal,
        status: "Confirmed",
        date: today,
        lines: snapshot,
      });
      clear();
      navigate(`/order/${reference}`);
    }, 900);
  }

  // ---- Stepper chrome --------------------------------------------------------
  const steps = ["Your details", "Review & terms"];

  return (
    <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
      <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-6">
        <Link className="hover:text-primary" to="/cart">
          CART
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">CHECKOUT</span>
      </nav>
      <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-10">
        Checkout
      </h1>

      {/* Stepper */}
      <ol className="flex items-center gap-2 mb-10 overflow-x-auto">
        {steps.map((s, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={s} className="flex items-center gap-2 shrink-0">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-label-md font-label-md ${
                  done
                    ? "bg-emerald-100 text-emerald-700"
                    : active
                      ? "bg-secondary text-on-secondary"
                      : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {done ? <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span> : n}
              </span>
              <span
                className={`text-label-md font-label-md ${active || done ? "text-on-surface" : "text-on-surface-variant"}`}
              >
                {s}
              </span>
              {i < steps.length - 1 ? <span className="mx-1 text-on-surface-variant">—</span> : null}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        <div className="lg:col-span-2">
          {step === 1 ? (
            <form onSubmit={submitStep1} className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant space-y-5">
              <h2 className="text-headline-sm font-headline-sm text-primary mb-4">Your details</h2>
              <div>
                <label htmlFor="registrant" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                  Registrant / family name
                </label>
                <input
                  id="registrant"
                  type="text"
                  value={registrant}
                  onChange={(e) => setRegistrant(e.target.value)}
                  placeholder="e.g. Maria Dela Cruz"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                />
              </div>
              <div>
                <label htmlFor="contact" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                  Email address
                </label>
                <input
                  id="contact"
                  type="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 917 000 0000"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                />
              </div>
              <div>
                <label htmlFor="note" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                  Notes for our care team (optional)
                </label>
                <textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything we should know to help arrange this."
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-secondary text-on-secondary hover:bg-secondary-fixed-dim hover:text-on-secondary-fixed px-6 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[52px] cursor-pointer"
              >
                CONTINUE TO REVIEW
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-headline-sm font-headline-sm text-primary">Review items</h2>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-primary text-label-md font-label-md uppercase tracking-wider cursor-pointer"
                  >
                    Edit details
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {lines.map((l) => (
                    <div key={l.id} className="flex items-center gap-4 text-body-md font-body-md">
                      {l.image ? (
                        <img src={l.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">
                            {l.kindLabel === "Memorial plan" ? "description" : l.kindLabel === "Memorial lot" ? "park" : "package_2"}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-on-surface">{l.name}</p>
                        {l.kindLabel ? (
                          <p className="text-xs text-on-surface-variant uppercase tracking-wider">{l.kindLabel}</p>
                        ) : null}
                        {l.qty > 1 ? <p className="text-xs text-on-surface-variant">Qty {l.qty}</p> : null}
                      </div>
                      <span className="text-secondary font-semibold shrink-0">
                        {l.unit === null ? "On arrangement" : l.qty > 1 ? `${money(l.unit * l.qty)}` : money(l.unit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment terms */}
              <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant">
                <h2 className="text-headline-sm font-headline-sm text-primary mb-4">Payment terms</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <label
                    className={`border rounded-xl p-5 cursor-pointer transition-colors ${
                      terms === "installments"
                        ? "border-secondary bg-secondary-fixed/30"
                        : "border-outline-variant hover:border-primary-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="terms"
                      className="sr-only"
                      checked={terms === "installments"}
                      onChange={() => setTerms("installments")}
                    />
                    <span className="block text-label-md font-label-md text-on-surface mb-1">
                      Installments (recommended)
                    </span>
                    <span className="text-body-md font-body-md text-on-surface-variant">
                      10% down, balance over {years} years
                    </span>
                  </label>
                  <label
                    className={`border rounded-xl p-5 cursor-pointer transition-colors ${
                      terms === "full"
                        ? "border-secondary bg-secondary-fixed/30"
                        : "border-outline-variant hover:border-primary-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="terms"
                      className="sr-only"
                      checked={terms === "full"}
                      onChange={() => setTerms("full")}
                    />
                    <span className="block text-label-md font-label-md text-on-surface mb-1">
                      Pay in full
                    </span>
                    <span className="text-body-md font-body-md text-on-surface-variant">
                      One-time payment
                    </span>
                  </label>
                </div>

                {terms === "installments" && subtotal > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label htmlFor="years" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                        Term (years)
                      </label>
                      <select
                        id="years"
                        value={years}
                        onChange={(e) => setYears(e.target.value)}
                        className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none bg-surface"
                      >
                        <option value="1">1 year</option>
                        <option value="3">3 years</option>
                        <option value="5">5 years</option>
                        <option value="10">10 years</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end gap-1">
                      <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">
                        Estimated monthly
                      </span>
                      <span className="text-headline-sm font-headline-sm text-secondary font-bold">
                        {money(installment)}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        Down payment of {money(subtotal * DOWN_PCT)} due on confirmation.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                disabled={placing}
                onClick={confirmOrder}
                className="w-full bg-[#D4AF37] hover:bg-[#c29f32] disabled:opacity-60 text-white px-6 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[52px] flex items-center justify-center gap-2 cursor-pointer"
              >
                {placing ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    CONFIRM REQUEST
                  </>
                )}
              </button>
              <p className="text-center text-xs text-on-surface-variant">
                Demo only — no payment is collected. Final pricing and terms are confirmed by our care team.
              </p>
            </div>
          )}
        </div>

        {/* Summary rail */}
        <aside className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant lg:sticky lg:top-[96px]">
          <h2 className="text-headline-sm font-headline-sm text-primary mb-6">Summary</h2>
          <dl className="space-y-3 text-body-md font-body-md">
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Items</dt>
              <dd className="text-on-surface">{count}</dd>
            </div>
            {hasQuoteLines ? (
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Price on arrangement</dt>
                <dd className="text-on-surface-variant">—</dd>
              </div>
            ) : null}
            <div className="flex justify-between pt-4 border-t border-outline-variant">
              <dt className="text-on-surface font-semibold">Estimated total</dt>
              <dd className="text-headline-sm font-headline-sm text-secondary font-bold">
                {money(subtotal)}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
