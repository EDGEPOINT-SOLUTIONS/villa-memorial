// ============================================================================
// publicCatalog.ts — shared records for NEW public detail/comparison/reservation
// screens (no Stitch mockup exists for these). Values are copied from the COO
// listing pages they belong to so detail views stay consistent with the catalog
// (flag: consolidating these with the listing-page data is a dev decision — see
// PR description). Prices: plans/lots carry the figure shown on their listing;
// packages have no published price (unit null = price on arrangement).
// ============================================================================

// ---- Memorial plans (mirror of CooPlansPage PLANS) -------------------------
export type PublicPlan = {
  slug: string;
  name: string;
  sqm: string;
  total: number;
  totalLabel: string;
  imgSrc: string;
  imgAlt: string;
  years: number[];
  accent: "blue" | "gold";
  bullets: string[];
};

export const PUBLIC_PLANS: PublicPlan[] = [
  {
    slug: "garden-niches",
    name: "Garden Niches",
    sqm: "12.00",
    total: 629000,
    totalLabel: "₱629,000",
    imgSrc: "/media/lot-garden-niches.png",
    imgAlt: "A serene garden-niche memorial setting with white lilies and warm lighting.",
    years: [1, 3, 5],
    accent: "blue",
    bullets: ["12.00 sqm Area", "6 Years Amortization", "Includes Interment + VMP"],
  },
  {
    slug: "mausoleum",
    name: "Mausoleum",
    sqm: "24.00",
    total: 1135000,
    totalLabel: "₱1,135,000",
    imgSrc: "/media/lot-mausoleum.png",
    imgAlt: "A premium memorial chapel interior filled with golden light and floral arrangements.",
    years: [1, 3, 5, 10],
    accent: "gold",
    bullets: ["24.00 sqm Area", "6 Years Amortization", "Includes Interment + VMP"],
  },
  {
    slug: "premium-lots",
    name: "Premium Lots",
    sqm: "2.50",
    total: 176000,
    totalLabel: "₱176,000",
    imgSrc: "/media/lot-premium.png",
    imgAlt: "An expansive memorial park at sunrise with manicured green lawns.",
    years: [1, 3, 5, 10],
    accent: "blue",
    bullets: ["2.50 sqm Area", "6 Years Amortization", "Includes Interment + VMP"],
  },
];

export function publicPlanBySlug(slug: string): PublicPlan | undefined {
  return PUBLIC_PLANS.find((p) => p.slug === slug);
}

// ---- Wake / funeral packages (mirror of CooPackagesPage cards) -------------
export type PublicPackage = {
  slug: string;
  name: string;
  tagline: string;
  popular?: boolean;
  included: { text: string; excluded?: boolean }[];
};

export const PUBLIC_PACKAGES: PublicPackage[] = [
  {
    slug: "package-a",
    name: "Package A",
    tagline: "Simple and dignified essentials.",
    included: [
      { text: "Standard Metal Casket" },
      { text: "Retrieval within 25 miles" },
      { text: "Basic Preparation" },
      { text: "1-Day Chapel Viewing" },
      { text: "Premium Hearse (Standard included)", excluded: true },
    ],
  },
  {
    slug: "package-b",
    name: "Package B",
    tagline: "Standard comprehensive arrangement.",
    popular: true,
    included: [
      { text: "Solid Wood Casket" },
      { text: "Retrieval within 50 miles" },
      { text: "Full Preparation & Dressing" },
      { text: "3-Day Chapel Viewing" },
      { text: "Premium Hearse" },
    ],
  },
  {
    slug: "package-c",
    name: "Package C",
    tagline: "Premium bespoke tribute.",
    included: [
      { text: "Premium Bronze/Copper Casket" },
      { text: "Nationwide Retrieval Assistance" },
      { text: "Premium Preparation & Styling" },
      { text: "5-Day Premium Suite Viewing" },
      { text: "Luxury Hearse & Family Fleet (2 cars)" },
    ],
  },
];

export function publicPackageBySlug(slug: string): PublicPackage | undefined {
  return PUBLIC_PACKAGES.find((p) => p.slug === slug);
}

// ---- Memorial lot products (mirror of CooLotsPage cards) -------------------
export type PublicLot = {
  slug: string;
  name: string;
  chip?: string;
  desc: string;
  priceLabel: string;
  price: number;
  imgSrc: string;
  imgAlt?: string;
  features: { icon: string; label: string }[];
};

export const PUBLIC_LOTS: PublicLot[] = [
  {
    slug: "mausoleum",
    name: "Mausoleum",
    chip: "Premium Estate",
    desc: "Our grandest offering, providing an exclusive and architecturally stunning private sanctuary for family heritage. A testament to enduring legacy with timeless elegance.",
    priceLabel: "₱1,073,000",
    price: 1073000,
    imgSrc: "/media/lot-mausoleum.png",
    imgAlt: "Mausoleum",
    features: [
      { icon: "square_foot", label: "Area: 24.00 sqm" },
      { icon: "group", label: "Multi-vault Capacity" },
      { icon: "park", label: "Bespoke Landscaping" },
    ],
  },
  {
    slug: "garden-niches",
    name: "Garden Niches",
    chip: "Serene Gardens",
    desc: "Peaceful, landscaped enclosures offering a harmonious blend of nature and remembrance. Ideal for intimate family gatherings in a tranquil, open-air setting.",
    priceLabel: "₱567,000",
    price: 567000,
    imgSrc: "/media/lot-garden-niches.png",
    imgAlt: "Garden Niches",
    features: [
      { icon: "square_foot", label: "Area: 12.00 sqm" },
      { icon: "nature", label: "Integrated Floral Borders" },
      { icon: "chair_alt", label: "Memorial Seating Included" },
    ],
  },
  {
    slug: "prime-lots",
    name: "Prime Lots",
    chip: "Accessible Elegance",
    desc: "Situated in highly accessible areas of the park, our Prime Lots offer a beautiful, dignified space with excellent proximity to main pathways and serene vistas.",
    priceLabel: "₱128,000",
    price: 128000,
    imgSrc: "/media/lot-primary.png",
    imgAlt: "Prime Lots",
    features: [
      { icon: "square_foot", label: "Area: 2.50 sqm" },
      { icon: "location_on", label: "Premium Accessibility" },
      { icon: "grass", label: "Lawn Level Marker" },
    ],
  },
  {
    slug: "premium-lots",
    name: "Premium Lots",
    desc: "A beautiful and standard offering set within our lush, expansive lawns. These spaces provide a simple, elegant tribute surrounded by nature's quiet comfort.",
    priceLabel: "₱114,000",
    price: 114000,
    imgSrc: "/media/lot-premium.png",
    imgAlt: "Premium Lots",
    features: [
      { icon: "square_foot", label: "Area: 2.50 sqm" },
      { icon: "view_agenda", label: "Single Interments" },
      { icon: "grass", label: "Lawn Level Marker" },
    ],
  },
  {
    slug: "condo-type",
    name: "Condo-type",
    desc: "A modern, space-efficient solution that maintains dignity and grace. Our condo-type options provide a structured, elegant resting place within a contemporary setting.",
    priceLabel: "₱75,000",
    price: 75000,
    imgSrc: "/media/lot-premium.png",
    imgAlt: "Condo-type",
    features: [
      { icon: "square_foot", label: "Area: 2.50 sqm" },
      { icon: "domain", label: "Structured Leveling" },
      { icon: "wb_sunny", label: "Well-lit Pathways" },
    ],
  },
];

export function publicLotBySlug(slug: string): PublicLot | undefined {
  return PUBLIC_LOTS.find((l) => l.slug === slug);
}
