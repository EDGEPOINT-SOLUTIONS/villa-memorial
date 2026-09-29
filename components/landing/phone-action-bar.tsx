"use client";

import { useCallback, useState } from "react";
import { ArrowRight, LifeBuoy, Phone, X } from "lucide-react";
import type { ContactInfo } from "@/lib/api-client/landing";
import { EXPLORE_MORE_LINKS } from "@/components/landing/site-header";
import { useModalFocus } from "@/components/ui/use-modal-focus";

/**
 * Phone action bar (D3) — the permanent bottom bar below 75rem with the two
 * targets that matter at the worst moment: **Call 24/7** (a real `tel:` link)
 * and **Explore more** (the grouped secondary pages in a dialog-style sheet),
 * plus **Get help** — the one-tap door to /immediate-assistance added for
 * checklist F-01 (captain, 2026-09-18). The bar never scrolls away; the
 * existing full menu (MobileQuickMenu) keeps the complete link list and sits
 * just above it.
 *
 * Desktop renders it too (it is in the DOM, CSS hides it ≥ 75rem), so the
 * markup is identical on every public page. The sheet is a real dialog:
 * `aria-modal`, Escape closes, focus starts on the close button and returns
 * to the Explore more target.
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
        {/* Blog is a top-level page now (office, 2026-09-29): reachable from the
            bar itself, not only inside the Explore more sheet. */}
        <a className="anchored-phonebar__btn anchored-phonebar__btn--blog" href="/blog">
          Blog
        </a>
        <button
          type="button"
          className="anchored-phonebar__btn anchored-phonebar__btn--explore"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-anchored-explore-sheet-open
          onClick={() => setOpen(true)}
        >
          Explore more
        </button>
      </nav>

      {open ? (
        <div className="anchored-explore-sheet" role="dialog" aria-modal="true" aria-label="Explore more">
          <button
            type="button"
            className="anchored-explore-sheet__backdrop"
            aria-label="Close explore more"
            onClick={close}
          />
          <div className="anchored-explore-sheet__panel" ref={panelRef} tabIndex={-1}>
            <div className="anchored-explore-sheet__head">
              <h2 className="anchored-explore-sheet__title">Explore more</h2>
              <button
                type="button"
                className="anchored-explore-sheet__close"
                aria-label="Close explore more"
                onClick={close}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {EXPLORE_MORE_LINKS.map((item) => (
              <a key={item.href} className="anchored-explore-sheet__item" href={item.href}>
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
