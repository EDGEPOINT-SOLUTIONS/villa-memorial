"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * HomeIntro — the home's opening overlay (office, inbox 050).
 *
 * A golden cloud on two cords lowers over the REAL home page (which is already
 * rendered and scrolling underneath), the two staff-editable greeting lines
 * surface, then the cords pull the cloud back up and the overlay is removed.
 * Nothing about the page itself changes: the overlay is fixed and out of flow,
 * and after it goes the DOM is exactly what it was.
 *
 * THE RULES IT KEEPS
 *  · ONCE PER SESSION, HOME ONLY. The component is rendered only by the home;
 *    a sessionStorage flag stops it playing again on a client navigation or a
 *    back navigation within the same session.
 *  · INTERRUPTIBLE. Any click or keypress finishes it immediately (a fast fade,
 *    then removal) — nobody is held at a door.
 *  · SHORT. The full animation is 2.3s (≈ half the supplied demo's hold).
 *  · REDUCED MOTION. With `prefers-reduced-motion: reduce` the greeting is
 *    shown WITHOUT motion for 1.5s (still skippable), rather than skipped: the
 *    welcome is the point of the overlay, the motion is decoration.
 *  · ACCESSIBLE. The page behind is made inert while the overlay is up (so
 *    keyboard/AT cannot reach it), focus starts on the overlay, and on removal
 *    focus moves to the page's main content. There is no focus trap, and the
 *    page is never hidden from AT longer than the overlay is visible.
 *  · NO REPLAY CONTROL: a visitor arriving at a funeral home's site is not
 *    offered a button to replay the entrance.
 *
 * The two lines come from the home content document (`home.intro`) and are
 * edited in the home editor; the cloud, cords, bead and shade are artwork.
 */

const SEEN_KEY = "villa-home-intro-seen";
/** Full animation: lower · settle · words · hold · recoil. */
const PLAY_MS = 2300;
/** Reduced motion: the greeting is shown, still and brief. */
const REDUCED_MS = 1500;
/** A skip's exit fade. */
const EXIT_MS = 220;

export function HomeIntro({ hello, welcome }: { hello: string; welcome: string }) {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const dismiss = useCallback(() => setLeaving(true), []);

  // Decide on the client: already seen this session, or the OS motion setting.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode can refuse storage; the intro simply plays again.
    }
    if (seen) return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMounted(true);
  }, []);

  // Play: inert the page behind, focus the overlay, arm the auto-finish and the
  // any-input dismissal.
  useEffect(() => {
    if (!mounted) return;
    const shell = document.querySelector(".public-shell");
    if (shell instanceof HTMLElement) shell.inert = true;
    rootRef.current?.focus();
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignored — the overlay still plays this once
    }
    const timer = window.setTimeout(dismiss, reduced ? REDUCED_MS : PLAY_MS);
    const onKey = () => dismiss();
    const onClick = () => dismiss();
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      if (shell instanceof HTMLElement) shell.inert = false;
    };
  }, [mounted, reduced, dismiss]);

  // Leave: fade, remove, and hand focus back to the page's main content.
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      const shell = document.querySelector(".public-shell");
      if (shell instanceof HTMLElement) shell.inert = false;
      setMounted(false);
      const main = document.getElementById("main");
      if (main instanceof HTMLElement) {
        main.tabIndex = -1;
        main.focus({ preventScroll: true });
      }
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      data-home-intro
      className={`home-intro${reduced ? " home-intro--reduced" : ""}${
        leaving ? " home-intro--leaving" : ""
      }`}
    >
      {/* Artwork: the hanging cloud, its cords, the beads and the shade. */}
      <div className="home-intro__rig" aria-hidden="true">
        <span className="home-intro__cord home-intro__cord--left" />
        <span className="home-intro__cord home-intro__cord--right" />
        <span className="home-intro__bead home-intro__bead--left" />
        <span className="home-intro__bead home-intro__bead--right" />
        <span className="home-intro__cloud" />
        <span className="home-intro__shade" />
      </div>
      <div className="home-intro__copy">
        {hello ? <p className="home-intro__hello">{hello}</p> : null}
        <p className="home-intro__welcome">{welcome}</p>
      </div>
      <button type="button" className="home-intro__skip" onClick={dismiss}>
        Skip
      </button>
    </div>,
    document.body,
  );
}
