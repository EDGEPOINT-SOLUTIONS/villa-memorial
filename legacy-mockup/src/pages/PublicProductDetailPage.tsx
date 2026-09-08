// Public product detail — one merchandise item. Reads the admin's shelf (Store)
// so price/description/image reflect the latest staff edits.

import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { money } from "../lib/catalog";
import { useCart } from "../lib/cart";
import { useToast } from "../components/toast";

export function PublicProductDetailPage() {
  const { sku = "" } = useParams();
  const { get } = useStore();
  const maybe = get(`product-${sku}`) ?? get(sku);
  const { add } = useCart();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);

  if (!maybe) return <Navigate to="/site/products" replace />;
  const product = maybe;
  const image = product.image ?? `https://picsum.photos/seed/${product.imageSeed ?? product.sku}/960/720`;

  function addToCart() {
    add(
      {
        id: product.sku,
        name: product.name,
        kindLabel: "Product",
        detail: product.blurb,
        image,
        unit: product.price,
      },
      qty,
    );
    toast(`${product.name} added to your cart.`, "success");
  }

  return (
    <div className="text-on-background">
      <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        {/* Breadcrumb */}
        <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-8">
          <Link className="hover:text-primary" to="/site/products">
            PRODUCTS
          </Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{product.name.toUpperCase()}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">
          {/* Media */}
          <div className="rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(51,51,51,0.08)]">
            <img src={image} alt={product.name} className="w-full h-full object-cover aspect-[4/3]" />
          </div>

          {/* Details */}
          <div className="lg:pl-4">
            {product.category ? (
              <span className="inline-block bg-primary-fixed text-on-primary-fixed text-label-md font-label-md px-3 py-1 rounded-full mb-4">
                {product.category}
              </span>
            ) : null}
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-4">
              {product.name}
            </h1>
            <p className="text-headline-md font-headline-md text-secondary font-semibold mb-6">
              {product.price === null ? "On arrangement" : money(product.price)}
            </p>
            <p className="text-body-lg font-body-lg text-on-surface-variant mb-6 leading-relaxed">
              {product.detail}
            </p>

            <ul className="space-y-3 mb-8">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-body-md font-body-md text-on-surface">
                  <span className="material-symbols-outlined text-primary mt-0.5" aria-hidden="true">
                    check_circle
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* Qty + actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
              <div className="inline-flex items-center border border-outline-variant rounded-lg overflow-hidden self-start">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  −
                </button>
                <span className="px-4 py-3 text-body-md font-body-md min-w-[3ch] text-center">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={addToCart}
                className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors duration-200 min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                ADD TO CART — {product.price === null ? "on arrangement" : money(product.price * qty)}
              </button>
              <Link
                to="/site/services"
                className="border-2 border-primary text-primary hover:bg-primary-fixed px-8 py-4 rounded-lg text-label-md font-label-md transition-colors duration-200 min-h-[48px] flex items-center justify-center gap-2 hover:no-underline!"
              >
                Need help arranging? Talk to us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
