"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO_COOKIE, SEEN_KEY } from "@/lib/home-intro";

/**
 * The home's entrance — the cloud sign (office, inboxes 050/051/052/054/058).
 *
 * Built from the office's own HTML/CSS reference (`Cloud Sign`): a golden
 * cloud on two cords drops over the page, the words surface, then the cords
 * stretch, thin and snap the cloud away.
 *
 * IT IS THE FIRST PAINT OF `/` (office, inbox 058). The home route reads the
 * `villa_home_intro_seen` cookie BEFORE render and puts this overlay in the
 * HTML for an unseen visitor, so the visitor sees the sign — mid-drop, CSS
 * animation already running — with no homepage flash and no blank hop through
 * a second route. The overlay takes itself down when the sequence ends; the
 * home was rendered behind it all along, so nothing navigates. A returning
 * visitor's request carries the cookie and the home server-renders without it.
 * `/entrance` still exists as the blank `noindex` demo route for a direct
 * visit; there the overlay hands off to `/` (replacing the history entry).
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
 *  · ONCE PER SESSION — the cookie (server-visible) plus sessionStorage (its
 *    fallback when cookies are refused) are written when the sequence ends.
 *  · REDUCED MOTION — the stylesheet refuses the motion before hydration and
 *    the greeting sits still for 1.5s.
 *  · No layout, scroll or focus trace is left behind, and the overlay also
 *    takes itself down in CSS if the client never hydrates.
 */

/** The exit begins here — well inside the demo's 3.8 s hold. */
const EXIT_AT_MS = 1700;
/** The reference's 850 ms exit chain, with a little slack before removal. */
const EXIT_MS = 900;
/** Reduced motion: the greeting is shown, still and brief. */
const REDUCED_MS = 1500;
/** A skip's exit fade. */
const SKIP_MS = 220;

/** Mark the sequence seen for the rest of the browser session. Both halves are
 *  written: the cookie is what the server reads on the next request, and
 *  sessionStorage keeps the guard when cookies are refused. */
function markIntroSeen() {
  try {
    document.cookie = `${INTRO_COOKIE}=1; path=/; SameSite=Lax`;
  } catch {
    // Cookies refused — sessionStorage still guards the session.
  }
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode can refuse storage; the cookie still guards the session.
  }
}

/**
 * The entrance route's client piece (`/entrance`): play the sign and hand the
 * visitor to the home. A full `location.replace` (not a router push) is
 * deliberate — the entrance must not stay in the history stack.
 */
export function EntranceHandoff({ hello, welcome }: { hello: string; welcome: string }) {
  return <HomeSign hello={hello} welcome={welcome} onDone={() => window.location.replace("/")} />;
}

/**
 * The home's overlay: the sign rendered by the route for an unseen visitor. It
 * unmounts itself when the sequence ends — the home is already on screen
 * underneath, so there is nothing to navigate to. If the cookie was refused
 * but this session already played the sign, sessionStorage takes it down
 * immediately (the server cannot see sessionStorage, so the overlay renders
 * and this effect removes it before it reads).
 */
export function HomeSignOverlay({ hello, welcome }: { hello: string; welcome: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY) === "1") setHidden(true);
    } catch {
      // Private mode: the cookie is the only guard; the sign plays.
    }
  }, []);
  if (hidden) return null;
  return <HomeSign hello={hello} welcome={welcome} onDone={() => setHidden(true)} />;
}

/**
 * The cloud sign itself. It is the page's whole first paint on `/` (rendered
 * server-side inside the home) and the whole content of `/entrance`; the
 * stylesheet runs the motion from the first frame, and any click or keypress
 * (and the Skip control) finishes it immediately via `onDone`. Rendering it
 * inline — not through a portal — is what lets the server paint it.
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
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const finish = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Play: focus the sign (so keys dismiss), arm the phases and any-input skip.
  // Hydration only arms the timers — the motion itself runs in CSS from the
  // server-rendered first paint, so a slow bundle never delays the animation.
  useEffect(() => {
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
  }, [reduced, finish]);

  // Leave: mark the session seen, fade, then hand over (the overlay unmounts;
  // `/entrance` replaces its history entry with the home).
  useEffect(() => {
    if (!leaving) return;
    markIntroSeen();
    const timer = window.setTimeout(() => {
      onDone();
    }, SKIP_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  return (
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
    </div>
  );
}
