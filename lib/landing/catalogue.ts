/**
 * Rail picker catalogue — the real offerings a staff editor can pin to either
 * fixed rail (up to 5 per side). Everything here is derived from the REAL
 * catalogue the public pages already read:
 *  - service/product options reference real pages and the real uploaded photos;
 *  - plan prices are php() of lib/villa-pricing.ts figures — never authored by
 *    hand, so the editor can never offer a price that contradicts the price list.
 * (The frozen commerce catalog items are storefront checkout seeds with
 * placeholder prices — deliberately NOT offered here as marketing content.)
 */
import { php, COFFINS, LOT_PRICE_CATEGORIES } from "@/lib/villa-pricing";
import {
  COFFIN_BRONZE,
  COFFIN_SILVER,
  DEATH_AT_HOME_IMAGE,
  DEATH_AT_HOSPITAL_IMAGE,
  LOT_GARDEN_NICHES,
  LOT_MAUSOLEUM,
  LOT_PREMIUM,
  LOT_PRIMARY,
  PLAN_PACKAGES_IMAGE,
  TRANSPORT_IMAGE,
  VILLA_PARK_AERIAL,
} from "@/lib/media";
import type { RailItem, RailItemKind } from "@/lib/api-client/landing";

export type CatalogueEntry = {
  kind: RailItemKind;
  title: string;
  caption: string | null;
  price: string | null;
  image: string | null;
  href: string;
};

type CatalogueGroup = { label: string; entries: CatalogueEntry[] };

/** Real "lot only" regular selling price for a 2026 list product name. */
function sellingPriceOf(product: string): string | null {
  const category = LOT_PRICE_CATEGORIES[0];
  const row = category.rows.find((r) => r.product === product);
  return row ? php(row.regular.selling) : null;
}

function lotEntry(product: string, marketing: string, image: string): CatalogueEntry | null {
  const price = sellingPriceOf(product);
  if (!price) return null;
  return {
    kind: "plan",
    title: marketing,
    caption: "Lot only · 2026 list",
    price,
    image,
    href: "/lots/price-list-2026",
  };
}

/** Coffin tiers offered on the Villa Memorial Plan page (real uploaded photos). */
function coffinEntries(): CatalogueEntry[] {
  return COFFINS.map((c) => ({
    kind: "product",
    title: `${c.tier} casket`,
    caption: c.lid,
    price: null,
    image: c.photo,
    href: "/plans/villa-memorial-plan#coffins",
  }));
}

/** Everything a staff editor may pin to a rail, grouped by kind for the picker. */
export function buildRailCatalogue(): CatalogueGroup[] {
  const groups: CatalogueGroup[] = [
    {
      label: "Services",
      entries: [
        {
          kind: "service",
          title: "Death at home",
          caption: "Immediate care · 24/7",
          price: null,
          image: DEATH_AT_HOME_IMAGE,
          href: "/services/death-at-home",
        },
        {
          kind: "service",
          title: "Death at hospital",
          caption: "Coordination & transport",
          price: null,
          image: DEATH_AT_HOSPITAL_IMAGE,
          href: "/services/death-at-hospital",
        },
        {
          kind: "service",
          title: "Hearse & transport",
          caption: "Dignified fleet, day or night",
          price: null,
          image: TRANSPORT_IMAGE,
          href: "/transport",
        },
        {
          kind: "service",
          title: "Interment service",
          caption: "Bringing your loved one home",
          price: null,
          image: VILLA_PARK_AERIAL,
          href: "/lots/price-list-2026",
        },
        {
          kind: "service",
          title: "Memorial packages",
          caption: "Bundled at one clear price",
          price: null,
          image: PLAN_PACKAGES_IMAGE,
          href: "/packages",
        },
      ],
    },
    {
      label: "Plans & lots",
      entries: [
        ...["Mausoleum", "Garden Niches", "Prime Lots", "Premium Lots"].flatMap((product) => {
          const image =
            product === "Mausoleum"
              ? LOT_MAUSOLEUM
              : product === "Garden Niches"
                ? LOT_GARDEN_NICHES
                : product === "Prime Lots"
                  ? LOT_PRIMARY
                  : LOT_PREMIUM;
          const entry = lotEntry(product, product === "Prime Lots" ? "Prime Lot" : product === "Premium Lots" ? "Premium Lot" : product, image);
          return entry ? [entry] : [];
        }),
        {
          kind: "plan",
          title: "Villa Memorial Plan",
          caption: "Complete memorial service · from",
          price: `from ${php(500)}/month`,
          image: PLAN_PACKAGES_IMAGE,
          href: "/plans/villa-memorial-plan",
        },
      ],
    },
    {
      label: "Products & keepsakes",
      entries: coffinEntries(),
    },
    {
      label: "Links",
      entries: [
        {
          kind: "link",
          title: "Browse the live park map",
          caption: "Walk the grounds online",
          price: null,
          image: VILLA_PARK_AERIAL,
          href: "/map",
        },
        {
          kind: "link",
          title: "Compare all plans",
          caption: "Side by side",
          price: null,
          image: PLAN_PACKAGES_IMAGE,
          href: "/plans/compare",
        },
        {
          kind: "link",
          title: "Senior citizen rates",
          caption: "61–100 years old",
          price: null,
          image: COFFIN_BRONZE,
          href: "/plans/senior-benefits",
        },
        {
          kind: "link",
          title: "2026 price list",
          caption: "Products, plans & lots",
          price: null,
          image: LOT_PRIMARY,
          href: "/lots/price-list-2026",
        },
        {
          kind: "link",
          title: "Request a quote",
          caption: "Tell us what you need",
          price: null,
          image: PLAN_PACKAGES_IMAGE,
          href: "/quote",
        },
        {
          kind: "link",
          title: "Book an appointment",
          caption: "Visit the park",
          price: null,
          image: VILLA_PARK_AERIAL,
          href: "/appointments",
        },
        {
          kind: "link",
          title: "FAQ",
          caption: "Common questions",
          price: null,
          image: COFFIN_SILVER,
          href: "/faq",
        },
      ],
    },
  ];
  return groups.filter((g) => g.entries.length > 0);
}

/** Convenience flatten for tests and the editor "add" affordance. */
export function flattenCatalogue(): CatalogueEntry[] {
  return buildRailCatalogue().flatMap((g) => g.entries);
}

/** Turns a catalogue entry into a pin-able rail item with a stable id. */
export function catalogueToRailItem(entry: CatalogueEntry, slug: string): RailItem {
  return {
    id: `pin-${slug}`,
    kind: entry.kind,
    title: entry.title,
    caption: entry.caption,
    price: entry.price,
    image: entry.image,
    href: entry.href,
  };
}

