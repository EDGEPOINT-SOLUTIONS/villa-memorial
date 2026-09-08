// Pixel port of stitch_villa_memorial_digital_platform/memorial_plans_with_new_hero_image/code.html
// into the ui-ux-demo React app. WIP variant: the two EMPTY stub <article> plan cards at the
// top render nothing, so they are omitted; the hero text container is empty in the source, so
// only the image + black/20 overlay are kept. Everything actually rendered is reproduced
// verbatim: copy, exact COO Serene token colors, rate tables, images.
// Rendered INSIDE the global CooPublicShell (fixed header, footer, drawer, chat).

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD1r1DyzxSvPNBeXL4jlsHc2om0oNQ_ifOcV3HseINbe9zTej2xZAxckMNo9t3nSZWDcQLJJ7SBYFMEKWukdvpAOSxRRyU4hvmSZvTVoBINP8kTGLO6RgmXqwqRr2uPvOv42YekpFrGVaAXyzMn8-dmpdpC1w3xo-mcGV4sDzqwfOkKlRDqEWV19Hd7_SBhFuU7nUA01d8z_610P6eC7FC8Exfi6PjhMukhyPe5ys-4xVfgIfAFOPy13fDla6ZF3VSdbg";

// Real uploaded photo (mirrored from the production web app's uploads).
const GOLD_CASKET_IMG = "/media/gold-casket.jpg";

type RateRow = { label: string; value: string };

function rates(annual: string, semiAnnual: string, quarterly: string, monthly: string): RateRow[] {
  return [
    { label: "Annual:", value: annual },
    { label: "Semi-Annual:", value: semiAnnual },
    { label: "Quarterly:", value: quarterly },
    { label: "Monthly:", value: monthly },
  ];
}

type RateColumnProps = {
  rows: RateRow[];
  heading?: string;
  senior?: boolean;
  gold?: boolean;
};

