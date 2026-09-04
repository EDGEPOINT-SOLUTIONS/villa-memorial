// ============================================================================
// CooPlansPage — pixel port of the COO's static mockup
//   stitch_villa_memorial_digital_platform/memorial_plans_balanced_hero_layout
// Serene Legacy tokens (bg-surface #fbf9f8, primary #00658d, secondary #735c00,
// secondary-container #fed65b). Tailwind utilities only + inline styles where
// the mockup relied on <style> rules that the app does not ship (e.g. the
// Material Symbols FILL variation via [data-weight="fill"]).
// Content-only: rendered inside CooPublicShell, which provides the global
// header, footer, chat bubble and mobile drawer for every public page.
// ============================================================================

import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../components/toast";
import { useCart } from "../lib/cart";

// --- Exact image URLs from the mockup (byte-for-byte) ------------------------
const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDMRYfmuoluWJpWf4fOjEqkuGX8lvFitRG_xYHJXmUhoyW77H2LLefvrt3CoMzytpDuOI8J_j9XF2Dj9mtg6Tpkqdy-zA3dlPMx_gJ0NrkeSpIi1qlTFKjVtpKiYlD0YH4IJiTqd8qp5_0Hff2gCQoVcfQ-wwaWyVFoOal0R2rcyy7DJ4KLIZYcqD0NNxnJXM7N2lvjIcCGMHDEf9wC6PHmvlkUm_C37E_WOWNZnn_2PR1DD-FL8pdYXuwArugDoVI1sA";

const FILL_ICON_VARS = '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24';

type Accent = "blue" | "gold";

type PlanSpec = {
  id: string;
  slug: string;
  name: string;
  sqm: string;
  total: number;
  totalLabel: string;
  imgSrc: string;
  imgAlt: string;
  years: number[];
  accent: Accent;
};

const PLANS: PlanSpec[] = [
  {
    id: "silver",
    slug: "garden-niches",
    name: "Garden Niches",
    sqm: "12.00",
    total: 629000,
    totalLabel: "₱629,000",
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDYlYkozT7TsBmBNMCvkEFMsEcoBVtGXaHo_YRo4H3hW0T3GyOjc45aaqxnfKwTIw0kEUXn9zSMnazYPnWYaBMXSjZl2GXUQWueFWh-upbdlCrYi2NyDWGI20QSaOzss3KcS6mnMsPck_Q-NEK99l1Tq0gZ9um-I7TWZQOf3fEpJcjX8vI9-dv-mzJPX7O74SwzBj6NA82Pc-I-BQq4bTLVnF2cRncLPFnmpiITymlOR_R7q_9ugjdh",
    imgAlt:
      "A serene, soft-focus image of a beautifully arranged modest funeral wake. White lilies and soft warm lighting create a peaceful, hopeful atmosphere. Modern minimalist styling with light airy colors, avoiding dark or somber tones.",
    years: [1, 3, 5],
    accent: "blue",
  },
  {
    id: "gold",
    slug: "mausoleum",
    name: "Mausoleum",
    sqm: "24.00",
    total: 1135000,
    totalLabel: "₱1,135,000",
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBl5wqOJTZQne-cConDockYJ4_K8rWofbTsaZctUkg4er6YXnzgxw_BHUZT_XDptxQfS1CyWmDnIKWCVB0gelrTSutEQ5Lu5HUleT9ch7C4uQKTUJp0RXNR4fCyp9bA2UVIsXCeGcl06gMTo6-hfwWksSNKCmhaBw1qhyaaPKpUxZ6fNY3MhuKOPfJchE2nW-0AammosIxRzSoKCkiEEr9IQ3hm359MpyFccsr0NoRx1ObbgqIRaJ-N",
    imgAlt:
      "A premium memorial chapel interior filled with abundant natural light. Golden hour sunshine streams through large windows onto elegant floral arrangements. The scene conveys profound peace, dignity, and luminous comfort, using a soft, airy color palette.",
    years: [1, 3, 5, 10],
    accent: "gold",
  },
  {
    id: "platinum",
    slug: "premium-lots",
    name: "Premium Lots",
    sqm: "2.50",
    total: 176000,
    totalLabel: "₱176,000",
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBS4a2wVjsf0nZMtB25iUMnB1KOv64pGG4YMaORbOzB_NilkFrlNdQGSV1_0mJtBcRFaO4lqr6qplrmJwzCX2DAD0rZU0doPnoQJYmmIGgEsmlzZp5DbS2Pihf8T-zLsVtoU9WygNMbWIlpJdJLOHtxMUTYfJFUAdyaYALWaoejxHzC37z9SZ7hzuHLT8JBQt7BSDaKpKzlVLeLeVpG8HdBr6m2bcsbEpDY1lJ7YFbbvhx2P-Pf2S7g",
    imgAlt:
      "An expansive, high-end memorial park landscape at sunrise. Mist gently rolling over manicured green lawns. A profound sense of legacy and eternal peace. The visual style is editorial, bright, and hopeful, avoiding gloomy cliches.",
    years: [1, 3, 5, 10],
    accent: "blue",
  },
];

