import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroBackgroundField } from "@/components/landing/hero-background-field";
import type { HeroSection } from "@/lib/api-client/landing";
import { HERO_BACKGROUND_PALETTE } from "@/lib/landing/hero-background";

/**
 * The staff colour changer (hero zone 02) — static-render contract: every brand
 * swatch, the free colour inputs, the transparency slider with its live value,
 * the pressed state and the clear invalid-colour message. Interaction itself is
 * browser-verified per the task brief.
 */
const hero = (patch: Partial<HeroSection> = {}): HeroSection => ({
  eyebrow: "Eyebrow",
  headline: "Honoring every life with dignity and light.",
  subline: "Subline",
  primaryCta: { label: "I need help now", href: "/services" },
  secondaryCta: { label: "Plan ahead", href: "/plans" },
  image: null,
  background: null,
  backgroundTransparency: 100,
  textColour: null,
  ...patch,
});

describe("the hero background colour changer", () => {
  it("offers every brand swatch, the free inputs, the slider and the current value", () => {
    const html = renderToStaticMarkup(<HeroBackgroundField hero={hero()} onChange={() => {}} />);
    for (const entry of HERO_BACKGROUND_PALETTE) {
      expect(html).toContain(`aria-label="${entry.name} — ${entry.value}"`);
    }
    expect(html).toContain('type="color"');
    expect(html).toContain('type="range"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="100"');
    expect(html).toContain("Transparency");
    expect(html).toContain("100%");
    expect(html).toContain('aria-pressed="false"');
  });

  it("marks the document's colour as pressed and previews it at the chosen transparency", () => {
    // `#1b93d6` is the new palette's "Sky" swatch (the home-rebuild plan's brand,
    // 2026-09-29). The fixture must be a colour the palette still carries — an
    // orphan value would silently stop exercising the pressed state.
    const html = renderToStaticMarkup(
      <HeroBackgroundField
        hero={hero({ background: "#1b93d6", backgroundTransparency: 25 })}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("25%");
    expect(html).toContain("Previewing #1b93d6 at 25% transparency");
    expect(html).toContain('value="#1b93d6"');
  });

  it("offers the hero text colour input and shows the chosen ink", () => {
    const html = renderToStaticMarkup(
      <HeroBackgroundField hero={hero({ textColour: "#ffffff" })} onChange={() => {}} />,
    );
    expect(html).toContain("Hero text colour");
    expect(html).toContain('value="#ffffff"');
    expect(html).toContain("The hero copy prints in #ffffff");
    expect(html).toContain("Default ink");
  });

  it("says 100% transparency leaves the photograph untouched", () => {
    const html = renderToStaticMarkup(<HeroBackgroundField hero={hero()} onChange={() => {}} />);
    expect(html).toContain("the photograph is clear");
  });

  it("shows a clear message and marks the field invalid for a colour that isn't CSS", () => {
    const html = renderToStaticMarkup(
      <HeroBackgroundField
        hero={hero({ background: "not-a-colour", backgroundTransparency: 30 })}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("valid CSS colour");
    expect(html).toContain("not-a-colour");
  });
});
