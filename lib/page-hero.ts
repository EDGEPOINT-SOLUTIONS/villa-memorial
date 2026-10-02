import type { PageDocument } from "@/lib/content-catalog";

/**
 * The hero a public page renders: the page document's own copy when the office
 * has authored it, otherwise the page's shipped default.
 *
 * The corner pages (Contact · Memorials · Builder · Facilities · Gallery · Price
 * list · Login) had their hero copy as constants in the page. Admin plan wave 1
 * moves those constants into a page document, and this is the ONE reader that
 * resolves them, so every page falls back the same way and an empty field keeps
 * the default rather than printing a blank band.
 */
export type HeroCopy = {
  eyebrow: string;
  headline: string;
  lead: string;
};

export function heroOr(document: PageDocument | null | undefined, fallback: HeroCopy): HeroCopy {
  const hero = document?.hero;
  return {
    eyebrow: hero?.eyebrow?.trim() || fallback.eyebrow,
    headline: hero?.headline?.trim() || fallback.headline,
    lead: hero?.lead?.trim() || fallback.lead,
  };
}