function RateColumn({ rows, heading, senior, gold }: RateColumnProps) {
  const boxClassName = senior
    ? gold
      ? "bg-secondary-fixed-dim p-3 rounded border border-secondary bg-opacity-20"
      : "bg-surface-container p-3 rounded border border-secondary"
    : "bg-surface-container p-3 rounded";
  const divider = Boolean(gold);
  return (
    <div className={boxClassName}>
      {heading ? (
        <span
          className={`text-label-md font-label-md block ${
            senior ? "text-secondary" : "text-on-surface-variant"
          } ${gold ? "mb-2" : "mb-1"}`}
        >
          {heading}
        </span>
      ) : null}
      <ul
        className={
          gold
            ? "text-body-md font-body-md text-on-surface space-y-2"
            : "text-body-md font-body-md text-on-surface text-sm space-y-1"
        }
      >
        {rows.map((r, i) => {
          const last = i === rows.length - 1;
          return (
            <li
              key={r.label}
              className={`flex justify-between${
                divider && !last ? " border-b border-surface-variant pb-1" : ""
              }`}
            >
              <span>{r.label}</span>
              <strong>{r.value}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type SubPlan = {
  name: string;
  desc: string;
  standardHeading?: string;
  seniorHeading?: string;
  standard: RateRow[];
  senior: RateRow[];
};

function SubPlanBlock({ sub, first }: { sub: SubPlan; first: boolean }) {
  return (
    <div className={first ? "border-b border-surface-variant pb-6" : undefined}>
      <h4 className="text-headline-sm font-headline-sm text-primary mb-2">{sub.name}</h4>
      <p className="text-body-md font-body-md text-on-surface-variant mb-4 italic text-sm">{sub.desc}</p>
      <div className={`grid grid-cols-2 gap-4${sub.standardHeading ? " mb-4" : ""}`}>
        <RateColumn rows={sub.standard} heading={sub.standardHeading} />
        <RateColumn rows={sub.senior} heading={sub.seniorHeading} senior />
      </div>
    </div>
  );
}

type Tier = {
  headerLabel: string;
  headerBg: string;
  headerText: string;
  subs: SubPlan[];
};

const TIERS: Tier[] = [
  {
    headerLabel: "Bronze Packages",
    headerBg: "bg-primary-container",
    headerText: "text-on-primary",
    subs: [
      {
        name: "Bronze 1",
        desc: "Wooden/ Metal coffin with smooth finish, elegant handles and beautiful interiors. Comes with half-glass lid.",
        standardHeading: "Standard Rates",
        seniorHeading: "Senior Rates*",
        standard: rates("7,200", "3,600", "1,800", "600"),
        senior: rates("6,600", "3,300", "1,650", "550"),
      },
      {
        name: "Bronze 2",
        desc: "Wooden/ Metal coffin with smooth finish, elegant handles and beautiful interiors. Comes with full glass lid.",
        standard: rates("9,240", "4,620", "2,310", "770"),
        senior: rates("8,400", "4,200", "2,100", "700"),
      },
    ],
  },
  {
    headerLabel: "Silver Packages",
    headerBg: "bg-outline",
    headerText: "text-on-primary",
    subs: [
      {
        name: "Silver 1",
        desc: "Wooden/ Metal coffin with smooth finish, classy handles and beautiful interiors. Comes with half-glass lid. This is slightly bigger than Bronze and more elegant.",
        standardHeading: "Standard Rates",
        seniorHeading: "Senior Rates*",
        standard: rates("12,000", "6,000", "3,000", "1,000"),
        senior: rates("11,400", "5,700", "2,850", "950"),
      },
      {
        name: "Silver 2",
        desc: "Wooden/ Metal coffin with smooth finish, classy handles and beautiful interiors. Comes with full glass lid. Slightly bigger and more elegant. Cover convertible to full-glass or half-glass.",
        standard: rates("13,440", "6,720", "3,360", "1,120"),
        senior: rates("13,200", "6,600", "3,300", "1,100"),
      },
    ],
  },
];

const FEATURES: { icon: string; label: string; desc: string }[] = [
  {
    icon: "local_shipping",
    label: "Retrieval & Delivery",
    desc: "Retrieval of the deceased to the morgue and delivery of the same in casket. Good for the first 25 kms only.",
  },
  {
    icon: "cleaning_services",
    label: "Preparation & Casketting",
    desc: "7 days embalming with make up and dressing up.",
  },
  {
    icon: "lightbulb",
    label: "Viewing Equipment",
    desc: "State-of-the-Art and classy equipment which includes lights, curtains and carpets.",
  },
  {
    icon: "directions_car",
    label: "Interment",
    desc: "Several cars will be ready to bring the deceased to its final destination.",
  },
  {
    icon: "local_florist",
    label: "Free Flowers & Tarpaulin",
    desc: "Complimentary floral arrangements and memorial tarpaulin.",
  },
];

export function CooPlansSeniorPage() {
  return (
    <div className="w-full">
      {/* Main Content */}
      <div className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto w-full">
        {/* Hero — image only with black/20 overlay (text container empty in source) */}
        <section className="relative w-full h-[500px] md:h-[600px] overflow-hidden rounded-xl mb-section-gap">
          <img alt="Memorial Hero" className="absolute inset-0 w-full h-full object-cover" src={HERO_IMG} />
          <div className="absolute inset-0 bg-black bg-opacity-20 flex flex-col justify-center px-margin-mobile md:px-margin-desktop">
            <div className="max-w-2xl" />
          </div>
        </section>

        {/* Pre-Need Memorial Packages Section */}
        <section className="mb-section-gap">
          <div className="text-center mb-12">
            <h2 className="text-headline-lg-mobile md:text-headline-md font-headline-lg-mobile md:font-headline-md text-primary mb-4">
              Our Pre-Need Memorial Packages
            </h2>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl mx-auto">
              Choose a plan that best suits your family&apos;s needs. All plans include comprehensive
              memorial services.
            </p>
          </div>

          {/* Features Overview */}
          <div className="bg-surface-container-low rounded-xl p-8 mb-12 shadow-sm">
            <h3 className="text-headline-sm font-headline-sm text-primary mb-6 text-center border-b border-outline-variant pb-4">
              Included Services in All Packages
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex flex-col items-center text-center">
                  <span className="material-symbols-outlined text-secondary text-[32px] mb-3">{f.icon}</span>
                  <h4 className="text-label-md font-label-md text-on-surface mb-2">{f.label}</h4>
                  <p className="text-body-md font-body-md text-on-surface-variant text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TIERS.map((tier) => (
              <article
                key={tier.headerLabel}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-ambient overflow-hidden flex flex-col"
              >
                <div className={`${tier.headerBg} p-6 text-center`}>
                  <h3 className={`text-headline-md font-headline-md ${tier.headerText}`}>{tier.headerLabel}</h3>
                </div>
                <div className="p-6 flex-grow flex flex-col gap-6">
                  {tier.subs.map((sub, i) => (
                    <SubPlanBlock key={sub.name} sub={sub} first={i === 0} />
                  ))}
                </div>
              </article>
            ))}

            {/* Gold Plan */}
            <article className="bg-surface-container-lowest border-2 border-secondary rounded-xl shadow-ambient overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 bg-secondary text-on-secondary text-label-md font-label-md px-3 py-1 rounded-bl-lg z-10">
                PREMIUM
              </div>
              <div className="bg-secondary p-6 text-center">
                <h3 className="text-headline-md font-headline-md text-on-secondary">Gold Package</h3>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="mb-4 rounded-lg overflow-hidden h-48 bg-surface-container">
                  <img
                    alt="Gold Casket"
                    className="w-full h-full object-cover"
                    src={GOLD_CASKET_IMG}
                    style={{ objectPosition: "0% 50%" }}
                  />
                </div>
                <h4 className="text-headline-sm font-headline-sm text-secondary mb-2">Gold</h4>
                <p className="text-body-md font-body-md text-on-surface-variant mb-6 italic text-sm">
                  SPECIAL METAL coffin with smooth finish, classy handles and beautiful interiors. Comes
                  with full glass lid. This is more stylish and sophisticated. The cover can be full-glass
                  or half-glass.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <RateColumn
                    rows={rates("18,240", "9,120", "4,560", "1,520")}
                    heading="Standard Rates"
                    gold
                  />
                  <RateColumn
                    rows={rates("18,000", "9,000", "4,500", "1,500")}
                    heading="Senior Rates*"
                    senior
                    gold
                  />
                </div>
                <div className="mt-auto">
                  <p className="text-body-md font-body-md text-error text-xs italic text-center">
                    *In case the coffin is not available, we will provide another with equal or greater
                    value.
                  </p>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-8 text-center max-w-3xl mx-auto">
            <p className="text-label-md font-label-md text-secondary mb-2">* Special Benefits for Senior Citizens</p>
            <p className="text-body-md font-body-md text-on-surface-variant text-sm">
              Available for ages 61-100 years old. Seniors have No Insurance Benefit. Must pay the
              balance. Includes complete memorial package and free flowers. Transferable/Assignable
              (Terms apply).
            </p>
          </div>
        </section>

        {/* Why Plan Ahead? */}
        <section className="bg-primary-fixed bg-opacity-20 rounded-xl p-8 md:p-12 text-center max-w-4xl mx-auto border border-primary-fixed-dim">
          <span className="material-symbols-outlined text-primary text-[40px] mb-4">info</span>
          <h3 className="text-headline-sm font-headline-sm text-primary mb-3">Why Plan Ahead?</h3>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl mx-auto">
            Pre-need planning protects your family from rising funeral costs and the emotional burden of
            making complex decisions during a difficult time. All funds are secured in a trusted trust
            fund, guaranteeing the delivery of services when the time comes.
          </p>
        </section>
      </div>
    </div>
  );
}
