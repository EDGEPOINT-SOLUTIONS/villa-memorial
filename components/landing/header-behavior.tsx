"use client";

import { useEffect } from "react";

/**
 * Client behaviour for the shared public bar — renders nothing.
 *
 *  · scroll life (D5): after ~24 px the bar takes its compressed state
 *    (shorter main row, more opaque background, soft shadow). It never
 *    auto-hides, so the 24/7 number is always one tap away.
 *  · "Explore more" disclosure (D1): click toggles the grouped menu;
 *    Escape and an outside click close it and focus returns to the trigger.
 *
 * The bar's markup must stay framework-free (the home renders it through
 * react-dom/server in unit tests), so this component carries the DOM wiring
 * instead of state inside the bar itself.
 */
export function HeaderBehavior() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".anchored-header");
    if (!header) return;

    const applyCompressed = () => {
      header.classList.toggle("anchored-header--compressed", window.scrollY > 24);
    };
    applyCompressed();
    window.addEventListener("scroll", applyCompressed, { passive: true });

    const trigger = header.querySelector<HTMLButtonElement>("[data-anchored-explore-trigger]");
    const menu = header.querySelector<HTMLElement>("[data-anchored-explore-menu]");
    if (!trigger || !menu) {
      return () => window.removeEventListener("scroll", applyCompressed);
    }

    const setMenu = (open: boolean) => {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    };
    setMenu(false);

    const onTriggerClick = () => setMenu(menu.hidden);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !menu.hidden) {
        setMenu(false);
        trigger.focus();
      }
    };
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menu.hidden && target && !menu.contains(target) && !trigger.contains(target)) {
        setMenu(false);
      }
    };

    trigger.addEventListener("click", onTriggerClick);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onDocumentClick);
    return () => {
      window.removeEventListener("scroll", applyCompressed);
      trigger.removeEventListener("click", onTriggerClick);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  return null;
}
