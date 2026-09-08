// Port of stitch_villa_memorial_digital_platform/funeral_wake_packages_catalog/code.html
// Bento layout stays as approved; each package card reads the admin's shelf
// (Store) — name, tagline, included features and the "popular" highlight all
// update when staff edit the store.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { type CatalogRecord } from "../lib/catalog";

function PackageCard({ pkg, popular }: { pkg: CatalogRecord; popular: boolean }) {
  const cardClass = popular
    ? "bg-surface-container-lowest rounded-lg p-8 shadow-ambient-soft border-2 border-primary-container flex flex-col h-full relative overflow-hidden transform md:-translate-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_0_rgba(51,51,51,0.08)]"
    : "bg-surface-container-lowest rounded-lg p-8 shadow-ambient-soft border border-surface-variant flex flex-col h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary-container hover:shadow-[0_8px_40px_0_rgba(51,51,51,0.08)]";
  const checkColor = popular ? "text-secondary" : "text-primary-container";
  return (
    <div className={cardClass}>
      {popular ? (
        <div className="absolute top-0 right-0 bg-primary-container text-on-primary px-4 py-1 rounded-bl-lg font-label-md text-label-md text-xs">
          POPULAR
        </div>
      ) : (
        <div className="absolute top-0 left-0 w-full h-2 bg-outline-variant" aria-hidden="true" />
      )}
      <h2 className="font-headline-md text-headline-md text-primary mb-2">{pkg.name}</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-6 pb-6 border-b border-surface-variant grow">
        {pkg.blurb}
      </p>
      <ul className="space-y-4 mb-8 font-body-md text-body-md text-on-surface">
        {pkg.features.map((f) => (
          <li key={f} className="flex items-start">
            <span
              className={`material-symbols-outlined ${checkColor} mr-3`}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              check_circle
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <Link
          to={`/site/packages/${pkg.sku}`}
          className={`block w-full text-center rounded-DEFAULT px-6 py-3 font-label-md text-label-md transition-colors min-h-[48px] hover:no-underline! ${
            popular
              ? "bg-secondary text-on-secondary hover:bg-on-secondary-container"
              : "border-2 border-primary-container text-primary-container hover:bg-primary-container hover:text-on-primary"
          }`}
        >
          View {pkg.name}
        </Link>
      </div>
    </div>
  );
}

const DISPLAY_ORDER = ["package-a", "package-b", "package-c"];

export function CooPackagesPage() {
  const { byKind } = useStore();
  const packages = useMemo(() => byKind("Package", { activeOnly: true }), [byKind]);
  const display = useMemo(() => {
    const map = new Map(packages.map((p) => [p.sku, p]));
    return DISPLAY_ORDER.map((sku) => map.get(sku)).filter((p): p is CatalogRecord => Boolean(p));
  }, [packages]);

  return (
    <>
      {/* Hero Section */}
      <section className="px-margin-mobile md:px-margin-desktop py-12 md:py-24 max-w-[1200px] mx-auto text-center">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary mb-6">
          Funeral Packages
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Carefully curated bundles to provide peace of mind during difficult times. Choose a
          comprehensive package or build a custom arrangement that honors your loved one's unique
          journey.
        </p>
      </section>

      {/* Packages Bento Grid */}
      <section className="px-margin-mobile md:px-margin-desktop pb-section-gap max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {display.map((pkg) => (
            <PackageCard key={pkg.sku} pkg={pkg} popular={pkg.accent === "gold"} />
          ))}
        </div>
      </section>
    </>
  );
}
