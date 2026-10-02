import type { Metadata } from "next";
import Link from "next/link";
import {
} from "@/lib/gallery";
import { PublicHero } from "@/components/kit";
import { PageBlocks } from "@/components/villa/page-blocks";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { heroOr } from "@/lib/page-hero";
import { containerClass } from "@/lib/public-layout";
import { pageMetadata } from "@/lib/seo";
import { GalleryListing } from "./gallery-listing";

export const metadata: Metadata = pageMetadata({
  title: "Photo gallery & virtual tour — Villa Funeraria",
  description:
    "The park in the client's own photographs — the entrance, the grounds, the coffins, the carriage and the viewing set-ups — plus one entry to the park map and its 3D walk-through.",
  path: "/gallery",
});

/**
 * Public gallery & virtual-tour entry (screen-inventory "Gallery" / "Virtual
 * Tour", F-03) — rebuilt to the approved plan (captain, 2026-09-30).
 *
 * Band 1 is the home's gateway grammar, exactly as /services and /map wear it:
 * a plain centred opening with a visible h1, one short lead and two actions,
 * then the gallery's own facts under a hairline. The photographs lead from Band
 * 2, where they can be large and WHOLE — the client's own 4:3 catalogue crop in
 * a 4:3 frame, never re-cropped. `GalleryListing` owns the set index, the wall
 * and the one viewing interaction.
 *
 * The walk-through is the EXISTING `/map` linked once, and the page adds no
 * second closing band: the shared shell `NextSteps` carries the one call, so
 * the page never prints two.
 */
export default async function GalleryPage() {
  const galleryPage = await getPageDocument("gallery").catch(() => null);
  const hero = heroOr(galleryPage, {
    eyebrow: "Villa Memorial Park · Gallery",
    headline: "See the park before you visit",
    lead: "The park in the client's own photographs.",
  });
  return (
    <div className={`${containerClass("catalogue")} gal-page`}>
      <nav className="gal-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-current="page">Gallery &amp; virtual tour</li>
        </ol>
      </nav>

      {/* Band 1 · the opening — the home's gateway grammar. Plain, centred, no
          card and no photograph: the park photographs lead Band 2, large and
          whole, instead of competing with the headline at banner size. */}
      <PublicHero
        variant="interior"
        eyebrow={hero.eyebrow}
        title={hero.headline}
        lead={hero.lead}
        primary={{ label: "View the photographs", href: "#wall" }}
        secondary={{ label: "Plan a visit", href: "/contact" }}
      />

      <PageBlocks blocks={galleryPage?.blocks ?? []} />

      <GalleryListing />

    </div>
  );
}
