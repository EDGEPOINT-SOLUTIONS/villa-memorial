// COO pixel-port of stitch_villa_memorial_digital_platform/memorial_lots_catalog/code.html
// Card layout stays as approved; item data (name, price, image, description,
// features, on-sale) now reads the admin's shelf (Store) so edits under
// Staff → Store & content reflect on this page live.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { money, type CatalogRecord } from "../lib/catalog";
import { useCart } from "../lib/cart";
import { useToast } from "../components/toast";

type Feature = { icon: string; label: string };
type LotProduct = {
  slug: string;
  name: string;
  chip?: string;
  desc: string;
  price: string;
  imgSrc: string;
  imgAlt?: string;
  cardClassName?: string;
  features: Feature[];
};

/** Pick a Material Symbol for a lot feature string (keeps the COO card look). */
function iconFor(label: string): string {
  const t = label.toLowerCase();
  if (t.includes("sqm")) return "square_foot";
  if (t.includes("multi-vault") || t.includes("capacity")) return "group";
  if (t.includes("bespoke") || t.includes("landscap")) return "park";
  if (t.includes("floral") || t.includes("border")) return "nature";
  if (t.includes("seating")) return "chair_alt";
  if (t.includes("accessib")) return "location_on";
  if (t.includes("marker") || t.includes("lawn")) return "grass";
  if (t.includes("interment")) return "view_agenda";
  if (t.includes("level")) return "domain";
  if (t.includes("path") || t.includes("light")) return "wb_sunny";
  return "check_circle";
}

function toProduct(r: CatalogRecord): LotProduct {
  return {
    slug: r.sku.replace(/^lot-/, ""),
    name: r.name,
    chip: r.chip,
    desc: r.blurb,
    price: r.price === null ? "On arrangement" : money(r.price),
    imgSrc: r.image ?? "",
    imgAlt: r.imageAlt ?? r.name,
    cardClassName: r.sku === "lot-condo-type" ? "md:col-span-2 lg:col-span-1 lg:max-w-xl lg:mx-auto" : undefined,
    features: r.features.map((label) => ({ icon: iconFor(label), label })),
  };
}

export function CooLotsPage() {
  const { toast } = useToast();
  const { add } = useCart();
  const { byKind, copy } = useStore();
  const lots = useMemo(() => byKind("Lot", { activeOnly: true }).map(toProduct), [byKind]);

  function selectLot(r: CatalogRecord) {
    add({
      id: r.sku,
      name: r.name,
      kindLabel: "Memorial lot",
      detail: "Reservation · Sanctuario Memorial Park",
      image: r.image,
      unit: r.price,
    });
    toast(`${r.name} added to your cart — our care team will contact you to complete your reservation.`, "success");
  }

  const recordFor = (product: LotProduct): CatalogRecord | undefined =>
    byKind("Lot").find((r) => r.sku.replace(/^lot-/, "") === product.slug);

  return (
    <div className="text-on-background">
      {/* Introduction Section */}
      <section className="text-center py-16 md:py-24 max-w-3xl mx-auto px-margin-mobile md:px-0">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-6">
          {copy["lots.headline"]}
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
        {lots.map((lot) => {
          const record = recordFor(lot);
          return (
            <article
              key={lot.name}
              className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(51,51,51,0.06)] hover:shadow-[0_8px_30px_rgb(51,51,51,0.12)] transition-shadow duration-300 group flex flex-col${lot.cardClassName ? ` ${lot.cardClassName}` : ""}`}
            >
              <div className="relative h-72 overflow-hidden">
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
                      onClick={() => record && selectLot(record)}
                    >
                      <span>Add to Cart</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
