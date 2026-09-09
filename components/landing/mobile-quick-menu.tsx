"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- framework-free view: plain
   <a> anchors keep the flyout consistent with LandingView (see landing-view.tsx). */

/**
 * Mobile quick menu — the anchored catalogue's slide-in flyout on small screens.
 * Below the three-column breakpoint the fixed rails collapse into this floating
 * menu (lucide icon button, bottom-right), which always leads with the 24/7 call
 * number and then lists both rails' pinned items grouped under their headings.
 * Hidden entirely on desktop (CSS) where the real rails take over.
 */
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import type { LandingContent } from "@/lib/api-client/landing";
import { RailThumb, BrandMark } from "@/components/landing/landing-view";
import type { RailItem } from "@/lib/api-client/landing";

function RailItemRow({ item }: { item: RailItem }) {
  return (
    <a className="quick-item" href={item.href} onClick={(e) => e.stopPropagation()}>
      <RailThumb item={item} />
      <span className="quick-item__text">
        <span className="quick-item__title">{item.title}</span>
        {item.price ? <span className="quick-item__price">{item.price}</span> : null}
        {item.caption ? <span className="quick-item__caption">{item.caption}</span> : null}
      </span>
    </a>
  );
}

export function MobileQuickMenu({ content }: { content: LandingContent }) {
  const [open, setOpen] = useState(false);

  // Lock page scroll while the drawer is open (effect only — safe for SSR).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { contact, logo, rails } = content;

  return (
    <>
      <button
        type="button"
        className="quick-menu-fab"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={open ? "Close quick menu" : "Open quick menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {open ? (
        <div className="quick-menu" role="dialog" aria-modal="true" aria-label="Quick menu">
          <div className="quick-menu__backdrop" onClick={() => setOpen(false)} />
          <div className="quick-menu__panel">
            <div className="quick-menu__head">
              <span className="quick-menu__brand">
                <BrandMark wordmark={logo.wordmark} markImage={logo.markImage} />
                <span>{logo.wordmark}</span>
              </span>
              <button
                type="button"
                className="quick-menu__close"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <a className="quick-call" href={contact.phoneHref}>
              <Phone size={16} aria-hidden="true" />
              <span>
                <strong>{contact.phoneLabel}</strong>
                <br />
                {contact.phoneDisplay} · {contact.location}
              </span>
            </a>

            {/* Explicit site links — Home first, so visitors always know how
                to get back to the catalogue home from the flyout. */}
            <nav className="quick-site" aria-label="Site">
              <a href="/" onClick={() => setOpen(false)}>
                Home
              </a>
              <a href="/services" onClick={() => setOpen(false)}>
                Services
              </a>
              <a href="/plans" onClick={() => setOpen(false)}>
                Plans
              </a>
              <a href="/lots" onClick={() => setOpen(false)}>
                Lots
              </a>
              <a href="/map" onClick={() => setOpen(false)}>
                Park map
              </a>
              <a href="/contact" onClick={() => setOpen(false)}>
                Contact
              </a>
            </nav>

            {/* Portal doors — the header keeps one “Sign in”; the family and
                agent doors live here (and in the footer) so every surface is
                one tap away on mobile. */}
            <nav className="quick-site" aria-label="Portal sign-in">
              <a href="/login" onClick={() => setOpen(false)}>
                Staff sign-in
              </a>
              <a href="/client/login" onClick={() => setOpen(false)}>
                Family sign-in
              </a>
              <a href="/agent/login" onClick={() => setOpen(false)}>
                Agent sign-in
              </a>
            </nav>

            {([["left", rails.left], ["right", rails.right]] as const).map(([side, config]) => (
              <div className="quick-group" key={side}>
                <h2 className="quick-group__heading">{config.heading}</h2>
                {config.items.length === 0 ? (
                  <p className="quick-group__empty">Nothing pinned here yet.</p>
                ) : (
                  <div className="quick-group__items">
                    {config.items.map((item) => (
                      <RailItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default MobileQuickMenu;
