import type { Metadata } from "next";
import Link from "next/link";
import { PublicHero } from "@/components/kit";
import { PlanTierCard, type PlanTierColumn, type PlanTierPhoto } from "@/components/villa/plan-tier-card";
import { PlanCompare } from "@/components/villa/plan-compare";
import {
  PlanAddons,
  PlanBandHead,
  PlanComparisonMatrix,
  PlanFaq,
  PlanInclusions,
  PlanOrient,
  type PlanFaqItem,
  type PlanMatrixGroup,
  type PlanMatrixRow,
} from "@/components/villa/plan-surface";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument, type PlanTierContent } from "@/lib/plan-content";
import { planRequestAction } from "@/lib/plan-selection";
import { PENDING_TERM_LABEL } from "@/lib/monthly-pricing";
import { planRateOf, type PaymentRow } from "@/lib/pricing-model";
import { clientPhotoWide } from "@/lib/client-photos";
import { libraryThumb, libraryThumbSet } from "@/lib/media";
import {
  CASH_ASSISTANCE,
  COFFINS,
  COFFIN_TIER_PHOTO_IDS,
  php,
  PLAN_TERMS,
} from "@/lib/villa-pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Villa Memorial Plan — Villa Funeraria",
  description:
    "The Villa Memorial Plan's five tiers compared — every monthly, quarterly, semi-annual and annual rate, the senior-citizen rates, what each coffin carries and what every plan includes.",
  path: "/plans",
});

// Reads the pricing store + the page document per request — a staff edit must be
// what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The Villa Memorial Plan page (rebuilt 2026-09-30, `villa-plans-redesign-plan`;
 * captain approved the Revision 4 board: "Im good with the plans page, please
 * implement it").
 *
 * THE COMPLETE PRICING SURFACE. The page now carries the whole plan decision in
 * one place, in the home's band grammar:
 *   1 · the opening  — the home gateway (PublicHero) + three orientation facts;
 *   2 · the five tier columns — equal height, one small coffin photograph each,
 *       the regular monthly figure and its annual equivalent, the lid and the
 *       cash assistance, one gold enquiry per column;
 *   3 · the comparison matrix — the honest differentiator rows only: the coffin,
 *       the four regular terms, the four SENIOR terms and the cash assistance.
 *       The identical inclusions are NOT repeated per column;
 *   4 · what every plan includes — printed once;
 *   5 · the add-ons — services, park lots and the chapel;
 *   6 · the FAQ — the conditions and eligibility a family asks about.
 *
 * NO TOGGLE (captain, 2026-09-30): the page keeps no payment-period or
 * rate-class control. The columns lead with the regular monthly figure and the
 * matrix prints every term and both rate classes at once, so the page is a
 * Server Component with no client state except the tier↔matrix reading aid
 * (`PlanCompare`).
 *
 * HONESTY. Every figure is a live read of the pricing store (`planRateOf`) or
 * the client's own sheet constants (`COFFINS`, `CASH_ASSISTANCE`); nothing is
 * authored here. The five tier checklists the client supplied are identical, so
 * the page does not imply a tier changes its inclusions — it prints them once.
 * The plan's term in months is unrecorded, so the note names Villa Funeraria
 * rather than guessing. The coffin photographs are the client's own samples and
 * are labelled as illustrations. `/price-list` keeps the full 2026 sheets and
 * links back here.
 *
 * CONTENT HOME: the five tiers' names and one-line descriptions are the "Villa
 * Memorial Plan" page document (Pages & content), read through
 * `lib/plan-content.ts`, so a staff edit reaches this page on its next request.
 */

/** The one small coffin photograph a tier column prints (staff pick first). */
function tierPhoto(tier: PlanTierContent): PlanTierPhoto | null {
  if (tier.image?.src) {
    return {
      src: libraryThumb(tier.image.src, 640),
      srcSet: libraryThumbSet(tier.image.src),
      width: 640,
      height: 427,
      alt: tier.image.alt || `Sample ${tier.heading} coffin`,
    };
  }
  const id = COFFIN_TIER_PHOTO_IDS[tier.heading];
  if (!id) return null;
  const wide = clientPhotoWide(id);
  return {
    src: wide.src,
    srcSet: wide.srcSet,
    width: wide.width,
    height: wide.height,
    alt: `Sample ${tier.heading} coffin — illustration only`,
  };
}

