"use client";

/**
 * HomeTitleRotator — the one rotating line in the gateway band.
 *
 * The office asks for an unlimited, ordered set of gateway title pairs, the band
 * showing one at a time and cross-fading to the next on an interval the office
 * sets (captain, 2026-10-02). This client component renders ALL of the sets in
 * one `<h1>` and toggles a single `is-active` class; the stylesheet stacks them
 * in the same grid cell and cross-fades their opacity, so the band's height is
 * the tallest set's from the first paint — no layout jump as the sets change.
 *
 * THE TIMING IS NOT HERE. `lib/home-title-rotation.ts` owns the interval, the
 * loop and the reduced-motion rule, so fake-timer tests drive it without a DOM.
 * This component wires that controller to the band's real events:
 *   · a pointer resting anywhere on band 1 pauses the rotation (the controller's
 *     timer is cleared from the section element, found from this title's ref);
 *   · a hidden tab pauses it, a visible one resumes;
 *   · the first set renders on the server, so a reduced-motion reader and a
 *     no-JavaScript reader both get the first set with no motion.
 *
 * ACCESSIBILITY. No assertive live region: the changing text is never announced
 * unprompted (the spec for this band). The inactive sets are `aria-hidden`, so
 * the heading's accessible name is always the one set on screen. The band keeps
 * its existing type scale — this component adds no type size of its own.
 *
 * The heading keeps `id="home-gateway-title"` so the band's `aria-labelledby`
 * (owned by the server page) still resolves.
 */
import { useEffect, useRef, useState } from "react";
import { createTitleRotation } from "@/lib/home-title-rotation";
import type { HomeTitleSet } from "@/lib/api-client/landing";

export function HomeTitleRotator({
  sets,
  intervalSeconds,
}: {
  sets: readonly HomeTitleSet[];
  intervalSeconds: number;
}) {
  const [active, setActive] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const count = sets.length;

  useEffect(() => {
    // One set is not a rotation; nothing to schedule.
    if (count <= 1) return;
    const still =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rotation = createTitleRotation({
      count,
      intervalSeconds,
      still,
      onChange: setActive,
    });
    // The WHOLE band pauses, not only the letters: climb from this title to the
    // gateway section so a pointer resting anywhere on band 1 holds the set.
    const band = titleRef.current?.closest(".home-gateway") ?? null;
    const onEnter = () => rotation.pause();
    const onLeave = () => rotation.resume();
    const onVisibility = () => {
      if (document.hidden) rotation.pause();
      else rotation.resume();
    };
    band?.addEventListener("pointerenter", onEnter);
    band?.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    rotation.resume();
    return () => {
      band?.removeEventListener("pointerenter", onEnter);
      band?.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      rotation.stop();
    };
  }, [count, intervalSeconds]);

  // The validator refuses an empty set list, so this is a broken hand-edited
  // document only — render nothing rather than an empty heading.
  if (count === 0) return null;

  return (
    <h1
      id="home-gateway-title"
      ref={titleRef}
      className="home-gateway__title home-gateway__title--rotator"
    >
      {sets.map((set, index) => (
        <span
          key={set.id}
          className={`home-title-set${index === active ? " is-active" : ""}`}
          aria-hidden={index === active ? undefined : true}
        >
          {set.headline}
          <span className="home-gateway__promise">{set.promise}</span>
        </span>
      ))}
    </h1>
  );
}
