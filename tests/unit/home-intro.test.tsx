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
const EDITOR = read("components/landing/home-sections-editor.tsx");
const CSS = read("styles/components.css");

describe("the home's entrance overlay", () => {
  it("reads its two lines from the home document and renders them from the store", async () => {
    const { home } = await listLandingContent();
    expect(home.intro.hello).toBe("Hello,");
    expect(home.intro.welcome).toBe("Welcome to Villa Funeraria");
    // The home renders the overlay from those stored fields, never typed copy.
    expect(HOME).toContain(
      "<HomeIntro hello={home.intro.hello} welcome={home.intro.welcome} />",
    );
    expect(COMPONENT).toContain("{hello ? <p className=\"home-intro__hello\">{hello}</p> : null}");
    // The editor owns both lines (the office rewrites them there).
    expect(EDITOR).toContain('htmlFor="home-intro-hello"');
    expect(EDITOR).toContain('htmlFor="home-intro-welcome"');
    expect(EDITOR).toContain('update("intro"');
  });

  it("plays once per session, home only, and no replay control ships", () => {
    expect(COMPONENT).toContain("sessionStorage");
    expect(COMPONENT).toContain('SEEN_KEY = "villa-home-intro-seen"');
    // Any input finishes it immediately.
    expect(COMPONENT).toContain('document.addEventListener("keydown"');
    expect(COMPONENT).toContain('document.addEventListener("click"');
    // The demo's replay button is deliberately NOT shipped.
    expect(COMPONENT).not.toContain("Replay");
    // No CDN font and no third typeface: the words ride the app's display face.
    expect(COMPONENT).not.toContain("fonts.googleapis");
    expect(COMPONENT).not.toContain("Cormorant");
  });

  it("keeps the page behind inert while up and hands focus to the main content", () => {
    expect(COMPONENT).toContain("shell.inert = true");
    expect(COMPONENT).toContain("shell.inert = false");
    expect(COMPONENT).toContain('getElementById("main")');
    expect(COMPONENT).toContain("focus(");
    // A dialog that announces itself, with a labelled skip control.
    expect(COMPONENT).toContain('aria-modal="true"');
    expect(COMPONENT).toContain('className="home-intro__skip"');
  });

  it("honours reduced motion by showing the greeting without motion", () => {
    expect(COMPONENT).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(CSS).toMatch(/\.home-intro--reduced \.home-intro__rig/);
    expect(CSS).toMatch(
      /\.home-intro--reduced \.home-intro__rig,\n\.home-intro--reduced \.home-intro__cord,\n\.home-intro--reduced \.home-intro__copy \{\n  animation: none;/,
    );
  });

  it("ships a stylesheet rule for every overlay class, on the role steps", () => {
    const defined = new Set([...CSS.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
    for (const cls of [
      "home-intro",
      "home-intro--leaving",
      "home-intro--reduced",
      "home-intro__rig",
      "home-intro__cord",
      "home-intro__bead",
      "home-intro__cloud",
      "home-intro__shade",
      "home-intro__copy",
      "home-intro__hello",
      "home-intro__welcome",
      "home-intro__skip",
    ]) {
      expect(defined.has(cls), cls).toBe(true);
    }
    const hello = /\.home-intro__hello \{[^}]*\}/.exec(CSS)?.[0] ?? "";
    expect(hello).toMatch(/font-size:\s*var\(--text-/);
    // Gold text is the accent INK role — never a decorative gold tint.
    expect(hello).toMatch(/color:\s*var\(--color-text-accent\)/);
    // The motion is transform/opacity only.
    const lower = /@keyframes home-intro-lower \{[\s\S]*?\n\}/.exec(CSS)?.[0] ?? "";
    expect(lower).toContain("transform: translate(");
    expect(lower).not.toMatch(/\b(top|left|width|height|margin|padding):/);
  });
});