/**
 * The cash-assistance amount for a tier. The sheet groups its rows by family
 * ("Bronze 1 & 2", "Silver 1 & 2", "Gold"), so the tier's first word selects the
 * row — a derived read of `CASH_ASSISTANCE`, never a typed amount.
 */
function cashForTier(tierName: string): number | null {
  const family = tierName.split(" ")[0];
  const row = CASH_ASSISTANCE.find((entry) => entry.tiers.split(" ")[0] === family);
  return row ? row.amount : null;
}

/** The four term rows of one rate card, in monthly-first order. */
function rateRows(
  rows: ReadonlyArray<PaymentRow>,
  columns: ReadonlyArray<PlanTierColumn>,
  highlightMonthly: boolean,
): PlanMatrixRow[] {
  return PLAN_TERMS.map((term) => {
    const row = rows.find((candidate) => candidate.mode === term.mode);
    return {
      key: term.id,
      label: term.label,
      highlight: highlightMonthly && term.id === "monthly",
      cells: columns.map((column) => (row ? php(row[column.content.tier]) : "—")),
    };
  });
}

/** The FAQ — the plan document's own conditions, asked as questions. */
function planFaqs(plan: ReturnType<typeof planContentFromDocument>): PlanFaqItem[] {
  const faqs: PlanFaqItem[] = [];
  if (plan.eligibility.length > 0) {
    faqs.push({ q: "Who can apply for the regular rate?", a: plan.eligibility.join(" · ") });
  }
  faqs.push({
    q: "Can a senior citizen get a plan?",
    a: "Yes — ages 61–100 with no insurance benefit, on a pay-the-balance arrangement.",
  });
  faqs.push({
    q: "Can I choose how often I pay?",
    a: "Yes — monthly, quarterly, semi-annually or yearly, at the same annual total.",
  });
  if (plan.notes.adjust) {
    faqs.push({ q: "Can I adjust the payment term?", a: plan.notes.adjust });
  }
  if (plan.notes.assign) {
    faqs.push({ q: "Is the plan transferable?", a: "Yes — to anyone, with a ₱1,000 transfer fee." });
  }
  if (plan.notes.contestability) {
    faqs.push({ q: "When does the plan take effect?", a: plan.notes.contestability });
  }
  faqs.push({
    q: "What does every plan include?",
    a: "Every item listed above, plus the complete memorial package.",
  });
  faqs.push({
    q: "What if I need only some services?",
    a: "The at-need services and embalming are quoted by the office.",
  });
  if (plan.notes.serving) {
    faqs.push({
      q: "Who serves and underwrites the plan?",
      a: "Served by Funeraria Villa & ZC-Arcega Funeral Homes, underwritten by Villa Agency Insurance Services.",
    });
  }
  return faqs;
}

