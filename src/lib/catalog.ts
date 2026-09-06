// ============================================================================
// catalog.ts — CANONICAL demo catalogue ("the admin's shelf").
// One source of truth for everything the funeral home sells: plans, lots,
// packages, products, transport and at-need services. Every item has ONE price
// in ₱ and an `active` flag the admin controls. Public pages, cart, checkout and
// receipts all read from this shelf so admin edits show up everywhere.
// Demo-only seed content for the frontend prototype (no backend).
//
// NOTE: earlier COO mockup pages disagreed on prices for the same item
// (Mausoleum ₱1,135,000 on Plans vs ₱1,073,000 on Lots vs ₱450,000 on the map).
// This file is the single canonical price source; pages were normalized to it.
// Items marked "price on arrangement" (price === null) need staff confirmation.
// ============================================================================

export type ItemKind =
  | "Plan"
  | "Lot"
  | "Package"
  | "Product"
  | "Transport"
  | "Service";

export type CatalogRecord = {
  sku: string;
  kind: ItemKind;
  name: string;
  category?: string;
  blurb: string;
  detail: string;
  price: number | null; // ₱; null = price on arrangement
  image?: string;
  imageSeed?: string;
  imageAlt?: string;
  features: string[];
  active: boolean;
  accent?: "blue" | "gold";
  chip?: string;
};

export type SiteCopyKey =
  | "home.heroTitle"
  | "home.heroSubtitle"
  | "site.tagline"
  | "plans.headline"
  | "lots.headline"
  | "map.title"
  | "contact.blurb";

export type SiteCopy = Record<SiteCopyKey, string>;

export function money(n: number): string {
  return "₱" + Math.round(n).toLocaleString("en-US");
}

export function parseMoney(label: string | null | undefined): number | null {
  if (!label) return null;
  const cleaned = label.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned.replace(/\.$/, ""));
  return Number.isFinite(n) ? n : null;
}

export const SITE_COPY_DEFAULTS: SiteCopy = {
  "home.heroTitle": "Honoring every life with dignity and light.",
  "home.heroSubtitle":
    "Funeral services, memorial plans, and garden lots — planned with care and guided with compassion.",
  "site.tagline": "Luminous Comfort in every guide.",
  "plans.headline": "Prepare Today. Give Your Family Peace of Mind Tomorrow.",
  "lots.headline": "A Legacy of Comfort and Peace",
  "map.title": "Sanctuario Memorial Park",
  "contact.blurb": "Our compassionate team is available 24/7.",
};

const IMG = {
  mausoleum:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBl5wqOJTZQne-cConDockYJ4_K8rWofbTsaZctUkg4er6YXnzgxw_BHUZT_XDptxQfS1CyWmDnIKWCVB0gelrTSutEQ5Lu5HUleT9ch7C4uQKTUJp0RXNR4fCyp9bA2UVIsXCeGcl06gMTo6-hfwWksSNKCmhaBw1qhyaaPKpUxZ6fNY3MhuKOPfJchE2nW-0AammosIxRzSoKCkiEEr9IQ3hm359MpyFccsr0NoRx1ObbgqIRaJ-N",
  garden:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDYlYkozT7TsBmBNMCvkEFMsEcoBVtGXaHo_YRo4H3hW0T3GyOjc45aaqxnfKwTIw0kEUXn9zSMnazYPnWYaBMXSjZl2GXUQWueFWh-upbdlCrYi2NyDWGI20QSaOzss3KcS6mnMsPck_Q-NEK99l1Tq0gZ9um-I7TWZQOf3fEpJcjX8vI9-dv-mzJPX7O74SwzBj6NA82Pc-I-BQq4bTLVnF2cRncLPFnmpiITymlOR_R7q_9ugjdh",
  premium:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBS4a2wVjsf0nZMtB25iUMnB1KOv64pGG4YMaORbOzB_NilkFrlNdQGSV1_0mJtBcRFaO4lqr6qplrmJwzCX2DAD0rZU0doPnoQJYmmIGgEsmlzZp5DbS2Pihf8T-zLsVtoU9WygNMbWIlpJdJLOHtxMUTYfJFUAdyaYALWaoejxHzC37z9SZ7hzuHLT8JBQt7BSDaKpKzlVLeLeVpG8HdBr6m2bcsbEpDY1lJ7YFbbvhx2P-Pf2S7g",
};

