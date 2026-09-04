// ============================================================================
// PublicProductsPage — public merchandise catalog (caskets, urns, flowers,
// markers, keepsakes) for the connected buy journey. Content-only, rendered
// inside CooPublicShell. Prices are demo values (see src/lib/shop.ts header).
// ============================================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS, PRODUCT_CATEGORIES, money, type ProductCategory } from "../lib/shop";
import { useCart } from "../lib/cart";
import { useToast } from "../components/toast";

type Filter = "All" | ProductCategory;

const FILTERS: Filter[] = ["All", ...PRODUCT_CATEGORIES];

const CATEGORY_CHIP: Record<ProductCategory, string> = {
  Caskets: "bg-primary-fixed text-on-primary-fixed",
  Urns: "bg-secondary-fixed text-on-secondary-fixed",
  Flowers: "bg-emerald-100 text-emerald-800",
  "Memorial markers": "bg-surface-container-high text-on-surface",
  Keepsakes: "bg-amber-100 text-amber-700",
};

export function PublicProductsPage() {
  const { toast } = useToast();
  const { add } = useCart();
  const [filter, setFilter] = useState<Filter>("All");

  const visible = useMemo(
    () => (filter === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter)),
    [filter],
  );

  function quickAdd(id: string, name: string) {
    const product = PRODUCTS.find((p) => p.id === id);
    add({ id: `prod-${id}`, name, kindLabel: "Product", unit: product?.price ?? null });
    toast(`${name} added to your cart.`, "success");
  }

  return (
    <div className="text-on-background">
      {/* Hero */}
      <section className="text-center py-16 md:py-20 max-w-3xl mx-auto px-margin-mobile md:px-0">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-6">
          Memorial Products &amp; Keepsakes
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant">
          Thoughtfully selected caskets, urns, floral tributes, markers, and keepsakes —
          each chosen to honor a life with dignity and grace. Every item can be added to your
          cart or arranged with our care team.
        </p>
      </section>

      {/* Category filter chips */}
      <section className="px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto mb-10">
        <div className="flex flex-wrap gap-2 justify-center">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer border ${
                filter === f
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Product grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter px-margin-mobile md:px-margin-desktop pb-section-gap max-w-[1200px] mx-auto w-full">
        {visible.map((p) => (
          <article
            key={p.id}
            className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(51,51,51,0.06)] hover:shadow-[0_8px_30px_rgb(51,51,51,0.12)] transition-shadow duration-300 group flex flex-col border border-surface-variant"
          >
            <Link to={`/site/products/${p.id}`} className="block relative h-56 overflow-hidden hover:no-underline!">
              <img
                src={`https://picsum.photos/seed/${p.imageSeed}/640/448`}
                alt={p.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-label-md font-label-md shadow-sm ${CATEGORY_CHIP[p.category]}`}
              >
                {p.category}
              </span>
            </Link>
            <div className="p-6 flex-1 flex flex-col">
              <h2 className="text-headline-sm font-headline-sm text-primary mb-2">
                <Link to={`/site/products/${p.id}`} className="hover:no-underline!">
                  {p.name}
                </Link>
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant mb-5 flex-1">
                {p.blurb}
              </p>
              <div className="flex items-center justify-between mt-auto pt-5 border-t border-outline-variant">
                <span className="text-headline-sm font-headline-sm text-on-surface font-semibold">
                  {money(p.price)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => quickAdd(p.id, p.name)}
                    className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-4 py-2 rounded-lg text-label-md font-label-md transition-colors duration-200 min-h-[44px] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                    Add
                  </button>
                  <Link
                    to={`/site/products/${p.id}`}
                    className="border border-primary-container text-primary hover:bg-primary-fixed px-4 py-2 rounded-lg text-label-md font-label-md transition-colors duration-200 min-h-[44px] flex items-center gap-2 hover:no-underline!"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {visible.length === 0 ? (
        <p className="text-center text-on-surface-variant pb-section-gap">No products in this category yet.</p>
      ) : null}
    </div>
  );
}