export default async function PlansPage() {
  const [page, pricing] = await Promise.all([
    getPageDocument("plans").catch(() => null),
    loadPricingDocument(),
  ]);
  const plan = planContentFromDocument(page);
  const heroHeadline = page?.hero.headline.trim() ?? "";

  const columns: PlanTierColumn[] = plan.tiers.map((tier) => {
    const request = planRequestAction({
      pricing: pricing.plans,
      tier: tier.tier,
      term: "monthly",
      senior: false,
    });
    return {
      content: tier,
      monthly: planRateOf(pricing.plans, tier.tier, "monthly", false),
      annual: planRateOf(pricing.plans, tier.tier, "annual", false),
      photo: tierPhoto(tier),
      lid: COFFINS.find((coffin) => coffin.tier === tier.heading)?.lid ?? "",
      cash: cashForTier(tier.heading),
      requestHref: request.href,
    };
  });
  const tierNames = columns.map((column) => column.content.heading);

  const groups: PlanMatrixGroup[] = [
    {
      title: "The coffin",
      rows: [
        {
          key: "photo",
          label: "Photograph",
          cells: columns.map((column, index) =>
            column.photo ? (
              /* eslint-disable-next-line @next/next/no-img-element -- client photograph */
              <img
                key={index}
                src={column.photo.src}
                srcSet={column.photo.srcSet}
                sizes="92px"
                width={column.photo.width}
                height={column.photo.height}
                alt={column.photo.alt}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span key={index} className="plan-matrix__none">
                —
              </span>
            ),
          ),
        },
        {
          key: "lid",
          label: "Cover / lid",
          cells: columns.map((column) => column.lid || "—"),
        },
      ],
    },
    { title: "Your rate — regular", rows: rateRows(pricing.plans.regular, columns, true) },
    {
      title: "Senior citizen rate — ages 61–100, no insurance benefit",
      rows: rateRows(pricing.plans.senior, columns, false),
    },
    {
      title: "Cash assistance with hospital benefit",
      rows: [
        {
          key: "cash",
          label: "During the paying period",
          cells: columns.map((column) => (column.cash !== null ? php(column.cash) : "—")),
        },
      ],
    },
  ];

  const sharedItems =
    plan.tiers.length === 0
      ? []
      : plan.tiers[0].items
          .filter(
            (item) =>
              item.checked &&
              plan.tiers.every((tier) =>
                tier.items.some((candidate) => candidate.label === item.label && candidate.checked),
              ),
          )
          .map((item) => item.label);

  const faqs = planFaqs(plan);

  return (
    <div className="plan-flow plan-page">
      <PublicHero
        variant="interior"
        eyebrow={page?.hero.eyebrow.trim() || undefined}
        title={heroHeadline || "Villa Memorial Plan"}
        lead={page?.hero.lead.trim() || undefined}
        textColour={page?.hero.textColour ?? null}
        primary={{ label: "See the 2026 rates", href: "/price-list" }}
        secondary={{ label: "View packages", href: "/plans/packages" }}
      >
        <nav className="hero-chips" aria-label="Related plan pages">
          <Link href="/products">Coffins &amp; caskets</Link>
        </nav>
      </PublicHero>

      <PlanOrient />

      <PlanCompare>
        {/* The five tier columns — one height, one coffin photograph each. */}
        <section className="plan-section" aria-labelledby="plan-tiers-title">
          <PlanBandHead
            id="plan-tiers-title"
            kicker="The five tiers"
            title="Compare the five tiers"
            lead="One coffin and one rate per tier."
          />
          {columns.length === 0 ? (
            <p className="text-sm text-muted">
              The tier details are being prepared — the 2026 rates are on the Price list.
            </p>
          ) : (
            <div className="plan-tiers">
              {columns.map((column, index) => (
                <PlanTierCard key={column.content.tier} column={column} index={index} />
              ))}
            </div>
          )}
          <p className="plan-section__note">
            Sample photographs — illustration purposes only. {PENDING_TERM_LABEL}.
          </p>
        </section>

        {/* The comparison matrix — the rows that actually differ. */}
        <section className="plan-section" aria-labelledby="plan-compare-title">
          <PlanBandHead
            id="plan-compare-title"
            kicker="The comparison"
            title="What differs, tier by tier"
            lead="Only the rows that differ."
          />
          <PlanComparisonMatrix tierNames={tierNames} groups={groups} />
          <p className="plan-section__note">
            Every figure is a live store read; the senior rate is for ages 61–100 with no insurance
            benefit.
          </p>
        </section>
      </PlanCompare>

      <section className="plan-section" aria-labelledby="plan-included-title">
        <PlanBandHead
          id="plan-included-title"
          kicker="Included with every tier"
          title="Every plan already includes all of this"
          lead="The same on every tier."
        />
        <PlanInclusions items={sharedItems} packageInclusions={plan.packageInclusions} />
      </section>

      <section className="plan-section" aria-labelledby="plan-addons-title">
        <PlanBandHead
          id="plan-addons-title"
          kicker="If you don't need a plan"
          title="Add only what you need"
        />
        <PlanAddons />
      </section>

      <section className="plan-section" aria-labelledby="plan-faq-title">
        <PlanBandHead
          id="plan-faq-title"
          kicker="Questions families ask"
          title="Frequently asked questions"
          lead="Open a question to read the answer."
        />
        <PlanFaq items={faqs} />
      </section>
    </div>
  );
}
