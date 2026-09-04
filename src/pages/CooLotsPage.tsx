// COO pixel-port of stitch_villa_memorial_digital_platform/memorial_lots_catalog/code.html
// Content-only: rendered inside CooPublicShell (global header/footer/drawer).
// Copy, hex colors, token classes, layout, images, ₱ prices reproduced verbatim.

import { Link } from "react-router-dom";
import { useToast } from "../components/toast";
import { useCart } from "../lib/cart";
import { parseMoney } from "../lib/shop";

type LotProduct = {
  slug: string;
  name: string;
  chip?: string;
  desc: string;
  price: string;
  imgSrc: string;
  imgAlt?: string;
  mediaClassName?: string;
  cardClassName?: string;
  features: { icon: string; label: string }[];
};

const LOTS: LotProduct[] = [
  {
    slug: "mausoleum",
    name: "Mausoleum",
    chip: "Premium Estate",
    desc: "Our grandest offering, providing an exclusive and architecturally stunning private sanctuary for family heritage. A testament to enduring legacy with timeless elegance.",
    price: "₱1,073,000",
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
    price: "₱567,000",
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
    price: "₱128,000",
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
    price: "₱114,000",
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
    price: "₱75,000",
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAXjTipJlOo7NAB9V5KayrkVAWKEsX0uxuNdhgNdpahlwJbrLw8OLVJDrGEXpWxJJ700Y5EIIGZSJ1sJRz-xp9klw1wxd7s9IVowTzH4NSoRRcLG9VUt78B2M4fP8pgbXoebVonrVfLuER25a7PPSqwq-hMsZx2FyaTsT_XHGSGwJ7mU-XxvAAE5iCm3nXDIAwj6EgMzO86JxIUd8R4h2941F6cCEqe-PHBhj9f2LcX-Fz5trcEd6V4",
    cardClassName: "md:col-span-2 lg:col-span-1 lg:max-w-xl lg:mx-auto",
    mediaClassName: "bg-surface-container-highest",
    features: [
      { icon: "square_foot", label: "Area: 2.50 sqm" },
      { icon: "domain", label: "Structured Leveling" },
      { icon: "wb_sunny", label: "Well-lit Pathways" },
    ],
  },
];

export function CooLotsPage() {
  const { toast } = useToast();
  const { add } = useCart();

  function selectLot(slug: string, name: string, priceLabel: string) {
    add({
      id: `lot-${slug}`,
      name,
      kindLabel: "Memorial lot",
      detail: "Reservation · Sanctuario Memorial Park",
      unit: parseMoney(priceLabel),
    });
    toast(`${name} added to your cart — our care team will contact you to complete your reservation.`, "success");
  }

  return (
    <div className="text-on-background">
      {/* Introduction Section */}
      <section className="text-center py-16 md:py-24 max-w-3xl mx-auto px-margin-mobile md:px-0">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-6">
          A Legacy of Comfort and Peace
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant">
          Choosing a final resting place is a profound act of love and foresight. At Villa Memorial,
          we offer serene, meticulously maintained spaces designed to honor life's journey and
          provide a luminous sanctuary for generations to come. Explore our distinctive memorial
          lots, each crafted with dignity and lasting beauty.
        </p>
      </section>

      {/* Catalog Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter px-margin-mobile md:px-margin-desktop pb-section-gap max-w-[1200px] mx-auto w-full">
        {LOTS.map((lot) => (
          <article
            key={lot.name}
            className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(51,51,51,0.06)] hover:shadow-[0_8px_30px_rgb(51,51,51,0.12)] transition-shadow duration-300 group flex flex-col${lot.cardClassName ? ` ${lot.cardClassName}` : ""}`}
          >
            <div className={`relative h-72 overflow-hidden${lot.mediaClassName ? ` ${lot.mediaClassName}` : ""}`}>
              <img
                alt={lot.imgAlt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src={lot.imgSrc}
              />
              {lot.chip ? (
                <div className="absolute top-4 left-4 bg-primary-container/90 backdrop-blur-sm text-on-primary-container px-3 py-1 rounded-full text-label-md font-label-md shadow-sm">
                  {lot.chip}
                </div>
              ) : null}
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <h2 className="text-headline-md font-headline-md text-on-surface mb-2">
                <Link to={`/site/lots/${lot.slug}`} className="hover:text-primary hover:no-underline! transition-colors">
                  {lot.name}
                </Link>
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant mb-6 flex-1">{lot.desc}</p>
              <div className="space-y-3 mb-8">
                {lot.features.map((f) => (
                  <div key={f.label} className="flex items-center text-on-surface-variant text-body-md font-body-md">
                    <span className="material-symbols-outlined text-primary mr-3">{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-outline-variant">
                <div>
                  <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider block mb-1">
                    Starting Price
                  </span>
                  <span className="text-headline-sm font-headline-sm text-primary font-semibold">{lot.price}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/site/lots/${lot.slug}`}
                    className="border border-primary-container text-primary hover:bg-primary-fixed px-4 py-3 rounded-lg text-label-md font-label-md transition-colors duration-200 min-h-[48px] flex items-center gap-2 hover:no-underline!"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-6 py-3 rounded-lg text-label-md font-label-md transition-colors duration-200 min-h-[48px] flex items-center gap-2 cursor-pointer"
                    onClick={() => selectLot(lot.slug, lot.name, lot.price)}
                  >
                    <span>Add to Cart</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
