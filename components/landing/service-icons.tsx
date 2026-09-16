/**
 * The four "Services we offer" glyphs, transcribed from the approved prototype
 * (docs/prototypes/villa-home-ui/home.html, section SERVICES WE OFFER) — 24px
 * stroke drawings on a 1.6 stroke, the same icon grammar as the rest of the
 * public site.
 *
 * The content document stores only the icon KEY on a card; an unknown key
 * degrades to the generic memorial-stone glyph so a hand-edited document can
 * never break the card. The keys double as the staff editor's picker options.
 */
import type { ReactNode } from "react";

export type ServiceCardIcon = "lot" | "interment" | "plan" | "mausoleum";

/** The picker catalogue for the staff editor (key → human label). */
export const SERVICE_CARD_ICONS: ReadonlyArray<{ key: ServiceCardIcon; label: string }> = [
  { key: "lot", label: "Memorial stone (lot only)" },
  { key: "interment", label: "Cross & dove (interment)" },
  { key: "plan", label: "Heart & cross (memorial plan)" },
  { key: "mausoleum", label: "Mausoleum" },
];

const GLYPHS: Record<ServiceCardIcon, ReactNode> = {
  lot: (
    <>
      <path d="M6 21h12M8 21V9a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v12" />
      <path d="M12 9v6M9.5 11.5h5" />
      <path d="M5 21h14" />
    </>
  ),
  interment: (
    <>
      <path d="M12 3v18M7.5 8h9" />
      <path d="M15 15c2.5.5 4 2 4.5 4-2.6.6-4.9-.4-6-2.4" />
    </>
  ),
  plan: (
    <>
      <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />
      <path d="M12 3v5M9.8 5.5h4.4" />
    </>
  ),
  mausoleum: (
    <>
      <path d="M4 21h16M6 21V9l6-5 6 5v12" />
      <path d="M10 21v-6a2 2 0 0 1 4 0v6" />
      <path d="M12 4v4" />
    </>
  ),
};

/** The card's inline SVG (decorative — the card's text carries the meaning). */
export function serviceCardIcon(key: string): ReactNode {
  const glyph = (GLYPHS as Record<string, ReactNode>)[key] ?? GLYPHS.lot;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
