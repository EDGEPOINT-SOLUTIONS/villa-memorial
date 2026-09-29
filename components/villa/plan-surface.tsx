import { Fragment, type ReactNode } from "react";
import {
  Car,
  ChevronDown,
  Church,
  Flower,
  Flower2,
  Heart,
  Layers,
  Landmark,
  Mail,
  Map,
  Package,
  Repeat,
  Sparkles,
  Tent,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PlanInclusion } from "@/lib/plan-content";

/**
 * The plan surface's small shared shapes (`villa-plans-redesign-plan`, captain
 * 2026-09-30). Everything here renders the product's own grammar —
 *
 *   · `PlanBandHead` — the home's centred `.home-band-head` (kicker · title ·
 *     one-line lead), the same head the /services lane renders as
 *     `.sv-band__head`. The plans lane owns its own class names.
 *   · `PlanOrient` — the three facts a reader needs before the tiers are useful.
 *   · `PlanComparisonMatrix` — the grouped, per-cell comparison (a fixed-width
 *     table so all five tier columns stay equal).
 *   · `PlanInclusions` — the items EVERY tier includes, printed once, each with
 *     its own icon.
 *   · `PlanAddons` — the three adjacent surfaces (services · park · chapel).
 *   · `PlanFaq` — the questions a family asks, as a native `<details>`
 *     accordion (no client state).
 *
 * No figure is authored here: every amount is passed in, read from the pricing
 * store by the page. The icons are the product's line set (lucide); the
 * typography and palette live in the `public: plans block` of components.css.
 */

/* ------------------------------- band head ------------------------------- */

export function PlanBandHead({
  id,
  kicker,
  title,
  lead,
}: {
  id: string;
  kicker: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="plan-section__head">
      <p className="plan-section__kicker">{kicker}</p>
      <h2 id={id} className="plan-section__title">
        {title}
      </h2>
      {lead ? <p className="plan-section__lead">{lead}</p> : null}
    </div>
  );
}

/* --------------------------------- orient -------------------------------- */

const ORIENT_FACTS: ReadonlyArray<{ icon: LucideIcon; label: string; text: string }> = [
  { icon: Layers, label: "Five tiers", text: "Bronze 1 to Gold" },
  { icon: Repeat, label: "Four ways to pay", text: "Same annual total" },
  { icon: Users, label: "Ages 1–100", text: "Regular and senior rates" },
];

export function PlanOrient() {
  return (
    <ul className="plan-orient" aria-label="How the plan works">
      {ORIENT_FACTS.map(({ icon: Icon, label, text }) => (
        <li key={label}>
          <span className="plan-orient__icon" aria-hidden="true">
            <Icon size={20} />
          </span>
          <div className="plan-orient__label">{label}</div>
          <div className="plan-orient__text">{text}</div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------- matrix --------------------------------- */

export type PlanMatrixRow = {
  key: string;
  label: string;
  /** The unit under the row label ("/ month"), when the row is a rate. */
  unit?: string;
  /** One cell per tier, in tier order. */
  cells: ReadonlyArray<ReactNode>;
  /** The headline row (the regular monthly figure) gets the gold marker. */
  highlight?: boolean;
};

export type PlanMatrixGroup = { title: string; rows: ReadonlyArray<PlanMatrixRow> };

export function PlanComparisonMatrix({
  tierNames,
  groups,
}: {
  tierNames: ReadonlyArray<string>;
  groups: ReadonlyArray<PlanMatrixGroup>;
}) {
  return (
    <div className="plan-matrix" tabIndex={0} role="group" aria-label="Tier comparison">
      <table className="plan-matrix__table">
        <colgroup>
          <col className="plan-matrix__col plan-matrix__col--label" />
          {tierNames.map((name) => (
            <col key={name} className="plan-matrix__col plan-matrix__col--tier" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Compare</th>
            {tierNames.map((name, index) => (
              <th key={name} scope="col" data-plan-col={index}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.title}>
              <tr className="plan-matrix__group">
                <th scope="colgroup" colSpan={tierNames.length + 1}>
                  {group.title}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.key} className={row.highlight ? "is-highlight" : undefined}>
                  <th scope="row">
                    {row.label}
                    {row.unit ? <span className="plan-matrix__unit">{row.unit}</span> : null}
                  </th>
                  {row.cells.map((cell, index) => (
                    <td key={index} data-plan-col={index}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------- inclusions ------------------------------ */

const INCLUSION_ICONS: Readonly<Record<string, LucideIcon>> = {
  Flowers: Flower,
  Tarp: Tent,
  Lapida: Landmark,
  "Family car": Car,
  "One dozen roses": Flower2,
  "Thank-you card": Mail,
  "Chapel days": Church,
  "Complete memorial package": Package,
};

/** "a, b, c" → "a, b and c". */
function readList(items: ReadonlyArray<string>): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function PlanInclusions({
  items,
  packageInclusions,
}: {
  items: ReadonlyArray<string>;
  packageInclusions: ReadonlyArray<PlanInclusion>;
}) {
  const packageNames = packageInclusions.map((row) => row.label.toLowerCase());
  return (
    <div className="plan-included">
      <ul className="plan-included__list">
        {items.map((label) => {
          const Icon = INCLUSION_ICONS[label] ?? Package;
          return (
            <li key={label} className="plan-included__item">
              <Icon size={25} aria-hidden="true" />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
      {packageNames.length > 0 ? (
        <p className="plan-included__note">
          The memorial package covers {readList(packageNames)}.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------- add-ons -------------------------------- */

const ADDONS: ReadonlyArray<{
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  label: string;
}> = [
  {
    icon: Heart,
    title: "The services, by the piece",
    body: "The five at-need services and embalming, quoted by the office.",
    href: "/services",
    label: "See the services",
  },
  {
    icon: Map,
    title: "A place in the park",
    body: "Lot and mausoleum families, six-year amortization.",
    href: "/lots/price-list-2026",
    label: "Browse the price list",
  },
  {
    icon: Church,
    title: "The chapel",
    body: "Two rooms for the dates you need — common or private.",
    href: "/facilities",
    label: "See the rooms",
  },
];

export function PlanAddons() {
  return (
    <div className="plan-addons">
      {ADDONS.map(({ icon: Icon, title, body, href, label }) => (
        <article key={title} className="plan-addon">
          <span className="plan-addon__icon" aria-hidden="true">
            <Icon size={20} />
          </span>
          <h3 className="plan-addon__title">{title}</h3>
          <p className="plan-addon__body">{body}</p>
          <a className="btn btn--secondary plan-addon__action" href={href}>
            {label}
          </a>
        </article>
      ))}
    </div>
  );
}

/* ---------------------------------- FAQ ---------------------------------- */

export type PlanFaqItem = { q: string; a: string };

export function PlanFaq({ items }: { items: ReadonlyArray<PlanFaqItem> }) {
  return (
    <div className="plan-faq">
      {items.map((item) => (
        <details className="plan-faq__item" key={item.q}>
          <summary className="plan-faq__q">
            <span className="plan-faq__icon" aria-hidden="true">
              <Sparkles size={14} />
            </span>
            <span className="plan-faq__q-text">{item.q}</span>
            <ChevronDown className="plan-faq__chevron" size={18} aria-hidden="true" />
          </summary>
          <p className="plan-faq__a">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
