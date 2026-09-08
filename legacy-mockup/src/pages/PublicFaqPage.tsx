// Public FAQ — accordion of common questions. Pure static content (demo).

import { useState } from "react";
import { Link } from "react-router-dom";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I start planning a pre-need memorial plan?",
    a: "Browse our memorial plans, compare them side by side, and add the one that fits to your cart. From checkout, our care team will contact you to set up the plan and payment terms.",
  },
  {
    q: "Can I reserve a memorial lot online?",
    a: "Yes. Use the interactive park map or the lots catalog to choose a lot and add it to your cart. Your selection is held while our team confirms availability and guides you through the reservation.",
  },
  {
    q: "What happens in an emergency or at-need situation?",
    a: "For an immediate need, visit our At-Need services page or call our 24/7 assistance line. A coordinator will guide you from the first call through the entire arrangement.",
  },
  {
    q: "Do you offer installment payments?",
    a: "Yes. Most pre-need plans are available on installments with a 10% down payment. Use the payment calculator on each plan to estimate your monthly payments.",
  },
  {
    q: "Are the funds for pre-need plans protected?",
    a: "Yes — all pre-need funds are held in a trusted trust fund, guaranteeing the delivery of services when the time comes.",
  },
  {
    q: "Can I choose a package and customise it?",
    a: "Absolutely. Wake and funeral packages are a starting point — our care team can tailor the arrangement, casket, flowers, and transport to your wishes and budget.",
  },
  {
    q: "How do I pay or check my balance as a family member?",
    a: "Sign in to the family portal with your account to view your plans, payments, property, and documents. The demo account is shown on the sign-in page.",
  },
];

export function PublicFaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="text-on-background">
      <section className="py-14 md:py-20 max-w-[820px] mx-auto px-margin-mobile md:px-margin-desktop">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-4 text-center">
          Frequently Asked Questions
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant text-center mb-12">
          Quick answers about planning, lots, packages, and payments. Can't find yours?
          <Link to="/site/contact" className="text-primary hover:underline"> Contact us</Link>.
        </p>

        <div className="flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                >
                  <span className="text-headline-sm font-headline-sm text-on-surface">{f.q}</span>
                  <span className={`material-symbols-outlined text-primary shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
                    expand_more
                  </span>
                </button>
                {isOpen ? (
                  <div className="px-6 pb-6">
                    <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">{f.a}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
