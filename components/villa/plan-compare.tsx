"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * PlanCompare — the ONE piece of state on /plans (`villa-plans-redesign-plan`,
 * captain 2026-09-30: "a nice interaction for visitors").
 *
 * The page itself is a Server Component with NO payment-period or rate toggle
 * (captain, 2026-09-30: removed): the tier columns lead with the regular
 * monthly figure and the comparison matrix carries every term and the senior
 * rates. The only interaction left is a READING aid — hovering or focusing a
 * tier column highlights that tier's column in the matrix, so the eye can
 * follow one plan across both surfaces.
 *
 * It is a Client Component so the interaction survives a server render, but it
 * holds no state and takes only `children`: the tier columns and the matrix are
 * rendered on the SERVER and passed in as the RSC tree, so the pricing document
 * never crosses a prop boundary as a function (the production-only serialisation
 * hazard recorded in web/AGENTS.md).
 */
export function PlanCompare({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const setColumn = (column: string | null) => {
      root.querySelectorAll<HTMLElement>(".plan-tier").forEach((card) => {
        card.classList.toggle(
          "is-active",
          column !== null && card.dataset.planCol === column,
        );
      });
      root
        .querySelectorAll<HTMLElement>(".plan-matrix [data-plan-col]")
        .forEach((cell) => {
          cell.classList.toggle(
            "is-highlighted",
            column !== null && cell.dataset.planCol === column,
          );
        });
    };

    const cards = Array.from(
      root.querySelectorAll<HTMLElement>(".plan-tier[data-plan-col]"),
    );
    const listeners: Array<() => void> = [];

    for (const card of cards) {
      const column = card.dataset.planCol ?? null;
      const enter = () => setColumn(column);
      const leave = () => setColumn(null);
      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);
      card.addEventListener("focusin", enter);
      card.addEventListener("focusout", leave);
      listeners.push(() => {
        card.removeEventListener("mouseenter", enter);
        card.removeEventListener("mouseleave", leave);
        card.removeEventListener("focusin", enter);
        card.removeEventListener("focusout", leave);
      });
    }

    return () => listeners.forEach((off) => off());
  }, []);

  return (
    <div className="plan-compare" ref={rootRef}>
      {children}
    </div>
  );
}
