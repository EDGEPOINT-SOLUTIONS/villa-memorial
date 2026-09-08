// Port of stitch_villa_memorial_digital_platform/death_occurred_at_home_service_details/code.html
// Pixel-exact reproduction of the COO's static mockup (Serene Legacy palette).
// Rendered inside the global public shell (nav/footer/chat/menu live there);
// this page renders CONTENT ONLY. Demo actions fire toasts.

import { Link } from "react-router-dom";
import { useToast } from "../components/toast";

const SERVICES = [
  {
    icon: "directions_car",
    name: "Dignified Home Pickup",
    description:
      "Our professional transfer team arrives discreetly in an unmarked vehicle to bring your loved one into our care, ensuring a respectful and gentle transition from the home.",
    price: "₱ 8,500",
  },
  {
    icon: "spa",
    name: "Embalming & Grooming",
    description:
      "Expert preparation, dressing, and gentle cosmetizing specifically suited for home viewings, allowing family and friends to say goodbye in a peaceful, natural state.",
    price: "₱ 18,000",
  },
  {
    icon: "chair",
    name: "Home Viewing Setup",
    description:
      "Complete rental and arrangement of necessary equipment for a comfortable home vigil, including supportive seating, appropriate lighting, and elegant drapery or small tents if requested.",
    price: "₱ 12,000",
  },
];

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD-2pdQB8_JJwa4PyFmFnaXGjpHh2QOBArdzpYTz1T5u_6DLG31M5iwtaFo4GQQ1vHtfD99-R2BnMiCBefprNROIMeHwn62umXA1RiF6l-51EoTT52fwFYlqmjd0ZKWgU3MzTUTzA7rcLIwAdPVrgND20LGv5CuzjWtgndi6vqnPEycAI5Vc6r45kTQs-USjZdEKmoE30R2fBW8Yo0jON4-QEnsH9TlW4Zs0lWgqHnqANNdlF1wCENJ";

const HERO_ALT =
  "A serene and sunlit living room featuring soft, neutral-colored furniture and sheer white curtains gently blowing in a breeze. The atmosphere is peaceful and comforting, illuminated by high-key, warm natural light. The aesthetic is Luminous Comfort, with a sophisticated palette of off-whites, gentle warm greys, and subtle touches of soft sky blue, evoking hope, dignity, and quiet support.";

export function CooDeathHomePage() {
  const { toast } = useToast();

  return (
    <div className="bg-background text-on-background font-body-md text-body-md antialiased">
        {/* Hero Section */}
        <section className="relative pt-section-gap pb-16 px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto flex flex-col md:flex-row items-center gap-gutter">
          <div className="md:w-1/2 space-y-6">
            <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-4">
              <Link className="hover:text-primary" to="/site/services">
                SERVICES
              </Link>
              <span className="mx-2">/</span>
              <span className="text-primary">DEATH AT HOME</span>
            </nav>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary">
              Compassionate Care When Death Occurs at Home
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              Losing a loved one in the comfort of their own home is a deeply personal experience.
              Our dedicated team is here to provide gentle, dignified support, guiding you through
              the necessary steps with care and respect, ensuring peace of mind during this
              difficult transition.
            </p>
            <div className="flex gap-4 pt-4">
              <button
                className="bg-primary text-on-primary px-8 py-4 rounded-full font-label-md text-label-md uppercase tracking-wider hover:bg-primary-fixed-dim hover:text-[#001e2d] transition-colors flex items-center gap-2 cursor-pointer"
                onClick={() =>
                  toast("24/7 emergency care line requested — a coordinator will call you shortly.", "success")
                }
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  phone
                </span>
                Emergency Contact
              </button>
            </div>
          </div>
          <div className="md:w-1/2 w-full">
            <div className="rounded-xl overflow-hidden shadow-[0_4px_40px_rgba(51,51,51,0.06)] h-[400px]">
              <img className="w-full h-full object-cover" src={HERO_IMG} alt={HERO_ALT} />
            </div>
          </div>
        </section>

        {/* Services Grid Section */}
        <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-headline-md text-headline-md text-primary mb-4">
                Essential Services for Home Passings
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
                We offer a comprehensive suite of services tailored to families who choose to honor
                their loved ones at home. Select the services you need, and we will handle the rest
                with the utmost sensitivity.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {SERVICES.map((s) => (
                <div
                  key={s.name}
                  className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_4px_40px_rgba(51,51,51,0.06)] flex flex-col h-full border border-surface-variant hover:border-primary-fixed transition-colors duration-300 group"
                >
                  <div className="bg-primary-fixed w-12 h-12 rounded-full flex items-center justify-center mb-6 text-[#001e2d] group-hover:scale-110 transition-transform">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      {s.icon}
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-3">{s.name}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant flex-grow mb-6">
                    {s.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-label-md text-label-md text-primary">{s.price}</span>
                    <button
                      className="border border-outline-variant text-primary px-4 py-2 rounded hover:bg-primary-fixed hover:border-primary-fixed transition-colors font-label-md text-label-md uppercase cursor-pointer"
                      onClick={() => toast(`${s.name} added to your plan`, "success")}
                    >
                      Add to Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
    </div>
  );
}
