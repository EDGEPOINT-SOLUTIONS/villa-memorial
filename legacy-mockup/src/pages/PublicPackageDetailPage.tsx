// Public package detail — reads the admin's shelf (Store) so package name,
// description and features reflect staff edits.

import { Link, Navigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useCart } from "../lib/cart";
import { useToast } from "../components/toast";

export function PublicPackageDetailPage() {
  const { slug = "" } = useParams();
  const { get } = useStore();
  const found = get(slug) ?? get(`package-${slug}`);
  const { add } = useCart();
  const { toast } = useToast();

  if (!found) return <Navigate to="/site/packages" replace />;
  const pkg = found;

  function addToCart() {
    add({ id: pkg.sku, name: pkg.name, kindLabel: "Funeral package", detail: pkg.blurb, unit: pkg.price });
    toast(`${pkg.name} added to your cart — our care team will confirm pricing.`, "success");
  }

  return (
    <div className="text-on-background">
      <div className="max-w-[900px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-6">
          <Link className="hover:text-primary" to="/site/packages">
            PACKAGES
          </Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{pkg.name.toUpperCase()}</span>
        </nav>

        <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant overflow-hidden">
          {pkg.accent === "gold" ? (
            <div className="bg-secondary text-on-secondary text-label-md font-label-md px-5 py-2">
              MOST POPULAR
            </div>
          ) : (
            <div className="bg-surface-container-low text-label-md font-label-md px-5 py-2 text-on-surface-variant">
              CURATED ARRANGEMENT
            </div>
          )}

          <div className="p-8 md:p-12">
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-3">
              {pkg.name}
            </h1>
            <p className="text-body-lg font-body-lg text-on-surface-variant mb-8">{pkg.blurb}</p>

            <h2 className="text-headline-sm font-headline-sm text-on-surface mb-4">What's included</h2>
            <ul className="space-y-4 mb-10">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-body-md font-body-md">
                  <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">check_circle</span>
                  <span className="text-on-surface">{f}</span>
                </li>
              ))}
            </ul>

            <div className="bg-surface-container-low rounded-xl p-6 mb-8 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-1">Pricing</p>
                <p className="text-headline-sm font-headline-sm text-secondary font-semibold">
                  {pkg.price === null ? "On arrangement" : `₱ ${pkg.price.toLocaleString()}`}
                </p>
              </div>
              <p className="text-body-md font-body-md text-on-surface-variant max-w-xs">
                Pricing depends on the casket and options chosen — our care team will confirm a
                clear total when they guide you through the arrangement.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={addToCart}
                className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                ADD TO CART
              </button>
              <Link
                to="/site/services"
                className="border-2 border-primary text-primary hover:bg-primary-fixed px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center justify-center gap-2 hover:no-underline!"
              >
                Need immediate assistance?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
