// Pixel port of stitch_villa_memorial_digital_platform/transportation_hearse_services/code.html
// Tailwind (COO Serene tokens) + Material Symbols. Content-only: rendered inside
// CooPublicShell (global header/footer/drawer). Copy/prices/images verbatim.

import { useToast } from "../components/toast";
import { useCart } from "../lib/cart";

const HEARSE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDKmC_fRK-wjM2vEVaHObTo0HV0u3t7FsBIgFZ7A-YxXDbUEDeyn5KgjY1c8FF6rHbQxwLngcMD429ZeYoOuNzQxofUjhEB3Eew_BhJCeWBm3HvMj5R6n2oYviEo7LKztLFb9muF4LUkhOgOI4HQECBzI3Mx3cjprdDl1Gf9gCKdqG0LCNgnrpumcNm70N6REQnEs4T4Rr71fv5WT8dGMVXVwzXb5H5XnKSb3Omst0Fh3hhUi2U-16Hx";
const FAMILY_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA6mtWBOlmgwGcu8i80QH7myITrXoes90Yhq5r7DQ1fiW6UnuD5RDtcw5On1SDrM8ypl5t_BIMQQ-EEHh6bADAletSpw1awKcsuU4OS5PBDFSeG_6l4KhgDOX-qI8I1wgaobi2Bz5XLdu5MJ_lKnYApFTkPg6Y7oTQMdzaWD4ZPDEBDi2vX4TNkFQvKUFk-vkEPQfOWOt91PXOTCjcr2Erk7wO8c8NDk3o2zf7mEBg_31WOjEiILAsq";

type VehicleCard = {
  id: string;
  title: string;
  desc: string;
  price: string;
  image?: string;
  /** Icon rendered centered in the h-48 media block (Escort Vehicle fallback). */
  mediaIcon?: string;
  /** Icon rendered inside a rounded-full chip at the top of the card body. */
  circleIcon?: string;
  circleIconFilled?: boolean;
  kind: "add" | "inquire";
};

const VEHICLES: VehicleCard[] = [
  {
    id: "hearse",
    title: "Funeral Hearse",
    desc: "A selection of dignified, modern hearses for the graceful conveyance of your loved one to their final resting place. Maintained to the highest standards.",
    price: "Starts at $450",
    image: HEARSE_IMG,
    kind: "add",
  },
  {
    id: "family",
    title: "Family Vehicle",
    desc: "Comfortable, spacious limousines or luxury SUVs designed to transport immediate family members together, providing privacy and support during the procession.",
    price: "Starts at $300",
    image: FAMILY_IMG,
    kind: "add",
  },
  {
    id: "escort",
    title: "Escort Vehicle",
    desc: "Professional escort services to ensure a safe, uninterrupted, and respectful procession from the service location to the memorial site.",
    price: "Starts at $150",
    mediaIcon: "directions_car",
    kind: "add",
  },
  {
    id: "long-distance",
    title: "Long-Distance Transfer",
    desc: "Careful and respectful transportation across provincial or state lines. We handle all logistics and necessary permits for extended journeys.",
    price: "Custom Quote",
    circleIcon: "map",
    circleIconFilled: true,
    kind: "inquire",
  },
  {
    id: "airport",
    title: "Airport Transfer",
    desc: "Specialized coordination for receiving or sending remains via air transit. Includes secure transport to/from the airport and liaison with cargo handlers.",
    price: "Custom Quote",
    circleIcon: "flight_land",
    circleIconFilled: true,
    kind: "inquire",
  },
];

export function CooTransportPage() {
  const { toast } = useToast();
  const { add } = useCart();

  function handleAdd(title: string, priceLabel: string) {
    // Transport prices are shown in $ on the approved mockup (flagged for dev);
    // adding the line with unit null keeps totals honest until that's decided.
    add({ id: `transport-${title}`, name: title, kindLabel: "Transportation", detail: priceLabel, unit: null });
    toast(`${title} added to your selection`, "success");
  }

  function handleInquire(title: string) {
    toast(`Inquiry sent for ${title}`, "success");
  }

  return (
    <div className="text-on-background">
      {/* Hero Section */}
      <section className="bg-surface-container-low py-16 md:py-24 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-[1200px] mx-auto text-center md:text-left">
          <p className="text-primary font-label-md text-label-md mb-4 uppercase tracking-widest">
            Dignified Transport
          </p>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-6">
            Transportation Services
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Providing dignified and seamless transportation solutions. From elegant hearses to
            comfortable family vehicles, we ensure a smooth journey for your loved ones and your
            family during this delicate time.
          </p>
        </div>
      </section>

      {/* Transportation Options Grid */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {VEHICLES.map((v) => (
              <article
                key={v.id}
                className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-[0_10px_40px_-10px_rgba(51,51,51,0.08)] transition-all duration-300 flex flex-col h-full border border-surface-variant hover:border-primary-fixed hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,101,141,0.1)]"
              >
                {v.image ? (
                  <div className="h-48 w-full bg-surface-container-high overflow-hidden">
                    <img className="w-full h-full object-cover" src={v.image} alt="" />
                  </div>
                ) : v.mediaIcon ? (
                  <div className="h-48 w-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl opacity-50">
                      {v.mediaIcon}
                    </span>
                  </div>
                ) : null}

                <div className="p-6 flex flex-col flex-grow">
                  {v.circleIcon ? (
                    <div className="bg-primary-fixed/20 text-primary w-12 h-12 rounded-full flex items-center justify-center mb-4">
                      <span
                        className="material-symbols-outlined"
                        style={
                          v.circleIconFilled
                            ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                            : undefined
                        }
                      >
                        {v.circleIcon}
                      </span>
                    </div>
                  ) : null}

                  <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                    {v.title}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant flex-grow mb-6">
                    {v.desc}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-surface-variant">
                    <span className="font-label-md text-label-md text-primary">{v.price}</span>
                    {v.kind === "add" ? (
                      <button
                        type="button"
                        onClick={() => handleAdd(v.title, v.price)}
                        className="bg-primary-container text-on-primary-container px-4 py-2 rounded hover:bg-primary hover:text-on-primary transition-colors font-label-md text-label-md flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                        Add
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInquire(v.title)}
                        className="border border-primary text-primary px-4 py-2 rounded hover:bg-primary hover:text-on-primary transition-colors font-label-md text-label-md flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        Inquire
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
