// Public lot detail + reservation — a single memorial lot product with features,
// price, and a "reserve" action that adds it to the cart. Content mirrors the
// CooLotsPage card.

import { Link, Navigate, useParams } from "react-router-dom";
import { PUBLIC_LOTS, publicLotBySlug } from "../lib/publicCatalog";
import { useCart } from "../lib/cart";
import { useToast } from "../components/toast";

export function PublicLotDetailPage() {
  const { slug = "" } = useParams();
  const found = publicLotBySlug(slug);
  const { add } = useCart();
  const { toast } = useToast();

  if (!found) return <Navigate to="/site/lots" replace />;
  const lot = found;

  function reserve() {
    add({
      id: `lot-${lot.slug}`,
      name: lot.name,
      kindLabel: "Memorial lot",
      detail: `Reservation · ${lot.chip ?? "Sanctuario Memorial Park"}`,
      unit: lot.price,
    });
    toast(`${lot.name} added to your cart to complete your reservation.`, "success");
  }

  return (
    <div className="text-on-background">
      <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-8">
          <Link className="hover:text-primary" to="/site/lots">
            LOTS
          </Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{lot.name.toUpperCase()}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">
          <div className="relative rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(51,51,51,0.08)]">
            <img className="w-full h-full object-cover aspect-[4/3]" src={lot.imgSrc} alt={lot.imgAlt} />
            {lot.chip ? (
              <span className="absolute top-4 left-4 bg-primary-container/90 backdrop-blur-sm text-on-primary-container px-3 py-1 rounded-full text-label-md font-label-md shadow-sm">
                {lot.chip}
              </span>
            ) : null}
          </div>

          <div className="lg:pl-4">
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-3">
              {lot.name}
            </h1>
            <p className="text-body-lg font-body-lg text-on-surface-variant mb-6">{lot.desc}</p>

            <ul className="space-y-3 mb-8">
              {lot.features.map((f) => (
                <li key={f.label} className="flex items-center text-body-md font-body-md text-on-surface">
                  <span className="material-symbols-outlined text-primary mr-3" aria-hidden="true">{f.icon}</span>
                  {f.label}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between pt-6 border-t border-outline-variant mb-8">
              <div>
                <p className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider block mb-1">
                  Starting Price
                </p>
                <p className="text-headline-md font-headline-md text-primary font-semibold">{lot.priceLabel}</p>
              </div>
            </div>

            <p className="text-body-md font-body-md text-on-surface-variant mb-6">
              Reserve this lot today — your cart holds it while our care team contacts you to
              finalize the reservation and payment plan.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={reserve}
                className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">reserve</span>
                RESERVE THIS LOT
              </button>
              <Link
                to="/site/map"
                className="border-2 border-primary text-primary hover:bg-primary-fixed px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[48px] flex items-center justify-center gap-2 hover:no-underline!"
              >
                <span className="material-symbols-outlined text-[20px]">map</span>
                View on the park map
              </Link>
            </div>
          </div>
        </div>

        {/* Other lots */}
        <div className="mt-16">
          <h2 className="text-headline-md font-headline-md text-primary mb-6">Explore other lots</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {PUBLIC_LOTS.filter((l) => l.slug !== lot.slug).map((l) => (
              <Link
                key={l.slug}
                to={`/site/lots/${l.slug}`}
                className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(51,51,51,0.06)] hover:shadow-[0_8px_30px_rgb(51,51,51,0.12)] transition-shadow border border-surface-variant hover:no-underline!"
              >
                <img className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-500" src={l.imgSrc} alt={l.imgAlt} />
                <div className="p-5">
                  <h3 className="text-headline-sm font-headline-sm text-primary mb-1">{l.name}</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant">{l.priceLabel}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
