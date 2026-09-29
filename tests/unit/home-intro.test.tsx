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
const ENTRANCE = read("app/entrance/page.tsx");
const EDITOR = read("components/landing/home-sections-editor.tsx");
const CSS = read("styles/components.css");

describe("the home's entrance sign", () => {
  it("is its own blank route, reading its two lines from the home document", async () => {
    const { home } = await listLandingContent();
    expect(home.intro.hello).toBe("Hello,");
    expect(home.intro.welcome).toBe("Welcome to Villa Funeraria");
    // The ENTRANCE route renders the sign from those stored fields — never
    // typed copy — and carries noindex (the home stays the indexable page).
    expect(ENTRANCE).toContain(
      "<EntranceHandoff hello={home.intro.hello} welcome={home.intro.welcome} />",
    );
    expect(ENTRANCE).toContain("robots: { index: false, follow: false }");
    // It sits OUTSIDE the (public) group, so it renders no chrome.
    expect(ENTRANCE).not.toContain("PublicShell");
    // The home renders only the gate; its own content never moves.
    expect(HOME).toContain("<HomeIntroGate />");
    expect((HOME.match(/home-intro/g) ?? []).length).toBe(1); // the import only
    expect(COMPONENT).toContain("{hello ? <p className=\"home-intro__hello\">{hello}</p> : null}");
    // The editor owns both lines (the office rewrites them there).
    expect(EDITOR).toContain('htmlFor="home-intro-hello"');
    expect(EDITOR).toContain('htmlFor="home-intro-welcome"');
    expect(EDITOR).toContain('update("intro"');
  });

  it("hands the visitor over by REPLACING the history entry, once per session", () => {
    // The gate: unseen → the blank entrance; seen → the home stays.
    expect(COMPONENT).toContain('window.location.replace("/entrance")');
    expect(COMPONENT).toContain("sessionStorage.getItem(SEEN_KEY)");
    // The hand-off: the sign finishes → the home, replacing /entrance in the
    // history so Back never returns to the animation.
    expect(COMPONENT).toContain('window.location.replace("/")');
    expect(COMPONENT).toContain("sessionStorage.setItem(SEEN_KEY, \"1\")");
    // The entrance is not in the sitemap (noindex, not a public page).
    const seo = read("lib/seo.ts");
    expect(seo).not.toContain('"/entrance"');
  });

  it("plays once per session, home only, and no replay control ships", () => {
    expect(COMPONENT).toContain("sessionStorage");
    expect(COMPONENT).toContain('SEEN_KEY = "villa-home-intro-seen"');
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
  });

  it("honours reduced motion by showing the greeting without motion", () => {
    expect(COMPONENT).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(CSS).toMatch(/\.home-intro--reduced \.home-intro__hang/);
    expect(CSS).toMatch(
      /\.home-intro--reduced \.home-intro__hang,\n\.home-intro--reduced \.home-intro__cords,/,
    );
    expect(CSS).toMatch(/home-intro--reduced[\s\S]{0,400}animation: none/);
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
      "home-intro__hello",
      "home-intro__welcome",
      "home-intro__skip",
    ]) {
      expect(defined.has(cls), cls).toBe(true);
    }
    const hello = /\.home-intro__hello \{[^}]*\}/.exec(CSS)?.[0] ?? "";
    // The reference's proportional size (0.05 × the cloud width), clamped to
    // ladder steps — the gate names this one artwork-scale exception.
    expect(hello).toMatch(
      /font-size:\s*clamp\(var\(--text-\w+\), calc\(var\(--home-intro-cw\) \* 0\.05\), var\(--text-/,
    );
    // The reference's gold gradient text over the blue cloud, with the inverse
    // gold token as the flat fallback (the token reserved for dark surfaces) —
    // never a light-ground gold tint.
    const words = /\.home-intro__hello,\n\.home-intro__welcome \{[^}]*\}/.exec(CSS)?.[0] ?? "";
    expect(words).toMatch(/color:\s*var\(--gold-200\)/);
    expect(words).toMatch(/background-clip:\s*text/);
    // The reference's own motion: the cords' height animates inside the fixed
    // overlay (no page reflow), the hang rotates, the cloud squeezes; nothing
    // animates a position or a page measurement.
    const lower = /@keyframes home-intro-lower \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(lower).toContain("height: var(--home-intro-len)");
    const pull = /@keyframes home-intro-pull \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(pull).toContain("height: calc(var(--home-intro-len) + 11vh)");
    const squeeze = /@keyframes home-intro-squeeze \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(squeeze).toContain("transform: scale(");
  });
});
