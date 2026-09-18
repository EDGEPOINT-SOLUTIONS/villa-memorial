"use client";

/**
 * One modal focus contract for every dialog, drawer and menu (F-16 craft pass).
 *
 * Opening a modal moves focus into it; Tab is trapped inside; Escape closes;
 * the page behind cannot scroll; closing returns focus to whatever was focused
 * when the modal opened. Components with their own working trap
 * (chapel-booking-dialog, stage-move) keep their implementation — the rules are
 * identical, this hook is what new/uncovered surfaces use so there is ONE place
 * the contract lives.
 *
 * Usage:
 *   const { panelRef } = useModalFocus(open, onClose);
 *   <div role="dialog" aria-modal="true" ref={panelRef} tabIndex={-1}>…
 */
import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.closest("[hidden],[aria-hidden=true]")) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  });
}

export function useModalFocus<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const panelRef = useRef<T | null>(null);
  const panel = panelRef; // stable ref object
  const openedFrom = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Remember the trigger before focus moves (runs before the open effect).
  useEffect(() => {
    if (open) openedFrom.current = (document.activeElement as HTMLElement | null) ?? null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = panel.current;
    const previouslyFocused = openedFrom.current;
    const initial = node ? (visibleFocusables(node)[0] ?? node) : null;
    initial?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusables = visibleFocusables(node);
      if (focusables.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, panel]);

  return { panelRef: panel };
}
