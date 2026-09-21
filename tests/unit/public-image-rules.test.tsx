import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicImage } from "@/components/public/public-image";
import { PublicHero } from "@/components/public/public-hero";
import { IMAGE_CEILINGS, type PublicImageRole } from "@/lib/public-layout";
import { parseCss, readStyle } from "../helpers/css-rules";

/**
 * Public images — the regression home for the image half of the public design
 * plan (§2.4, defects D5/D6/D7). The measured pages shipped `<img>` tags with no
 * intrinsic size, `sizes` hints that did not match the column, and a portrait
 * source cropped into a landscape slot. The `PublicImage` frame + the home hero
 * (now a `PublicHero`) are the fix; this suite fails if any of it regresses.
 *
 * The checks are split:
 *  · the PRIMITIVE — render it and read the DOM (width/height, lazy/eager,
 *    srcSet⇒sizes, the role class);
 *  · the STYLESHEET — the frames declare a wrapper ratio + ceiling and the
 *    picture takes an author height, so a presentational attribute cannot
 *    defeat the ratio (D6's trap).
 */

const RULES = parseCss(readStyle("styles/components.css"));

describe("PublicImage — the primitive", () => {
  it("renders the role frame with the intrinsic size the CLS rule needs", () => {
    const html = renderToStaticMarkup(
      createElement(PublicImage, {
        src: "/media/composition/thumbs/prime-lot-320.webp",
        alt: "A prime lot",
        role: "card",
        width: 440,
        height: 330,
      }),
    );
    expect(html).toContain('class="public-image public-image--card"');
    expect(html).toContain('data-public-image="card"');
    expect(html).toContain('width="440"');
    expect(html).toContain('height="330"');
  });

  it("is lazy and async by default, eager only for the marked lead", () => {
    const lazy = renderToStaticMarkup(
      createElement(PublicImage, { src: "/a.jpg", alt: "", width: 4, height: 3 }),
    );
    expect(lazy).toContain('loading="lazy"');
    expect(lazy).toContain('decoding="async"');

    const lead = renderToStaticMarkup(
      createElement(PublicImage, { src: "/a.jpg", alt: "", width: 4, height: 3, priority: true }),
    );
    expect(lead).toContain('loading="eager"');
  });

  it("carries a sizes hint whenever it carries a srcSet (D5)", () => {
    const html = renderToStaticMarkup(
      createElement(PublicImage, {
        src: "/media/composition/thumbs/prime-lot-320.webp",
        srcSet: "/media/composition/thumbs/prime-lot-320.webp 320w, /media/composition/thumbs/prime-lot-640.webp 640w",
        sizes: "(max-width: 40rem) 92vw, 21rem",
        alt: "",
        width: 320,
        height: 240,
      }),
    );
    expect(html).toMatch(/srcset="/i);
    expect(html).toContain('sizes="(max-width: 40rem) 92vw, 21rem"');
  });

  it("every role the contract names has a frame class", () => {
    for (const role of Object.keys(IMAGE_CEILINGS) as PublicImageRole[]) {
      const html = renderToStaticMarkup(
        createElement(PublicImage, { src: "/a.jpg", alt: "", role, width: 4, height: 3 }),
      );
      expect(html).toContain(`public-image--${role}`);
    }
  });
});

describe("the image frames cannot upscale and keep the ratio (D6)", () => {
  it("the picture inside a ratio frame takes the author height", () => {
    const img = RULES.find((r) => r.selector === ".public-image img");
    expect(img).toBeDefined();
    expect(img!.body).toMatch(/(?<![-\w])height\s*:\s*100%/);
    expect(img!.body).toMatch(/object-fit\s*:\s*cover/);
  });

  it("no public frame declares the ratio straight on the img element", () => {
    // A ratio on the WRAPPER is safe; a ratio on the img lets the width/height
    // attribute supply a definite height and become a no-op (the AGENTS trap).
    const offenders = RULES.filter(
      (r) => /img\b/.test(r.selector) && /aspect-ratio\s*:/.test(r.body) && /\.public-image/.test(r.selector),
    ).map((r) => r.selector);
    expect(offenders).toEqual([]);
  });

  it("the home hero photograph is sized by the band, not a portrait crop", () => {
    // The hero media, not copy, sets the band's box; the ratio is landscape.
    const [w, h] = IMAGE_CEILINGS["home-hero"].ratio.split("/").map((n) => Number(n.trim()));
    expect(w).toBeGreaterThan(h);
    const heroImg = RULES.find((r) => r.selector === ".hero-home--photo .hero-home__photo img");
    expect(heroImg?.body).toMatch(/object-fit\s*:\s*cover/);
  });
});

describe("the home hero ships a sized image (the D7 fix)", () => {
  it("renders the hero photo with width and height attributes", () => {
    const html = renderToStaticMarkup(
      createElement(PublicHero, {
        variant: "home",
        brandName: "Villa Memorial Park",
        headline: "Honoring every life",
        image: "/media/hero-1.jpg",
        imageWidth: 1626,
        imageHeight: 916,
        primary: { label: "I need help now", href: "/immediate-assistance" },
      }),
    );
    expect(html).toContain('data-public-hero="home"');
    expect(html).toContain('width="1626"');
    expect(html).toContain('height="916"');
  });
});
