"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * HomeIntro — the home's opening overlay (office, inboxes 050/051).
 *
 * Built from the office's own HTML/CSS reference
 * (`intro-reference.html`): a golden cloud on two cords drops over the REAL
 * home page (already rendered and scrolling underneath), the words surface,
 * then the cords stretch and snap the cloud away. The cloud's geometry is the
 * reference's 400×200 SVG — five circles and a rounded base, the sky gradient,
 * the blurred white highlight and the darker underside clipped to the
 * silhouette — and the motion is the reference's: the cords lower 1 s on an
 * expo-out curve, the hang sways about its top anchor, the words surface, then
 * the exit dims the words while the cords pull (a little further first), thin
 * and snap up and the cloud squeezes slightly.
 *
 * THE GUARDS ON TOP OF THE REFERENCE (it is a standalone demo):
 *  · NO CDN FONT. The words ride the app's self-hosted display face
 *    (`--font-display`, the client's letterhead serif) at the ladder's role
 *    steps; Cormorant Garamond is OFL and can be self-hosted like Manrope if
 *    the office asks for that exact face.
 *  · NO REPLAY BUTTON; a labelled Skip control instead.
 *  · THE TWO LINES live in the home document (`home.intro`) and are edited in
 *    the home editor.
 *  · SHORTER THAN THE DEMO: the exit begins at 1.7 s (the demo exits at 3.8 s)
 *    and any click or keypress finishes it in ~220 ms.
 *  · ONCE PER SESSION and home only (sessionStorage).
 *  · REDUCED MOTION: the greeting is shown WITHOUT motion for 1.5 s — the
 *    reference only disables part of its motion, and a moving cloud is still
 *    motion; the welcome matters, the motion is decoration.
 *  · While it is up the page behind is inert and focus starts on the overlay;
 *    when it goes, focus lands on the page's main content. Nothing about the
 *    page's layout, scroll or measurements changes.
 */

const SEEN_KEY = "villa-home-intro-seen";
/** The exit begins here — well inside the demo's 3.8 s hold. */
const EXIT_AT_MS = 1700;
/** The reference's 850 ms exit chain, with a little slack before removal. */
const EXIT_MS = 900;
/** Reduced motion: the greeting is shown, still and brief. */
const REDUCED_MS = 1500;
/** A skip's exit fade. */
const SKIP_MS = 220;

export function HomeIntro({ hello, welcome }: { hello: string; welcome: string }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
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

  // Play: inert the page behind, focus the overlay, arm the phases and the
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
    const enterTimer = window.setTimeout(() => setPhase("exit"), EXIT_AT_MS);
    const exitTimer = window.setTimeout(
      () => setLeaving(true),
      reduced ? REDUCED_MS : EXIT_AT_MS + EXIT_MS,
    );
    const onKey = () => dismiss();
    const onClick = () => dismiss();
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
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
    }, reduced ? SKIP_MS : SKIP_MS + 0);
    return () => window.clearTimeout(timer);
  }, [leaving, reduced]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      data-home-intro
      className={`home-intro home-intro--${phase}${reduced ? " home-intro--reduced" : ""}${
        leaving ? " home-intro--leaving" : ""
      }`}
    >
      {/* Artwork, from the office's own reference: the hang (cords + cloud). */}
      <div className="home-intro__hang" aria-hidden="true">
        <div className="home-intro__cords">
          <span className="home-intro__cord" />
          <span className="home-intro__cord" />
        </div>
        <div className="home-intro__cloud">
          <svg className="home-intro__svg" viewBox="0 0 400 200">
            <defs>
              <linearGradient
                id="home-intro-sky"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="8"
                x2="0"
                y2="175"
              >
                <stop offset="0" stopColor="#7cbcec" />
                <stop offset="1" stopColor="#2f6cab" />
              </linearGradient>
              <filter id="home-intro-soft" x="-30%" y="-60%" width="160%" height="220%">
                <feGaussianBlur stdDeviation="14" />
              </filter>
              <clipPath id="home-intro-shape">
                <circle cx="200" cy="72" r="64" />
                <circle cx="100" cy="105" r="42" />
                <circle cx="300" cy="105" r="42" />
                <circle cx="62" cy="134" r="34" />
                <circle cx="338" cy="134" r="34" />
                <rect x="60" y="105" width="280" height="68" rx="34" />
              </clipPath>
            </defs>
            <g fill="url(#home-intro-sky)">
              <circle cx="200" cy="72" r="64" />
              <circle cx="100" cy="105" r="42" />
              <circle cx="300" cy="105" r="42" />
              <circle cx="62" cy="134" r="34" />
              <circle cx="338" cy="134" r="34" />
              <rect x="60" y="105" width="280" height="68" rx="34" />
            </g>
            <g clipPath="url(#home-intro-shape)">
              <ellipse
                cx="170"
                cy="46"
                rx="120"
                ry="42"
                fill="#fff"
                opacity="0.36"
                filter="url(#home-intro-soft)"
              />
              <ellipse
                cx="220"
                cy="186"
                rx="170"
                ry="30"
                fill="#0a2a55"
                opacity="0.4"
                filter="url(#home-intro-soft)"
              />
            </g>
          </svg>
          <span className="home-intro__bead home-intro__bead--left" />
          <span className="home-intro__bead home-intro__bead--right" />
          <div className="home-intro__msg">
            {hello ? <p className="home-intro__hello">{hello}</p> : null}
            <p className="home-intro__welcome">{welcome}</p>
          </div>
        </div>
      </div>
      <button type="button" className="home-intro__skip" onClick={dismiss}>
        Skip
      </button>
    </div>,
    document.body,
  );
}
