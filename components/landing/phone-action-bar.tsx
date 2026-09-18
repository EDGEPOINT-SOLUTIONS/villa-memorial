"use client";

import { useCallback, useState } from "react";
import { ArrowRight, LifeBuoy, Phone, X } from "lucide-react";
import type { ContactInfo } from "@/lib/api-client/landing";
import { PLAN_AHEAD_LINKS } from "@/components/landing/site-header";
import { useModalFocus } from "@/components/ui/use-modal-focus";

/**
 * Phone action bar (D3) — the permanent bottom bar below 75rem with the two
 * targets that matter at the worst moment: **Call 24/7** (a real `tel:` link)
 * and **Plan ahead** (the grouped client names in a dialog-style sheet), plus
 * **Get help** — the one-tap door to /immediate-assistance added for checklist
 * F-01 (captain, 2026-09-18). The bar never scrolls away; the existing full
 * menu (MobileQuickMenu) keeps the complete link list and sits just above it.
 *
 * Desktop renders it too (it is in the DOM, CSS hides it ≥ 75rem), so the
 * markup is identical on every public page. The sheet is a real dialog:
 * `aria-modal`, Escape closes, focus starts on the close button and returns
 * to the Plan ahead target.
 */
export function PhoneActionBar({ contact }: { contact: ContactInfo }) {
  const [open, setOpen] = useState(false);

  // Every close path (Escape, backdrop, close button) returns focus to the
  // target that opened the sheet — the shared modal focus contract.
  const close = useCallback(() => setOpen(false), []);
  const { panelRef } = useModalFocus<HTMLDivElement>(open, close);

  return (
    <>
      <nav className="anchored-phonebar" aria-label="Quick actions">
        <a className="anchored-phonebar__btn anchored-phonebar__btn--call" href={contact.phoneHref}>
          <Phone size={18} aria-hidden="true" />
          Call 24/7
        </a>
        <a className="anchored-phonebar__btn anchored-phonebar__btn--help" href="/immediate-assistance">
          <LifeBuoy size={18} aria-hidden="true" />
          Get help
        </a>
        <button
          type="button"
          className="anchored-phonebar__btn anchored-phonebar__btn--plan"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-anchored-plan-sheet-open
          onClick={() => setOpen(true)}
        >
          Plan ahead
        </button>
      </nav>

      {open ? (
        <div className="anchored-plan-sheet" role="dialog" aria-modal="true" aria-label="Plan ahead">
          <button
            type="button"
            className="anchored-plan-sheet__backdrop"
            aria-label="Close plan ahead"
            onClick={close}
          />
          <div className="anchored-plan-sheet__panel" ref={panelRef} tabIndex={-1}>
            <div className="anchored-plan-sheet__head">
              <h2 className="anchored-plan-sheet__title">Plan ahead</h2>
              <button
                type="button"
                className="anchored-plan-sheet__close"
                aria-label="Close plan ahead"
                onClick={close}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {PLAN_AHEAD_LINKS.map((item) => (
              <a key={item.href} className="anchored-plan-sheet__item" href={item.href}>
                <span>
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