const SELECT_CLASS =
  "w-full bg-surface-container-lowest border border-outline-variant rounded focus:ring-1 text-body-md font-body-md text-on-surface h-10 px-2";

const APPLY_CLASS =
  "w-full h-12 bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container text-label-md font-label-md rounded-lg transition-colors flex items-center justify-center";

const BODY_COPY_CLASS = "text-body-md font-body-md text-on-surface-variant";

/** ₱ + integer with thousands separators — the mockup's output format. */
function money(n: number): string {
  return "₱" + Math.round(n).toLocaleString("en-US");
}

function PlanCalculator({ spec, accentClass }: { spec: PlanSpec; accentClass: string }) {
  const [term, setTerm] = useState("5");
  const [freq, setFreq] = useState("12");
  const totalPayments = Number(term) * Number(freq);
  // COO mockup semantics: a 10% down payment means only 90% of the total is
  // financed. Defaults at 5-year Monthly must read ₱9,435 (Garden Niches),
  // ₱17,025 (Mausoleum), ₱2,640 (Premium Lots): total × 0.9 ÷ 60.
  const installment = (spec.total * 0.9) / totalPayments;
  const focusClass =
    spec.accent === "gold"
      ? "focus:border-secondary focus:ring-secondary"
      : "focus:border-primary-container focus:ring-primary-container";

  return (
    <div className="bg-surface-container-low p-4 rounded-lg mb-6">
      <h3 className={`text-label-md font-label-md ${accentClass} mb-3`}>PAYMENT CALCULATOR</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label
            htmlFor={`${spec.id}-term`}
            className={`text-label-md font-label-md text-on-surface-variant block mb-1`}
          >
            Term
          </label>
          <select
            id={`${spec.id}-term`}
            className={`${SELECT_CLASS} ${focusClass}`}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          >
            {spec.years.map((y) => (
              <option key={y} value={y}>
                {y} {y === 1 ? "Year" : "Years"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${spec.id}-freq`}
            className="text-label-md font-label-md text-on-surface-variant block mb-1"
          >
            Frequency
          </label>
          <select
            id={`${spec.id}-freq`}
            className={`${SELECT_CLASS} ${focusClass}`}
            value={freq}
            onChange={(e) => setFreq(e.target.value)}
          >
            <option value="12">Monthly</option>
            <option value="4">Quarterly</option>
            <option value="1">Annual</option>
          </select>
        </div>
      </div>
      <div className="flex justify-between items-baseline">
        <span className={BODY_COPY_CLASS}>Estimated Installment:</span>
        <span className="text-headline-sm font-headline-sm text-secondary font-bold">
          {money(installment)}
        </span>
      </div>
    </div>
  );
}

function PlanCard({ spec }: { spec: PlanSpec }) {
  const { toast } = useToast();
  const { add } = useCart();
  const gold = spec.accent === "gold";
  const accentClass = gold ? "text-secondary" : "text-primary";
  const cardClass = gold
    ? "bg-surface-container-lowest rounded-lg shadow-ambient hover:shadow-[0_20px_40px_-10px_rgba(51,51,51,0.08)] transition-all duration-300 border-2 border-secondary relative flex flex-col h-full overflow-hidden md:-translate-y-4"
    : "bg-surface-container-lowest rounded-lg shadow-ambient hover:shadow-[0_20px_40px_-10px_rgba(51,51,51,0.08)] transition-all duration-300 border border-transparent hover:border-primary-fixed-dim flex flex-col h-full overflow-hidden";
  const iconStyle = gold ? ({ fontVariationSettings: FILL_ICON_VARS } as const) : undefined;
  const applyClass = APPLY_CLASS + (gold ? " shadow-sm" : "");
  const addClass = gold
    ? "w-full h-12 border border-outline text-on-surface-variant hover:border-secondary hover:text-secondary text-label-md font-label-md rounded-lg transition-colors flex items-center justify-center gap-2"
    : "w-full h-12 border border-primary-container text-primary-container hover:bg-primary-container hover:text-on-primary text-label-md font-label-md rounded-lg transition-colors flex items-center justify-center gap-2";

  return (
    <article className={cardClass}>
      {gold && (
        <div className="absolute top-0 right-0 bg-secondary text-on-secondary text-label-md font-label-md px-4 py-1 rounded-bl-lg z-10">
          MOST POPULAR
        </div>
      )}
      <div className="h-48 w-full bg-surface-container-low relative overflow-hidden">
        <img
          className="object-cover w-full h-full opacity-90 mix-blend-multiply"
          src={spec.imgSrc}
          alt={spec.imgAlt}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent"></div>
        <div className="absolute bottom-4 left-6">
          <h2 className={`text-headline-md font-headline-md ${accentClass}`}>
            <Link to={`/site/plans/${spec.slug}`} className={`hover:no-underline! ${accentClass}`}>
              {spec.name}
            </Link>
          </h2>
          <p className={`${BODY_COPY_CLASS}`}>{spec.sqm} sqm</p>
        </div>      </div>
      <div className="p-6 flex-grow flex flex-col">
        <div className="mb-6 pb-6 border-b border-surface-variant">
          <span className={`${BODY_COPY_CLASS} block mb-1`}>Total Value</span>
          <span className="text-headline-sm font-headline-sm text-on-surface">
            {spec.totalLabel}
          </span>
        </div>
        <ul className="space-y-4 mb-8 flex-grow">
          {[`${spec.sqm} sqm Area`, "6 Years Amortization", "Includes Interment + VMP"].map(
            (b) => (
              <li key={b} className="flex items-start gap-3">
                <span className={`material-symbols-outlined ${accentClass} mt-0.5`} style={iconStyle}>
                  check_circle
                </span>
                <span className={BODY_COPY_CLASS}>{b}</span>
              </li>
            ),
          )}
        </ul>
        <PlanCalculator spec={spec} accentClass={accentClass} />
        <div className="flex flex-col gap-3 mt-auto">
          <button
            type="button"
            className={applyClass}
            onClick={() =>
              toast(`Application for ${spec.name} received. Our care team will reach out.`, "success")
            }
          >
            APPLY FOR THIS PLAN
          </button>
          <button
            type="button"
            className={addClass}
            onClick={() => {
              add({
                id: `plan-${spec.slug}`,
                name: spec.name,
                kindLabel: "Memorial plan",
                detail: `${spec.sqm} sqm · pre-need`,
                unit: spec.total,
              });
              toast(`${spec.name} added to your cart.`, "success");
            }}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              add_shopping_cart
            </span>
            ADD TO CART
          </button>
        </div>
      </div>
    </article>
  );
}

export function CooPlansPage() {
  return (
    <div className="text-on-surface">
      {/* Hero image */}
      <section className="relative w-full h-[400px] overflow-hidden">
        <img
          className="w-full h-full object-cover"
          alt="Sanctuario de Mercedes y Gloria Entrance"
          src={HERO_IMG}
        />
      </section>

      {/* Headline band */}
      <section className="bg-surface py-12 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-3xl mx-auto text-center text-on-surface">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg mb-6 text-primary">
            Prepare Today. Give Your Family Peace of Mind Tomorrow.
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Our pre-need memorial plans are thoughtfully designed to provide clarity and comfort.
            Lock in today's prices and ensure your final wishes are honored exactly as you
            envision, relieving your loved ones of difficult decisions during a time of grief.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-section-gap">
          {PLANS.map((spec) => (
            <PlanCard key={spec.id} spec={spec} />
          ))}
        </div>

        {/* Info section */}
        <section className="bg-[#c6e7ff]/20 rounded-xl p-8 md:p-12 text-center max-w-4xl mx-auto border border-primary-fixed-dim">
          <span className="material-symbols-outlined text-primary text-[40px] mb-4" aria-hidden="true">
            info
          </span>
          <h3 className="text-headline-sm font-headline-sm text-primary mb-3">Why Plan Ahead?</h3>
          <p className={`${BODY_COPY_CLASS} max-w-2xl mx-auto`}>
            Pre-need planning protects your family from rising funeral costs and the emotional
            burden of making complex decisions during a difficult time. All funds are secured in a
            trusted trust fund, guaranteeing the delivery of services when the time comes.
          </p>
          <div className="mt-6">
            <Link
              to="/site/plans/compare"
              className="inline-flex items-center gap-2 bg-secondary text-on-secondary hover:bg-secondary-fixed-dim hover:text-on-secondary-fixed px-6 py-3 rounded-lg text-label-md font-label-md transition-colors hover:no-underline!"
            >
              Compare plans side by side
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
