"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

/**
 * ListingShell — the ONE frame around a storefront listing's rail and results.
 *
 * THE STRUCTURE (captain 2026-09-25, Amazon-familiar storefront): a sticky left
 * rail that stays in view while scrolling, a results area to its right with a
 * count/sort bar, and on a phone the SAME rail behind one Filters control (an
 * in-place sheet with its own "Show N" action) so exactly one filter surface is
 * ever rendered and a phone never scrolls a column of filters before the first
 * result.
 *
 * PRESENTATION ONLY. The shell owns the sheet's open state and the phone
 * toggle; it does not own filters, counts or matching. A surface hands it the
 * panel as `rail`, the results bar as `bar` and the grid as `children`.
 *
 * It is `use client` only for the phone toggle. On the server (and with JS off)
 * the desktop rail renders and the sheet stays closed, so the page still lists.
 */
export function ListingShell({
  railLabel,
  rail,
  railActiveCount = 0,
  sheetLabel = "Filters",
  sheetIcon = true,
  sheetAction,
  bar,
  children,
}: {
  /** Accessible name for the rail ("Refine lots", "Refine coffins"). */
  railLabel: string;
  /** The panel, rendered in the desktop rail — and again in the phone sheet on open. */
  rail: ReactNode;
  /** Applied-choice count for the phone control's badge. */
  railActiveCount?: number;
  sheetLabel?: string;
  /** A plain nav rail (gallery sections) does not want the sliders glyph. */
  sheetIcon?: boolean;
  /** The phone sheet's closing commit ("Show 34 lots"). */
  sheetAction?: { label: string; onClick: () => void };
  /** The results bar: the match count and the sort control. */
  bar?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const sheetId = useId();

  // A nav-style rail (gallery sets, price-list sections) closes the phone sheet
  // when its anchor is followed, so the section the reader picked is not hidden
  // behind the panel they picked it from.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, [open]);

  return (
    <div className="listing-layout">
      <aside className="listing-rail" aria-label={railLabel}>
        {rail}
      </aside>

      {/* Phone/tablet: the same panel behind one control. It opens in place —
          never over a card, no focus trap — and the page still renders without
          JS because the rail is the server-rendered copy. */}
      <div className="listing-sheet">
        <button
          type="button"
          className="listing-sheet__toggle"
          aria-expanded={open}
          aria-controls={sheetId}
          ref={toggleRef}
          onClick={() => setOpen((value) => !value)}
        >
          {sheetIcon ? <SlidersHorizontal size={18} aria-hidden="true" /> : null}
          <span className="listing-sheet__toggle-label">
            {sheetLabel}
            {railActiveCount > 0 ? ` (${railActiveCount})` : ""}
          </span>
        </button>
        {open ? (
          <div id={sheetId} className="listing-sheet__panel">
            {rail}
            {sheetAction ? (
              <button
                type="button"
                className="btn btn--primary listing-sheet__apply"
                onClick={() => {
                  sheetAction.onClick();
                  setOpen(false);
                  toggleRef.current?.focus();
                }}
              >
                {sheetAction.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="listing-results">
        {bar ? <div className="listing-bar">{bar}</div> : null}
        {children}
      </div>
    </div>
  );
}
