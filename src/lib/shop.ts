// ============================================================================
// shop.ts — shared demo store data for the public site's connected buy journey.
// Purpose: (1) canonical ₱ price helper used by cart/checkout, (2) the public
// merchandise catalog (Module C products) that the new /site/products screens
// render. This is demo-only seed content for the frontend prototype; no backend.
//
// NOTE on prices: several approved COO mockup pages show different prices for
// the same-named item (e.g. Mausoleum ₱1,135,000 on Plans vs ₱1,073,000 on Lots
// vs ₱450,000 on the map). That conflict is a dev/COO decision; the cart here
// stores whatever price the shopper saw on the page they added from, so totals
// stay honest to the mockup copy. This file only prices NEW merchandise (none
// of those figures exist in any mockup), flagged in the PR description.
// ============================================================================

/** Format a number as ₱ pesos, no decimals (matches COO mockup style). */
export function money(n: number): string {
  return "₱" + Math.round(n).toLocaleString("en-US");
}

/** Parse a "₱1,073,000" style label back to a number (or null). */
export function parseMoney(label: string | null | undefined): number | null {
  if (!label) return null;
  const cleaned = label.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned.replace(/\.$/, ""));
  return Number.isFinite(n) ? n : null;
}

export type ProductCategory =
  | "Caskets"
  | "Urns"
  | "Flowers"
  | "Memorial markers"
  | "Keepsakes";

export type ShopProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  blurb: string;
  detail: string;
  price: number;
  imageSeed: string;
  features: string[];
};

// --- Public merchandise catalog (Module C products). Prices are demo values —
// none of these figures appear on any approved mockup page (flagged for dev).
export const PRODUCTS: ShopProduct[] = [
  {
    id: "casket-hardwood",
    name: "Premium Hardwood Casket",
    category: "Caskets",
    blurb: "Hand-finished hardwood casket with a soft-touch velvet interior.",
    detail:
      "Crafted from premium hardwood and lined with plush velvet, this casket offers a dignified and timeless tribute. Includes full preparation styling and interior dressing.",
    price: 148000,
    imageSeed: "inmem-casket-hardwood",
    features: ["Premium hardwood construction", "Plush velvet interior", "Interior dressing included"],
  },
  {
    id: "casket-metal",
    name: "Classic Metal Casket",
    category: "Caskets",
    blurb: "A refined metal casket with a protective seal and elegant detailing.",
    detail:
      "A durable, protective-seal metal casket finished with elegant detailing. A dependable choice that balances grace with lasting quality.",
    price: 68000,
    imageSeed: "inmem-casket-metal",
    features: ["Protective seal", "Durable steel body", "Elegant brushed finish"],
  },
  {
    id: "urn-oak",
    name: "Oak Keepsake Urn",
    category: "Urns",
    blurb: "A warm, natural oak urn with a smooth matte finish.",
    detail:
      "Handcrafted from natural oak with a smooth matte finish, this urn offers a serene final resting vessel for cremated remains.",
    price: 18500,
    imageSeed: "inmem-urn-oak",
    features: ["Natural oak", "Matte finish", "Secure threaded lid"],
  },
  {
    id: "urn-ceramic",
    name: "Ceramic Memorial Urn",
    category: "Urns",
    blurb: "A softly glazed ceramic urn in a calming sky-blue tone.",
    detail:
      "A gently glazed ceramic urn inspired by the Serene Legacy palette. An understated, peaceful vessel for remembrance.",
    price: 12400,
    imageSeed: "inmem-urn-ceramic",
    features: ["Soft ceramic glaze", "Calming blue tone", "Felt-lined base"],
  },
  {
    id: "flowers-white-lily",
    name: "White Lily Arrangement",
    category: "Flowers",
    blurb: "Classic white lilies and greens arranged for chapel or home viewing.",
    detail:
      "A serene arrangement of white lilies, chrysanthemums and seasonal greens — a gentle, classic tribute for wakes and visitations.",
    price: 4500,
    imageSeed: "inmem-flowers-lily",
    features: ["Fresh seasonal blooms", "Chapel delivery included", "Stand optional"],
  },
  {
    id: "flowers-roses",
    name: "Rose Memorial Spray",
    category: "Flowers",
    blurb: "An elegant spray of roses in soft pastel and cream tones.",
    detail:
      "An elegant easel spray of roses and soft accents, sized for a casket top or memorial easel.",
    price: 6800,
    imageSeed: "inmem-flowers-roses",
    features: ["Casket-top or easel size", "Soft pastel tones", "Fresh daily"],
  },
  {
    id: "marker-granite",
    name: "Granite Lawn Marker",
    category: "Memorial markers",
    blurb: "A flush granite marker with laser-etched lettering.",
    detail:
      "A flush-set granite marker with laser-etched lettering, installation and a 10-year warranty included.",
    price: 32000,
    imageSeed: "inmem-marker-granite",
    features: ["Flush granite", "Laser-etched lettering", "Installation included"],
  },
  {
    id: "marker-bronze",
    name: "Bronze Memorial Plaque",
    category: "Memorial markers",
    blurb: "A classic bronze plaque with a protective powder coat.",
    detail:
      "A time-honored bronze plaque finished with a protective powder coat and mounted on a polished granite base.",
    price: 24500,
    imageSeed: "inmem-marker-bronze",
    features: ["Cast bronze", "Powder-coat protection", "Granite base"],
  },
  {
    id: "keepsake-candles",
    name: "Memorial Candle Set",
    category: "Keepsakes",
    blurb: "A set of remembrance candles in soft ivory and gold.",
    detail:
      "A keepsake set of scented remembrance candles in ivory and gold — a comforting presence for a home vigil or memorial table.",
    price: 1200,
    imageSeed: "inmem-keepsake-candles",
    features: ["Set of six", "Soft ivory & gold", "Gentle floral scent"],
  },
  {
    id: "keepsake-guestbook",
    name: "Leather Guest Book",
    category: "Keepsakes",
    blurb: "A padded leather guest book for condolences and memories.",
    detail:
      "A padded leather-bound guest book with 200 acid-free pages — a lasting keepsake of the words shared by family and friends.",
    price: 1850,
    imageSeed: "inmem-keepsake-guestbook",
    features: ["Padded leather cover", "200 acid-free pages", "Lay-flat binding"],
  },
];

export function productById(id: string): ShopProduct | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Caskets",
  "Urns",
  "Flowers",
  "Memorial markers",
  "Keepsakes",
];