// --- Plans (pre-need) -------------------------------------------------------
export const CATALOG: CatalogRecord[] = [
  {
    sku: "plan-garden-niches",
    kind: "Plan",
    name: "Garden Niches",
    blurb: "Peaceful, landscaped niches for an intimate, tranquil setting.",
    detail:
      "Pre-need memorial plan covering a 12.00 sqm garden-niche setting. Lock in today's price with funds held in a trusted trust fund.",
    price: 629000,
    image: IMG.garden,
    imageAlt: "Garden niches memorial setting",
    features: ["12.00 sqm Area", "6 Years Amortization", "Includes Interment + VMP"],
    active: true,
    accent: "blue",
  },
  {
    sku: "plan-mausoleum",
    kind: "Plan",
    name: "Mausoleum",
    blurb: "An exclusive private sanctuary for family heritage.",
    detail:
      "Our grandest pre-need offering: a 24.00 sqm private mausoleum sanctuary with timeless elegance.",
    price: 1135000,
    image: IMG.mausoleum,
    imageAlt: "Mausoleum plan",
    features: ["24.00 sqm Area", "6 Years Amortization", "Includes Interment + VMP"],
    active: true,
    accent: "gold",
  },
  {
    sku: "plan-premium-lots",
    kind: "Plan",
    name: "Premium Lots",
    blurb: "A simple, elegant tribute on our lush expansive lawns.",
    detail:
      "Pre-need memorial plan for a 2.50 sqm premium lawn lot within the memorial park.",
    price: 176000,
    image: IMG.premium,
    imageAlt: "Premium lots plan",
    features: ["2.50 sqm Area", "6 Years Amortization", "Includes Interment + VMP"],
    active: true,
    accent: "blue",
  },
];

// --- Lots (memorial property) -----------------------------------------------
export const LOTS_CATALOG: CatalogRecord[] = [
  {
    sku: "lot-mausoleum",
    kind: "Lot",
    name: "Mausoleum",
    chip: "Premium Estate",
    blurb: "Our grandest offering — an exclusive private sanctuary for family heritage.",
    detail: "24.00 sqm mausoleum estate with multi-vault capacity and bespoke landscaping.",
    price: 1135000,
    image: IMG.mausoleum,
    imageAlt: "Mausoleum",
    features: ["24.00 sqm", "Multi-vault Capacity", "Bespoke Landscaping"],
    active: true,
  },
  {
    sku: "lot-garden-niches",
    kind: "Lot",
    name: "Garden Niches",
    chip: "Serene Gardens",
    blurb: "Peaceful, landscaped enclosures in a tranquil open-air setting.",
    detail: "12.00 sqm garden niche with floral borders and memorial seating.",
    price: 629000,
    image: IMG.garden,
    imageAlt: "Garden Niches",
    features: ["12.00 sqm", "Integrated Floral Borders", "Memorial Seating"],
    active: true,
  },
  {
    sku: "lot-prime-lots",
    kind: "Lot",
    name: "Prime Lots",
    chip: "Accessible Elegance",
    blurb: "Dignified spaces with excellent proximity to main pathways.",
    detail: "2.50 sqm prime lawn lot, highly accessible with serene vistas.",
    price: 128000,
    image: IMG.premium,
    imageAlt: "Prime Lots",
    features: ["2.50 sqm", "Premium Accessibility", "Lawn Level Marker"],
    active: true,
  },
  {
    sku: "lot-premium-lots",
    kind: "Lot",
    name: "Premium Lots",
    blurb: "A simple, elegant tribute within lush, expansive lawns.",
    detail: "2.50 sqm standard lawn lot surrounded by nature's quiet comfort.",
    price: 114000,
    image: IMG.premium,
    imageAlt: "Premium Lots",
    features: ["2.50 sqm", "Single Interments", "Lawn Level Marker"],
    active: true,
  },
  {
    sku: "lot-condo-type",
    kind: "Lot",
    name: "Condo-type",
    blurb: "A modern, space-efficient structure that maintains dignity and grace.",
    detail: "Structured, elegant resting option within a contemporary setting.",
    price: 75000,
    image: IMG.garden,
    imageAlt: "Condo-type",
    features: ["Structured Leveling", "Well-lit Pathways"],
    active: true,
  },
];

