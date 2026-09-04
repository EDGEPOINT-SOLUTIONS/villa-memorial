// Port of stitch_villa_memorial_digital_platform/death_occurred_at_hospital_service_details/code.html
// Pixel-exact reproduction of the COO's static mockup (Serene Legacy palette).
// Rendered inside the global public shell (CooPublicShell) — this file carries
// ONLY the page content: hero, steps, services. Demo actions fire toasts.

import { useToast } from "../components/toast";

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCumJcEH6axvM_6XWqKkleFnDQdf6k9T6jwgrEuDiSTZ_anvzR8s7okYuhE2_pp_c0hDXqJrCJYvULUjotDVQSPoFwxCqXtj5YTuExdAlLihY6YIkzgKGJSCAaMN5ei1ObghbaIA5KrvQmq2epNg8V5mpYuI3FgXilbwbP5ylDBGGho3H1MrFuXzXpZQLhMY1HQi98muR7Ux1_EFOpQXVcD818f9lopzpkF2N0bM_iHhEHfS8ymj4p4";

const STEPS = [
  {
    number: "1",
    title: "Release Clearance",
    description:
      "The attending physician must officially pronounce the passing and issue the necessary medical clearances before the hospital can release your loved one into our care.",
  },
  {
    number: "2",
    title: "Documentation",
    description:
      "Our liaison team coordinates directly with the hospital's records department and the local civil registrar to secure the Death Certificate smoothly and efficiently.",
  },
  {
    number: "3",
    title: "Transfer of Care",
    description:
      "Once cleared, our specialized retrieval team conducts a dignified transfer from the hospital facility to our preparation center, ensuring utmost respect.",
  },
];

const SERVICES = [
  {
    badge: "Essential",
    name: "Hospital Retrieval Service",
    description:
      "Professional, respectful transfer of your loved one from the hospital to our preparation facilities. Includes specialized transport and trained personnel.",
    price: "₱15,000",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDI9yhZtIzmX2oTJVABYa5MuHhlNPTfVxGzzg9l1zFznLGm4IvGO5PrS9dQvTD64eoODGM6edePq2XK5HE4dOs9J0tUulYVwwgS3_azUZWLEUZ3zIfxPCcwSQfqJo5AJfPtyaJ7NeUj-z7N7CFiesJsc8HHebEpQgJJ_HU_177n1fy37jm21ButN0_gR-2yDxwhs64bQVRyoFYn-mA4siED0xM2XSt7GWOH3MPhqSZpzDQIe9URmJWZ",
    alt: "A pristine, modern specialized transport vehicle designed for dignified care, parked quietly in a serene environment. The scene is bright and comforting, reinforcing the luminous comfort design language.",
  },
  {
    badge: "Administrative",
    name: "Documentation Assistance",
    description:
      "Full coordination with hospital administration and local civil registry to process and secure the official Death Certificate and necessary permits.",
    price: "₱5,000",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFqs59ZPm_Tohf2TM78zN7giFGqhAYcdomuA_T5lr8EWdI_hRHJGMZkB7mKFfgHup5cFcmD8zbs0DjxvtYuOSDh6H8NhIgWQrEJm6SijWEIWNvQVyeD4zNPF0n9P1sJtBk60FlAg1daAF5xpPZtewcGm5cOQRSvJT7GOtIMbEu05pB-3Y4Dv8Y204Do3ZWhpeysS0J6mdlYx-fVfeQTSs-JHnJLecBqq7rHj9ANQbyhPJxlG4Jsas8",
    alt: "Close up of a neat stack of official documents resting on a clean, white marble desk. Soft natural light filters in, creating a calm, administrative atmosphere that feels organized and supportive.",
  },
  {
    badge: "Care",
    name: "Standard Body Preparation",
    description:
      "Dignified washing, dressing, and basic cosmetic preparation by our licensed professionals, ensuring a peaceful presentation for viewing.",
    price: "₱25,000",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB0_VPZzenOzGomTvehSY2mL0wt-iAag8nZtgSNC6soPXXEtNIqK-31hzLkoXXc1FJ7bUEVkD_5i90LbgwVkHu4BgXqwMDdzf9IlH7sDwsQzG4oHeQOUSyfIzxHHD0LI5ipmppxaeCz1aNDg8bZHCXZVv94Eijw1CqYVSSraBnR6fgRL0hwKa_Qa15Ey3r-_TWRLgaozD17Tqb14_J0WnGtF9OVRKJS8-b2Kts9nd8anKAcVcjx9fiP",
    alt: "A gentle, abstract representation of care and preparation, featuring soft white fabrics and warm ambient lighting. The mood is highly respectful, clean, and peaceful, aligning with luminous comfort.",
  },
];

