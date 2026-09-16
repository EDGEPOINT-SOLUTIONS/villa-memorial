import type { ReactNode, SVGProps } from "react";

/**
 * Line icons for the Funeraria memorial services page — one per service line the
 * client's 2026 sheet prices, plus the chapel and embalming marks. Kept beside
 * the components that render them (and unused elsewhere), so the shared UI kit
 * stays domain-free. Rendered inside the gold discs defined in
 * styles/components.css (.svc-card__icon) — the same treatment the package
 * page's feature grid uses (app/(public)/plans/[sku]/package-icons.tsx); the
 * captain's package.html review fixed that icon treatment for the public site.
 */
function Icon({ strokeWidth = 1.6, children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Called-out care — retrieval of the deceased to the morgue. */
function IconRetrieval() {
  return (
    <Icon>
      <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
      <path d="M9 11h6M12 8v6" />
    </Icon>
  );
}

/** Delivery — the hearse bringing the casket to the service. */
function IconDelivery() {
  return (
    <Icon>
      <path d="M3 15V9a1 1 0 0 1 1-1h8v7" />
      <path d="M12 11h4l3 3v1h-7" />
      <circle cx="7" cy="16.5" r="1.6" />
      <circle cx="17" cy="16.5" r="1.6" />
      <path d="M2 16h1.4M20 16h2" />
    </Icon>
  );
}

/** Viewing equipment — lights, curtains and carpets. */
function IconViewing() {
  return (
    <Icon>
      <path d="M4 20V6l8-3 8 3v14" />
      <path d="M3 20h18" />
      <path d="M8 20v-5h8v5" />
      <path d="M12 7v5M10.5 9h3" />
      <path d="M6 10h1M17 10h1" />
    </Icon>
  );
}

/** ORD coffin — the plain coffin the sheet prices separately. */
function IconCoffin() {
  return (
    <Icon>
      <path d="M4 9h16v3l-3.5 3.5h-9L4 12z" />
      <path d="M6 15.5V18M18 15.5V18M8.5 18h7" />
      <path d="M10 12h4" />
    </Icon>
  );
}

/** Interment — the grave side service and the family cars. */
function IconInterment() {
  return (
    <Icon>
      <path d="M6 20V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12" />
      <path d="M3 20h18" />
      <path d="M12 6V2M9.5 4h5" />
      <path d="M10.5 11h3M12 9.5v6" />
    </Icon>
  );
}

/** Preparation & casketing — embalming with make-up and dressing. */
function IconEmbalming() {
  return (
    <Icon>
      <path d="M12 3s5 5.2 5 9a5 5 0 0 1-10 0c0-3.8 5-9 5-9z" />
      <path d="M9.5 13.5c.6 1.3 1.5 2 2.5 2" />
    </Icon>
  );
}

/** Chapel use — the common and private chapels the sheet prices per day. */
function IconChapel() {
  return (
    <Icon>
      <path d="M12 3l6 4v12" />
      <path d="M12 3L6 7v12" />
      <path d="M3 20h18" />
      <path d="M10 20v-5a2 2 0 0 1 4 0v5" />
      <path d="M12 6v2M11 7h2" />
    </Icon>
  );
}

/** Icon per a-la-carte service line, keyed by the sheet's own label. */
export const ServiceIcons: Record<string, () => ReactNode> = {
  Retrieval: IconRetrieval,
  Delivery: IconDelivery,
  "Viewing equipment": IconViewing,
  "ORD coffin": IconCoffin,
  Interment: IconInterment,
};

export { IconChapel, IconEmbalming };