// --- Wake / funeral packages ------------------------------------------------
export const PACKAGES_CATALOG: CatalogRecord[] = [
  {
    sku: "package-a",
    kind: "Package",
    name: "Package A",
    blurb: "Simple and dignified essentials.",
    detail: "A simple, dignified essentials arrangement.",
    price: null,
    features: [
      "Standard Metal Casket",
      "Retrieval within 25 miles",
      "Basic Preparation",
      "1-Day Chapel Viewing",
    ],
    active: true,
  },
  {
    sku: "package-b",
    kind: "Package",
    name: "Package B",
    blurb: "Standard comprehensive arrangement.",
    detail: "The most popular, well-rounded funeral arrangement.",
    price: null,
    features: [
      "Solid Wood Casket",
      "Retrieval within 50 miles",
      "Full Preparation & Dressing",
      "3-Day Chapel Viewing",
      "Premium Hearse",
    ],
    active: true,
    accent: "gold",
  },
  {
    sku: "package-c",
    kind: "Package",
    name: "Package C",
    blurb: "Premium bespoke tribute.",
    detail: "A premium, fully bespoke funeral tribute.",
    price: null,
    features: [
      "Premium Bronze/Copper Casket",
      "Nationwide Retrieval Assistance",
      "Premium Preparation & Styling",
      "5-Day Premium Suite Viewing",
      "Luxury Hearse & Family Fleet (2 cars)",
    ],
    active: true,
  },
];

// --- Merchandise (products) ------------------------------------------------
export const PRODUCTS_CATALOG: CatalogRecord[] = [
  {
    sku: "product-casket-hardwood",
    kind: "Product",
    name: "Premium Hardwood Casket",
    category: "Caskets",
    blurb: "Hand-finished hardwood casket with a soft-touch velvet interior.",
    detail: "Crafted from premium hardwood and lined with plush velvet. Includes preparation styling and interior dressing.",
    price: 148000,
    imageSeed: "inmem-casket-hardwood",
    features: ["Premium hardwood construction", "Plush velvet interior", "Interior dressing included"],
    active: true,
  },
  {
    sku: "product-casket-metal",
    kind: "Product",
    name: "Classic Metal Casket",
    category: "Caskets",
    blurb: "A refined metal casket with a protective seal.",
    detail: "A durable, protective-seal metal casket with elegant detailing.",
    price: 68000,
    imageSeed: "inmem-casket-metal",
    features: ["Protective seal", "Durable steel body", "Elegant brushed finish"],
    active: true,
  },
  {
    sku: "product-urn-oak",
    kind: "Product",
    name: "Oak Keepsake Urn",
    category: "Urns",
    blurb: "A warm, natural oak urn with a smooth matte finish.",
    detail: "Handcrafted natural oak urn with a smooth matte finish and secure threaded lid.",
    price: 18500,
    imageSeed: "inmem-urn-oak",
    features: ["Natural oak", "Matte finish", "Secure threaded lid"],
    active: true,
  },
  {
    sku: "product-urn-ceramic",
    kind: "Product",
    name: "Ceramic Memorial Urn",
    category: "Urns",
    blurb: "A softly glazed ceramic urn in a calming sky-blue tone.",
    detail: "Gently glazed ceramic urn inspired by the Serene Legacy palette.",
    price: 12400,
    imageSeed: "inmem-urn-ceramic",
    features: ["Soft ceramic glaze", "Calming blue tone", "Felt-lined base"],
    active: true,
  },
  {
    sku: "product-flowers-lily",
    kind: "Product",
    name: "White Lily Arrangement",
    category: "Flowers",
    blurb: "Classic white lilies and greens for chapel or home viewing.",
    detail: "A serene arrangement of white lilies, chrysanthemums and seasonal greens.",
    price: 4500,
    imageSeed: "inmem-flowers-lily",
    features: ["Fresh seasonal blooms", "Chapel delivery included", "Stand optional"],
    active: true,
  },
  {
    sku: "product-flowers-roses",
    kind: "Product",
    name: "Rose Memorial Spray",
    category: "Flowers",
    blurb: "An elegant spray of roses in soft pastel and cream tones.",
    detail: "Elegant easel spray sized for a casket top or memorial easel.",
    price: 6800,
    imageSeed: "inmem-flowers-roses",
    features: ["Casket-top or easel size", "Soft pastel tones", "Fresh daily"],
    active: true,
  },
  {
    sku: "product-marker-granite",
    kind: "Product",
    name: "Granite Lawn Marker",
    category: "Memorial markers",
    blurb: "A flush granite marker with laser-etched lettering.",
    detail: "Flush-set granite marker with laser-etched lettering, installation included.",
    price: 32000,
    imageSeed: "inmem-marker-granite",
    features: ["Flush granite", "Laser-etched lettering", "Installation included"],
    active: true,
  },
  {
    sku: "product-marker-bronze",
    kind: "Product",
    name: "Bronze Memorial Plaque",
    category: "Memorial markers",
    blurb: "A classic bronze plaque with a protective powder coat.",
    detail: "Cast bronze plaque with powder-coat protection on a granite base.",
    price: 24500,
    imageSeed: "inmem-marker-bronze",
    features: ["Cast bronze", "Powder-coat protection", "Granite base"],
    active: true,
  },
  {
    sku: "product-keepsake-candles",
    kind: "Product",
    name: "Memorial Candle Set",
    category: "Keepsakes",
    blurb: "Remembrance candles in soft ivory and gold.",
    detail: "Set of six scented remembrance candles in ivory and gold.",
    price: 1200,
    imageSeed: "inmem-keepsake-candles",
    features: ["Set of six", "Soft ivory & gold", "Gentle floral scent"],
    active: true,
  },
  {
    sku: "product-keepsake-guestbook",
    kind: "Product",
    name: "Leather Guest Book",
    category: "Keepsakes",
    blurb: "A padded leather guest book for condolences and memories.",
    detail: "Padded leather-bound guest book with 200 acid-free pages.",
    price: 1850,
    imageSeed: "inmem-keepsake-guestbook",
    features: ["Padded leather cover", "200 acid-free pages", "Lay-flat binding"],
    active: true,
  },
];

