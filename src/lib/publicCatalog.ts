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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDYlYkozT7TsBmBNMCvkEFMsEcoBVtGXaHo_YRo4H3hW0T3GyOjc45aaqxnfKwTIw0kEUXn9zSMnazYPnWYaBMXSjZl2GXUQWueFWh-upbdlCrYi2NyDWGI20QSaOzss3KcS6mnMsPck_Q-NEK99l1Tq0gZ9um-I7TWZQOf3fEpJcjX8vI9-dv-mzJPX7O74SwzBj6NA82Pc-I-BQq4bTLVnF2cRncLPFnmpiITymlOR_R7q_9ugjdh",
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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBl5wqOJTZQne-cConDockYJ4_K8rWofbTsaZctUkg4er6YXnzgxw_BHUZT_XDptxQfS1CyWmDnIKWCVB0gelrTSutEQ5Lu5HUleT9ch7C4uQKTUJp0RXNR4fCyp9bA2UVIsXCeGcl06gMTo6-hfwWksSNKCmhaBw1qhyaaPKpUxZ6fNY3MhuKOPfJchE2nW-0AammosIxRzSoKCkiEEr9IQ3hm359MpyFccsr0NoRx1ObbgqIRaJ-N",
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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBS4a2wVjsf0nZMtB25iUMnB1KOv64pGG4YMaORbOzB_NilkFrlNdQGSV1_0mJtBcRFaO4lqr6qplrmJwzCX2DAD0rZU0doPnoQJYmmIGgEsmlzZp5DbS2Pihf8T-zLsVtoU9WygNMbWIlpJdJLOHtxMUTYfJFUAdyaYALWaoejxHzC37z9SZ7hzuHLT8JBQt7BSDaKpKzlVLeLeVpG8HdBr6m2bcsbEpDY1lJ7YFbbvhx2P-Pf2S7g",
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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDyPtM2fTef99BOgBjLjWi34g8s4ntcMXgZ23-Du8WE4pgK0h-4oieLEVv83rCSkn7b5RkanJvizgzbVtLrBpZADr99AmEob62b08iqde3geCdnqhR__S26S_oRgPut5W82tubYlM6sO6D4-1tPmEjLhj1Xp2UwsgUrWk3NY13xcfNUr2chW1ilnTH2lgdugGS2O5ClcI4TdlIk-Bo5ezbEJXMR7R64Hg6rSnEUaT9Sfc3ElvRcT-jE4HG-ILPGRV0STQ",
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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBgTaXMhKz_ceH8C4H-sJ3sjOgpGnbHkkNUL8oLt6DIEBvI_d4fF3IlcKMEROmZw8_oFH_HyS4pqruaGtAx2JE1005kkZgwZnRuxXClvzQ-Qan2i4ZRxyZvLGKL9vd_CCv6kDeV5oEX7rAF0c0_sCfdZnowg9k8ieGy3bmDCt8SjTwXY3fSD-c2P0taO2AfZ-mzus6DDulOtGhekiCMCrR08QrOU3mxd4VZ-xjBtr34Pdho5gPiLwlQrJ96-nyN4VeggA",
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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCEN3EF6kpAbJVJrdm2VyWqH1IGIV2C2T35g-HWW3b6h6Tum53dyrOsvLSufMIGKowiPqqLo_Rriw50mR5ajDEIev6V5C_nw4TciIonN7b0YbObHGTNI9K4IT9KO5HmyLi4XtO87TFpJfn7V8X72EI-HzaF4kh9TfaYwhbja6URiY_Mw0MSyoxCHyPhf0mzwYotizOEnTXAiZp7r_Oxnv4YefnHldtFOGAmqZpgYUeCyeLau0pf8CGXDw83qWRTls9Yqw",
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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBsX3nDaprJC3UuwfDgUORLGR4j6KPfjEpbgkBNAXYRt2ZZjx70iJ3fn4pvEDouZunpE7GxW-NTDawlBJbyUKgncy__nyKXYhf05QFg9aTpxDMV1e-jwE5A-sbHVm7QdQC_Z9fjzMotJ5BXJUR0vAEJkAk3Tjl83mFFBKlr_NzMZHvQRm28HO8M4w6VXdoZzD6xvsxC9z_qK7Vsf9T660dNGJigv8IdI9GWpub6q2zaLaxzcyBeSSgMnzxwMi3vMmcagw",
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
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAXjTipJlOo7NAB9V5KayrkVAWKEsX0uxuNdhgNdpahlwJbrLw8OLVJDrGEXpWxJJ700Y5EIIGZSJ1sJRz-xp9klw1wxd7s9IVowTzH4NSoRRcLG9VUt78B2M4fP8pgbXoebVonrVfLuER25a7PPSqwq-hMsZx2FyaTsT_XHGSGwJ7mU-XxvAAE5iCm3nXDIAwj6EgMzO86JxIUd8R4h2941F6cCEqe-PHBhj9f2LcX-Fz5trcEd6V4",
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
