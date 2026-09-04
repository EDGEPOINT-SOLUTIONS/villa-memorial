// Port of stitch_villa_memorial_digital_platform/funeral_wake_packages_catalog/code.html
// Content-only page body. Global chrome (header/nav/footer/drawer/chat) is
// provided by CooPublicShell so every public page feels consistent.

import { Link } from "react-router-dom";
import { useToast } from "../components/toast";
import { useCart } from "../lib/cart";

export function CooPackagesPage() {
  const { toast } = useToast();
  const { add } = useCart();

  function handleSelect(slug: string, name: string) {
    add({ id: `package-${slug}`, name, kindLabel: "Funeral package", unit: null });
    toast(`${name} added to your cart — our care team will guide you through the arrangement`, "success");
  }

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
          {/* Package A */}
          <div className="bg-surface-container-lowest rounded-lg p-8 shadow-ambient-soft border border-surface-variant flex flex-col h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary-container hover:shadow-[0_8px_40px_0_rgba(51,51,51,0.08)]">
            <div className="absolute top-0 left-0 w-full h-2 bg-outline-variant" aria-hidden="true" />
            <h2 className="font-headline-md text-headline-md text-primary mb-2">Package A</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 pb-6 border-b border-surface-variant grow">
              Simple and dignified essentials.
            </p>
            <ul className="space-y-4 mb-8 font-body-md text-body-md text-on-surface">
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Standard Metal Casket
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Retrieval within 25 miles
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Basic Preparation
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                1-Day Chapel Viewing
              </li>
              <li className="flex items-start text-outline">
                <span className="material-symbols-outlined mr-3" aria-hidden="true">
                  cancel
                </span>
                Premium Hearse (Standard included)
              </li>
            </ul>
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => handleSelect("package-a", "Package A")}
                className="w-full border-2 border-primary-container text-primary-container hover:bg-primary-container hover:text-on-primary rounded-DEFAULT px-6 py-3 font-label-md text-label-md transition-colors min-h-[48px]"
              >
                Select Package A
              </button>
              <Link
                to="/site/packages/package-a"
                className="block text-center text-label-md font-label-md text-on-surface-variant hover:text-primary mt-2 hover:no-underline!"
              >
                View details
              </Link>
            </div>
          </div>

          {/* Package B (Highlighted) */}
          <div className="bg-surface-container-lowest rounded-lg p-8 shadow-ambient-soft border-2 border-primary-container flex flex-col h-full relative overflow-hidden transform md:-translate-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_0_rgba(51,51,51,0.08)]">
            <div className="absolute top-0 right-0 bg-primary-container text-on-primary px-4 py-1 rounded-bl-lg font-label-md text-label-md text-xs">
              POPULAR
            </div>
            <h2 className="font-headline-md text-headline-md text-primary mb-2">Package B</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 pb-6 border-b border-surface-variant grow">
              Standard comprehensive arrangement.
            </p>
            <ul className="space-y-4 mb-8 font-body-md text-body-md text-on-surface">
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Solid Wood Casket
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Retrieval within 50 miles
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Full Preparation &amp; Dressing
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                3-Day Chapel Viewing
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-primary-container mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Premium Hearse
              </li>
            </ul>
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => handleSelect("package-b", "Package B")}
                className="w-full bg-secondary text-on-secondary hover:bg-on-secondary-container rounded-DEFAULT px-6 py-3 font-label-md text-label-md transition-colors min-h-[48px]"
              >
                Select Package B
              </button>
              <Link
                to="/site/packages/package-b"
                className="block text-center text-label-md font-label-md text-on-surface-variant hover:text-primary mt-2 hover:no-underline!"
              >
                View details
              </Link>
            </div>
          </div>

          {/* Package C */}
          <div className="bg-surface-container-lowest rounded-lg p-8 shadow-ambient-soft border border-surface-variant flex flex-col h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary-container hover:shadow-[0_8px_40px_0_rgba(51,51,51,0.08)]">
            <div className="absolute top-0 left-0 w-full h-2 bg-secondary" aria-hidden="true" />
            <h2 className="font-headline-md text-headline-md text-primary mb-2">Package C</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 pb-6 border-b border-surface-variant grow">
              Premium bespoke tribute.
            </p>
            <ul className="space-y-4 mb-8 font-body-md text-body-md text-on-surface">
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-secondary mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Premium Bronze/Copper Casket
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-secondary mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Nationwide Retrieval Assistance
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-secondary mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Premium Preparation &amp; Styling
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-secondary mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                5-Day Premium Suite Viewing
              </li>
              <li className="flex items-start">
                <span
                  className="material-symbols-outlined text-secondary mr-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                Luxury Hearse &amp; Family Fleet (2 cars)
              </li>
            </ul>
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => handleSelect("package-c", "Package C")}
                className="w-full border-2 border-primary-container text-primary-container hover:bg-primary-container hover:text-on-primary rounded-DEFAULT px-6 py-3 font-label-md text-label-md transition-colors min-h-[48px]"
              >
                Select Package C
              </button>
              <Link
                to="/site/packages/package-c"
                className="block text-center text-label-md font-label-md text-on-surface-variant hover:text-primary mt-2 hover:no-underline!"
              >
                View details
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