export function CooDeathHospitalPage() {
  const { toast } = useToast();

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative w-full py-section-gap px-margin-mobile md:px-margin-desktop overflow-hidden bg-surface-container-low flex flex-col items-center justify-center text-center min-h-[512px]">
        <div
          className="absolute inset-0 opacity-40 z-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `url('${HERO_IMG}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>
        <div
          className="relative z-10 max-w-3xl mx-auto p-8 md:p-12 rounded-xl"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "0 8px 32px 0 rgba(51, 51, 51, 0.04)",
          }}
        >
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-6">
            Death Occurred at a Hospital
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto">
            When a loved one passes away in a hospital setting, navigating the immediate next
            steps can feel overwhelming. We are here to guide you gently through the process,
            providing clarity, support, and professional care at every moment.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              className="px-8 py-4 bg-secondary text-on-secondary rounded font-label-md text-label-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              onClick={() =>
                toast(
                  "Request received — our care team will contact you immediately.",
                  "success",
                )
              }
            >
              REQUEST IMMEDIATE ASSISTANCE
            </button>
          </div>
        </div>
      </section>

      {/* Step-by-Step Guide (Bento Grid Style) */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-headline-md text-headline-md text-primary mb-4">
            Immediate Steps &amp; Guidance
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Understanding the essential administrative and logistical steps helps ensure a smooth
            and dignified transition.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="bg-surface-container-lowest rounded-xl p-8 shadow-soft-shadow hover:shadow-md transition-shadow duration-300 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-primary opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-headline-sm text-headline-sm">
                  {step.number}
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {step.title}
                </h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Essential Services Catalog */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop bg-surface-container-low">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 flex flex-col md:flex-row justify-between items-end">
            <div className="max-w-2xl">
              <h2 className="font-headline-md text-headline-md text-primary mb-4">
                Immediate Required Services
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Select the necessary services to initiate our care. We transparently outline
                costs to provide peace of mind during this critical time.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {SERVICES.map((service) => (
              <div
                key={service.name}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-soft-shadow flex flex-col md:flex-row gap-6 items-center justify-between group hover:border-primary-fixed border border-transparent transition-colors"
              >
                <div className="flex-shrink-0 w-full md:w-48 h-32 rounded-lg overflow-hidden">
                  <img
                    className="w-full h-full object-cover"
                    src={service.img}
                    alt={service.alt}
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-primary-fixed text-primary px-3 py-1 rounded-full font-label-md text-[12px]">
                      {service.badge}
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {service.name}
                    </h3>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4 md:mb-0 max-w-xl">
                    {service.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-4 min-w-[150px]">
                  <span className="font-headline-sm text-headline-sm text-primary">
                    {service.price}
                  </span>
                  <button
                    className="w-full px-6 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-on-primary rounded font-label-md text-label-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() =>
                      toast(`${service.name} (${service.price}) added to your plan`, "success")
                    }
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      aria-hidden="true"
                    >
                      add_shopping_cart
                    </span>
                    Select Service
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-end">
            <button
              className="px-8 py-4 bg-secondary text-on-secondary rounded font-label-md text-label-md hover:shadow-lg transition-all duration-300 flex items-center gap-3 cursor-pointer"
              onClick={() =>
                toast("Proceeding to review — your selected services will be summarized next.", "success")
              }
            >
              PROCEED TO REVIEW
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
