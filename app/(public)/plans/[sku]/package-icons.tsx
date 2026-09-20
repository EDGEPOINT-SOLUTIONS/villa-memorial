import type { ReactNode, SVGProps } from "react";

/**
 * Feature-grid icons for the package page — the exact line art of the approved
 * prototype (docs/prototypes/villa-home-ui/package.html §"PACKAGE PAGE").
 * Route-local on purpose: the shared UI kit stays domain-free and no other
 * surface uses this set. Rendered inside the gold discs defined in
 * styles/components.css (.pkg-inclusion__icon / .pkg-condition__icon).
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

/** Retrieval & delivery — the hearse. */
function IconTruck() {
  return (
    <Icon>
      <path d="M3 16V8a1 1 0 0 1 1-1h9v9" />
      <path d="M13 10h4l3 4v2h-7" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </Icon>
  );
}

/** Preparation & casketing — the casket. */
function IconCasket() {
  return (
    <Icon>
      <path d="M3 9h18v3l-3 3H6l-3-3z" />
      <path d="M5 15v3M19 15v3M8 19h8" />
    </Icon>
  );
}

/** Viewing equipment — the chapel set-up. */
function IconViewing() {
  return (
    <Icon>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M4 20h16" />
      <path d="M9 20v-6h6v6" />
      <path d="M12 8v4M10 10h4" />
    </Icon>
  );
}

/** Interment — the cross. */
function IconInterment() {
  return (
    <Icon>
      <path d="M10 3h4v6h6v4h-6v8h-4v-8H4V9h6z" />
    </Icon>
  );
}

/** Free flowers and tarpaulin — the commemorative bloom. */
function IconFlowers() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 9.6c0-2.6 1.6-4.6 4-4.6-.2 2.6-1.6 4.2-4 4.6zM12 14.4c0 2.6-1.6 4.6-4 4.6.2-2.6 1.6-4.2 4-4.6zM9.6 12c-2.6 0-4.6-1.6-4.6-4 2.6.2 4.2 1.6 4.6 4zM14.4 12c2.6 0 4.6 1.6 4.6 4-2.6-.2-4.2-1.6-4.6-4z" />
    </Icon>
  );
}

/**
 * The five feature columns, in the Plans document's package-inclusion order
 * (`lib/plan-content.ts`). A unit test pins that order, so this array can stay
 * positional.
 */
export const INCLUSION_ICONS: ReadonlyArray<() => ReactNode> = [
  IconTruck,
  IconCasket,
  IconViewing,
  IconInterment,
  IconFlowers,
];

/** Eligibility — the family. */
export function IconEligibility() {
  return (
    <Icon strokeWidth={1.7}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="10" r="2.4" />
      <path d="M14 20a4.2 4.2 0 0 1 6.8-3.2" />
    </Icon>
  );
}

/** Limited contestability — the policy document. */
export function IconContestability() {
  return (
    <Icon strokeWidth={1.7}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12h5M9.5 15.5h5" />
    </Icon>
  );
}

/** Assignable and transferable — the transfer cycle. */
export function IconTransfer() {
  return (
    <Icon strokeWidth={1.7}>
      <path d="M4 8a8 8 0 0 1 13.7-2.3L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 16a8 8 0 0 1-13.7 2.3L4 16" />
      <path d="M4 20v-4h4" />
    </Icon>
  );
}

/** Cash assistance with hospital benefit — the shield. */
export function IconCashAssistance() {
  return (
    <Icon strokeWidth={1.7}>
      <path d="M12 3l7 3v5c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6z" />
      <path d="M12 8v5M9.5 10.5h5" />
    </Icon>
  );
}
