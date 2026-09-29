import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { listLandingContent } from "@/lib/api-client/landing";

/**
 * The home's entrance overlay (office, inbox 050).
 *
 * A real feature, not the supplied standalone demo: the live page renders
 * underneath it, the two marquee lines come from the home document and its
 * editor, it plays once per session on the home only, any input skips it, and
 * reduced motion shows the greeting without motion. These are source- and
 * store-level assertions because the overlay itself is client-mounted (it
 * renders nothing on the server, deliberately, so an already-seen session never
 * flashes it).
 */

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const COMPONENT = read("components/public/home-intro.tsx");
const HOME = read("components/public/home-page.tsx");
const HOME_ROUTE = read("app/(public)/page.tsx");
const ENTRANCE = read("app/entrance/page.tsx");
const EDITOR = read("components/landing/home-sections-editor.tsx");
const KEYS = read("lib/home-intro.ts");
const CSS = read("styles/components.css");

describe("the home's entrance sign", () => {
  it("is its own blank route, reading its two lines from the home document", async () => {
    const { home } = await listLandingContent();
    expect(home.intro.hello).toBe("Hello,");
    expect(home.intro.welcome).toBe("Welcome to Villa Funeraria");
    // The ENTRANCE route renders the sign from those stored fields — never
    // typed copy — and carries noindex (the home stays the indexable page).
    expect(ENTRANCE).toContain(
      "<EntranceHandoff welcome={home.intro.welcome} />",
    );
    expect(ENTRANCE).toContain("robots: { index: false, follow: false }");
    // It sits OUTSIDE the (public) group, so it renders no chrome.
    expect(ENTRANCE).not.toContain("PublicShell");
    // IT IS THE HOME'S FIRST PAINT (office, inbox 058): the route cookie-gates
    // the overlay into the server HTML — an unseen visitor gets the sign in
    // the very first paint, with no redirect and no homepage flash — and the
    // home component itself never carries it.
    expect(HOME_ROUTE).toContain("const cookieStore = await cookies()");
    expect(HOME_ROUTE).toContain("introSeen ? null :");
    expect(HOME_ROUTE).toContain(
      "<HomeSignOverlay welcome={content.home.intro.welcome} />",
    );
    expect(HOME_ROUTE).toContain('from "@/components/public/home-intro"');
    // The overlay is FIRST in the document, so even a slow parse paints the
    // sign before the home markup it covers.
    expect(HOME_ROUTE.indexOf("<HomeSignOverlay")).toBeLessThan(
      HOME_ROUTE.indexOf("<HomePage"),
    );
    expect((HOME.match(/home-intro/g) ?? []).length).toBe(0);
    // The sign renders ONE line now (the "Hello," greeting was removed on the
    // captain's direction, 2026-09-30); the stored hello field stays for the
    // editor but never reaches the sign.
    expect(COMPONENT).toContain('<p className="home-intro__welcome">{welcome}</p>');
    expect(COMPONENT).not.toContain("home-intro__hello");
    // The editor owns both lines (the office rewrites them there).
    expect(EDITOR).toContain('htmlFor="home-intro-hello"');
    expect(EDITOR).toContain('htmlFor="home-intro-welcome"');
    expect(EDITOR).toContain('update("intro"');
  });

  it("hands the visitor over by REPLACING the history entry, once per session", () => {
    // No client redirect at the root any more: the first paint IS the sign.
    expect(COMPONENT).not.toContain('window.location.replace("/entrance")');
    // The cookie the server reads is written when the sequence ends; the
    // sessionStorage half takes the overlay down when cookies are refused.
    expect(COMPONENT).toContain('sessionStorage.getItem(SEEN_KEY) === "1"');
    // Server-side gate + client-side fallback for refused cookies. Both keys
    // live in a PLAIN module: exporting INTRO_COOKIE from the "use client"
    // component gave the server a client-reference proxy, so the gate read
    // `undefined` and served the overlay forever — pinned by these two lines.
    expect(HOME_ROUTE).toContain('cookieStore.get(INTRO_COOKIE)?.value === "1"');
    expect(HOME_ROUTE).toContain('import { INTRO_COOKIE } from "@/lib/home-intro"');
    expect(HOME_ROUTE).not.toMatch(/HomeSignOverlay, INTRO_COOKIE/);
    expect(KEYS).toContain('export const INTRO_COOKIE = "villa_home_intro_seen"');
    expect(KEYS).toContain('export const SEEN_KEY = "villa-home-intro-seen"');
    expect(COMPONENT).toContain("document.cookie = `${INTRO_COOKIE}=1; path=/; SameSite=Lax`");
    expect(COMPONENT).toContain("sessionStorage.setItem(SEEN_KEY, \"1\")");
    // `/entrance` still hands off to the home by replacing its history entry
    // so Back never returns to the animation.
    expect(COMPONENT).toContain('window.location.replace("/")');
    // The entrance is not in the sitemap (noindex, not a public page).
    const seo = read("lib/seo.ts");
    expect(seo).not.toContain('"/entrance"');
  });

  it("plays once per session, home only, and no replay control ships", () => {
    expect(COMPONENT).toContain("sessionStorage");
    expect(COMPONENT).toContain('from "@/lib/home-intro"');
    // Any input finishes it immediately.
    expect(COMPONENT).toContain('document.addEventListener("keydown"');
    expect(COMPONENT).toContain('document.addEventListener("click"');
    // The demo's replay button is deliberately NOT shipped (the doc comment
    // documents the decision; no replay LABEL exists in the markup).
    expect(COMPONENT).not.toMatch(/>\s*Replay\s*</);
    // No CDN font and no third typeface: the words ride the app's display
    // face. (The doc comment records the Cormorant decision; no font link or
    // family declaration for it exists.)
    expect(COMPONENT).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    expect(COMPONENT).not.toMatch(/font-family:\s*"?Cormorant/);
  });

  it("covers the whole blank page and is dismissed by its own controls", () => {
    // The sign is the page's whole content: a fixed layer with a labelled
    // skip control, focused on mount so any key dismisses it.
    expect(COMPONENT).toContain('aria-modal="true"');
    expect(COMPONENT).toContain("rootRef.current?.focus()");
    expect(COMPONENT).toContain('className="home-intro__skip"');
    // The first paint is a PLAIN WHITE page (office, inbox 059): the veil is
    // opaque, never a translucent wash the home could read through.
    const veil = /\.home-intro \{[^}]*\}/.exec(CSS)?.[0] ?? "";
    expect(veil).toContain("background: var(--paper-0);");
    expect(veil).not.toContain("color-mix(in srgb, var(--paper-0) 94%");
    // The home underneath is inert while the sign is up — hidden visually,
    // but also unreachable by Tab or a screen reader until the veil lifts.
    expect(COMPONENT).toContain('behind?.setAttribute("inert", "")');
    expect(COMPONENT).toContain('behind?.removeAttribute("inert")');
  });

  it("honours reduced motion by showing the greeting without motion", () => {
    expect(COMPONENT).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(CSS).toMatch(/\.home-intro--reduced \.home-intro__hang/);
    expect(CSS).toMatch(
      /\.home-intro--reduced \.home-intro__hang,\n\.home-intro--reduced \.home-intro__cords,/,
    );
    expect(CSS).toMatch(/home-intro--reduced[\s\S]{0,400}animation: none/);
    // The stylesheet refuses the motion BEFORE hydration too — a reduced-motion
    // visitor must never see a moving frame while the class is not set yet.
    const reduced =
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.home-intro__hang,[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(reduced).toContain("animation: none");
    expect(reduced).toContain("animation-duration: 1ms");
  });

  it("ships a stylesheet rule for every overlay class, on the role steps", () => {
    const defined = new Set([...CSS.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
    for (const cls of [
      "home-intro",
      "home-intro--enter",
      "home-intro--exit",
      "home-intro--leaving",
      "home-intro--reduced",
      "home-intro__hang",
      "home-intro__cords",
      "home-intro__cord",
      "home-intro__bead",
      "home-intro__cloud",
      "home-intro__svg",
      "home-intro__msg",
      "home-intro__welcome",
      "home-intro__skip",
    ]) {
      expect(defined.has(cls), cls).toBe(true);
    }
    // The reference's proportional size, stepped down a little from 0.0633 to
    // 0.056 of the cloud width (captain, 2026-09-30), clamped to ladder steps —
    // the gate names this one artwork-scale exception.
    const welcome = /\.home-intro__welcome \{[^}]*\}/.exec(CSS)?.[0] ?? "";
    expect(welcome).toMatch(
      /font-size:\s*clamp\(var\(--text-\w+\), calc\(var\(--home-intro-cw\) \* 0\.056\), var\(--text-/,
    );
    // The reference's gold gradient text over the blue cloud, with the inverse
    // gold token as the flat fallback (the token reserved for dark surfaces) —
    // never a light-ground gold tint.
    const words = welcome;
    expect(words).toMatch(/color:\s*var\(--gold-200\)/);
    expect(words).toMatch(/background-clip:\s*text/);
    // COMPOSITOR-ONLY (office, inbox 057): the whole intro animates transform
    // and opacity and nothing else. This is the automated form of the grep the
    // office asked for — every @keyframes block in the intro section is walked
    // and any layout-triggering property fails the suite by name.
    const introSection =
      /the home's entrance overlay[\s\S]*?@keyframes home-intro-leave \{[\s\S]*?\n\}/.exec(CSS)?.[0] ??
      "";
    expect(introSection, "the intro's stylesheet section is found").not.toBe("");
    const keyframes = [...introSection.matchAll(/@keyframes [\w-]+ \{[\s\S]*?\n\}/g)].map(
      (m) => m[0],
    );
    expect(keyframes.length, "the intro declares keyframes").toBeGreaterThan(0);
    for (const kf of keyframes) {
      expect(
        kf,
        `a layout-triggering property inside a keyframe:\n${kf}`,
      ).not.toMatch(/\b(height|width|top|left|right|bottom|margin|padding|font-size|filter)\s*:/);
    }
    // The reference's character, restored on transforms: the cords sit at full
    // length at rest and the whole hang drops as ONE gesture whose track
    // carries the decaying sway; the cords recoil on scaleY and the cloud
    // lifts back to the anchor while it squeezes.
    const cords = /\.home-intro__cords \{[^}]*\}/.exec(CSS)?.[0] ?? "";
    expect(cords).toContain("height: var(--home-intro-len)");
    expect(cords).toContain("transform-origin: 50% 0");
    const drop = /@keyframes home-intro-drop \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(drop).toContain("translateY(calc(-1 * var(--home-intro-len)))");
    expect(drop).toContain("rotate(");
    const hang = /\.home-intro--enter \.home-intro__hang \{[^}]*\}/.exec(CSS)?.[0] ?? "";
    expect(hang).toContain("animation: home-intro-drop");
    expect(hang).toContain("will-change: transform, opacity");
    const recoil = /@keyframes home-intro-recoil \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(recoil).toContain("scaleY(1.06)");
    expect(recoil).toContain("scaleY(0)");
    const lift = /@keyframes home-intro-lift \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(lift).toContain("translateY(calc(-1 * var(--home-intro-len)))");
    expect(lift).toContain("scale(0.985, 1.035)");
    // The promotion is dropped once the intro is done.
    expect(CSS).toMatch(/home-intro--leaving[\s\S]{0,240}will-change: auto/);
    // No-JS fallback: the overlay takes itself down on a transform alone, so
    // a client that never hydrates neither blocks the page nor animates a
    // layout property.
    const selfDismiss = /@keyframes home-intro-self-dismiss \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(selfDismiss).toContain("transform: translateY(-101%)");
    expect(/\.home-intro \{[^}]*\}/.exec(CSS)?.[0] ?? "").toContain(
      "animation: home-intro-self-dismiss",
    );
  });
});
