/**
 * The public layout primitives — the consistency contract's one home (Phase 0 of
 * the captain's public design plan). Every public page renders its hero, section
 * head, disclosure and image through these; the numbers they enforce live in
 * `lib/public-layout.ts` and are pinned by `tests/unit/public-layout.test.ts`
 * plus the public-* guard suites.
 *
 * The kit re-exports this module, so a lane imports from `@/components/kit` and
 * gets the shared grammar it should not re-derive.
 */
export { PublicHero, type PublicHeroAction, type PublicHeroProps } from "./public-hero";
export { SectionHead } from "./section-head";
export { PublicDisclosure } from "./public-disclosure";
export { PublicImage, type PublicImageProps, type PublicImageSource, type PublicImageRole } from "./public-image";
export { PhotoViewer } from "./photo-viewer";
