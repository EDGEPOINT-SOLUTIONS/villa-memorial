import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { HomeTitleRotator } from "@/components/public/home-title-rotator";
import { PublicImage } from "@/components/public/public-image";
import { compositionThumbSet, libraryThumb, libraryThumbSet } from "@/lib/media";
import type { LandingContent } from "@/lib/api-client/landing";

/**
 * HomeBanner — the storefront home's middle-section banner (captain, 2026-10-02).
 *
 * `/` is the blog page's design now (the anchored storefront), and the captain
 * asked for a banner where that design used to open with the blog list:
 * *"in the new homepage make a banner in the middle section and remove the blogs
 * inside that middle sections"*.
 *
 * The banner carries the retired home's opening — the office's place line, their
 * rotating title sets, the 24/7 call, the supporting action and the three trust
 * facts — beside the client's own park photograph. Every figure, link and
 * control the old gateway carried survives here; what is gone is the second
 * page-opening band, because the storefront's middle column already leads.
 *
 * It reuses the gateway's shipped classes (`.home-open*` / `.home-gateway__title`)
 * so the one type ladder, the gold call and the facts ribbon are exactly the ones
 * the product already owns — no second visual language. The heading is the ONE
 * `h1` on the home (the storefront bands below it are all `h2`/`h3`).
 */

/** Intrinsic hints for the shipped hero derivative; an unknown asset gets 3:2. */
const PHOTO_HINTS: Readonly<Record<string, { width: number; height: number }>> = {
  "hero-1-960.webp": { width: 960, height: 541 },
};

function photo(src: string): { src: string; srcSet?: string; width: number; height: number } {
  const resolved = libraryThumb(src, 960);
  const srcSet = libraryThumbSet(src) ?? compositionThumbSet(src);
  const file = resolved.split("/").pop() ?? "";
  const hint = PHOTO_HINTS[file] ?? { width: 960, height: 640 };
  return { src: resolved, srcSet, width: hint.width, height: hint.height };
}

export function HomeBanner({ content }: { content: LandingContent }) {
  const { contact, home } = content;
  const gateway = home.gateway;
  const heroPhoto = home.photo.image ? photo(home.photo.image) : null;
  const parkName =
    contact.parkAddress.split(",")[0]?.trim() || contact.location || "Villa Memorial Park";

  return (
    <section className="mid-section home-banner" aria-labelledby="home-gateway-title">
      <div className="home-open">
        <div className="home-open__words">
          {gateway.place ? <p className="home-open__eyebrow">{gateway.place}</p> : null}
          <HomeTitleRotator
            sets={gateway.titleSets}
            intervalSeconds={gateway.titleIntervalSeconds}
          />
          <div className="home-open__actions">
            <a className="btn btn--accent home-call" href={contact.phoneHref}>
              <Phone size={18} aria-hidden="true" />
              {contact.phoneDisplay}
            </a>
            <Link className="btn btn--secondary btn--gold-outline" href={gateway.secondary.href}>
              {gateway.secondary.label}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <ul className="home-open__trust">
            {gateway.facts.map((fact, index) => {
              const Icon = [Clock, MapPin, ShieldCheck][index % 3];
              return (
                <li key={fact.id} className="home-trust__item">
                  <Icon size={18} aria-hidden="true" />
                  <b>{fact.label}</b>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="home-open__media">
          {heroPhoto ? (
            <PublicImage
              src={heroPhoto.src}
              srcSet={heroPhoto.srcSet}
              sizes={heroPhoto.srcSet ? "(max-width: 64rem) 92vw, 26rem" : undefined}
              alt={home.photo.alt}
              role="band-lead"
              width={heroPhoto.width}
              height={heroPhoto.height}
              priority
              caption={
                <>
                  <span className="home-open__caption-kicker">{home.photo.kicker}</span>
                  <span className="home-open__caption-name">{parkName}</span>
                </>
              }
            />
          ) : (
            <div className="home-engraved home-engraved--band" role="img" aria-label={home.photo.alt}>
              {home.photo.alt}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default HomeBanner;
