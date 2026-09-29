"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The home's entrance — the cloud sign (office, inboxes 050/051/052/054).
 *
 * Built from the office's own HTML/CSS reference (`Cloud Sign`): a golden
 * cloud on two cords drops over the page, the words surface, then the cords
 * stretch, thin and snap the cloud away. The overlay plays on its OWN blank
 * route (`/entrance`), with no chrome; when it finishes the visitor is handed
 * to the home by REPLACING the history entry, so Back from the home never
 * drops them into the animation again.
 *
 * The matching visual specifics are the reference's: the 400×200 cloud SVG
 * (five circles + the rounded base), the `#7cbcec → #2f6cab` sky gradient, the
 * blurred highlight/underside clipped to the silhouette, the two drop shadows,
 * the 2px `#f3e2b4 → #b8975a` cords at 28%, the 13px gold beads at 28%/72% and
 * 32.4%, the words' vertical gold gradient and shadow at 0.05/0.0633 of the
 * cloud width, the 18% cord overlap, and the reference's sway/surface/dim/
 * pull/thin/squeeze character — rebuilt COMPOSITOR-ONLY (office, inbox 057):
 * the hang drops as one translateY gesture carrying the decaying sway, and the
 * exit recoils on scaleY/translateY/scale. No keyframe animates height, width,
 * a position or a filter, so no frame of the intro makes the browser lay out.
 *
 * THE GUARDS ON TOP OF THE REFERENCE (it is a standalone demo):
 *  · NO CDN FONT — the words ride the app's self-hosted display face.
 *  · NO REPLAY BUTTON; a labelled Skip control instead.
 *  · THE TWO LINES live in the home document and are edited in the home
 *    editor; this module only renders them.
 *  · SHORT — the exit begins at 1.7s (the demo: 3.8s); any click or keypress
 *    finishes it in ~220ms.
 *  · ONCE PER SESSION — the home gate sends an unseen visitor to `/entrance`
 *    and a returning visitor straight to the home.
 *  · REDUCED MOTION — the greeting is shown without motion for 1.5s.
 *  · No layout, scroll or focus trace is left behind.
 */

export const SEEN_KEY = "villa-home-intro-seen";
/** The exit begins here — well inside the demo's 3.8 s hold. */
const EXIT_AT_MS = 1700;
/** The reference's 850 ms exit chain, with a little slack before removal. */
const EXIT_MS = 900;
/** Reduced motion: the greeting is shown, still and brief. */
const REDUCED_MS = 1500;
/** A skip's exit fade. */
const SKIP_MS = 220;

/**
 * The gate the HOME renders: nothing visible. A returning visitor keeps the
 * home (and its metadata is untouched); an unseen visitor is sent to the blank
 * `/entrance` route. `window.location.replace` also replaces the history entry,
 * so the home is not stacked on top of a page that would be skipped on Back.
 * With the session storage unavailable (private mode), the greeting plays.
 */
export function HomeIntroGate() {
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode can refuse storage; the greeting plays.
    }
    if (!seen) window.location.replace("/entrance");
  }, []);
  return null;
}

/**
 * The entrance route's client piece: mark the session, play the sign, and hand
 * the visitor to the home. A full `location.replace` (not a router push) is
 * deliberate — the entrance must not stay in the history stack.
 */
export function EntranceHandoff({ hello, welcome }: { hello: string; welcome: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignored — the greeting still plays this once
    }
  }, []);
  return <HomeSign hello={hello} welcome={welcome} onDone={() => window.location.replace("/")} />;
}

/**
 * The cloud sign itself. It is a page's whole content on `/entrance`, so it
 * portals to the body and covers the viewport; any click or keypress (and the
 * Skip control) finishes it immediately via `onDone`.
 */
export function HomeSign({
  hello,
  welcome,
  onDone,
}: {
  hello: string;
  welcome: string;
  onDone: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const finish = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMounted(true);
  }, []);

  // Play: focus the sign (so keys dismiss), arm the phases and any-input skip.
  useEffect(() => {
    if (!mounted) return;
    rootRef.current?.focus();
    const enterTimer = window.setTimeout(() => setPhase("exit"), EXIT_AT_MS);
    const exitTimer = window.setTimeout(
      () => setLeaving(true),
      reduced ? REDUCED_MS : EXIT_AT_MS + EXIT_MS,
    );
    const onKey = () => finish();
    const onClick = () => finish();
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [mounted, reduced, finish]);

  // Leave: fade, then hand the visitor to the home (history replaced).
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      onDone();
    }, SKIP_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

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
      <button type="button" className="home-intro__skip" onClick={finish}>
        Skip
      </button>
    </div>,
    document.body,
  );
}