// --- Transport --------------------------------------------------------------
export const TRANSPORT_CATALOG: CatalogRecord[] = [
  {
    sku: "transport-hearse",
    kind: "Transport",
    name: "Funeral Hearse",
    blurb: "A selection of dignified, modern hearses.",
    detail: "Dignified, modern hearses for the graceful conveyance of a loved one.",
    price: 25000,
    features: ["Modern, well-maintained fleet", "Professional chauffeur"],
    active: true,
  },
  {
    sku: "transport-family",
    kind: "Transport",
    name: "Family Vehicle",
    blurb: "Comfortable limousines or luxury SUVs for the family.",
    detail: "Spacious vehicles so immediate family can travel together in privacy.",
    price: 18000,
    features: ["Privacy for the family", "Comfortable seating"],
    active: true,
  },
  {
    sku: "transport-escort",
    kind: "Transport",
    name: "Escort Vehicle",
    blurb: "Professional escort for a safe, respectful procession.",
    detail: "Escort services for an uninterrupted, respectful procession.",
    price: 9000,
    features: ["Safe procession", "Professional escort"],
    active: true,
  },
  {
    sku: "transport-long-distance",
    kind: "Transport",
    name: "Long-Distance Transfer",
    blurb: "Careful transport across provincial lines.",
    detail: "Handles all logistics and permits for extended journeys.",
    price: null,
    features: ["Provincial transfers", "Permits handled"],
    active: true,
  },
  {
    sku: "transport-airport",
    kind: "Transport",
    name: "Airport Transfer",
    blurb: "Specialized coordination for remains via air transit.",
    detail: "Secure transport to/from the airport and liaison with cargo handlers.",
    price: null,
    features: ["Airport liaison", "Secure handling"],
    active: true,
  },
];

export const ALL_CATALOG: CatalogRecord[] = [
  ...CATALOG,
  ...LOTS_CATALOG,
  ...PACKAGES_CATALOG,
  ...PRODUCTS_CATALOG,
  ...TRANSPORT_CATALOG,
];

export function catalogBySku(sku: string): CatalogRecord | undefined {
  return ALL_CATALOG.find((i) => i.sku === sku);
}

