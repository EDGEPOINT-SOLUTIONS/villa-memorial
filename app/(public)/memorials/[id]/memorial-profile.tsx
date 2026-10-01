import Link from "next/link";
import { SectionHead } from "@/components/kit";
import { MemorialPlot } from "@/components/memorials/memorial-plot";
import type { Lot } from "@/lib/api-client/property";
import type { ContactInfo } from "@/lib/api-client/landing";
import { monogram } from "@/lib/family/family-view";
import {
  memorialFirstLine,
  memorialPlotCode,
  memorialRestingLine,
  type PublishedMemorial,
} from "@/lib/memorials";

/**
 * The published memorial — a single person remembered.
 *
 * WHAT APPEARS IS WHAT THE FAMILY PUBLISHED: the name, the life dates, their own
 * words, their photograph when they shared one (otherwise the initials the
 * family-portal design already uses), and the resting place from the office
 * record. The living are never shown: the only contact on the page is the office
 * line, and no relative, address or date of birth appears anywhere.
 *
 * THE FINDER (captain, 2026-09-30): "Where they rest" no longer stops at a text
 * line. When the record carries a plot code the band PINS the plot on the park
 * masterplan, lists the lot's own facts, and offers ONE action — `View this lot
 * in the 3D map` — that opens the 3D park already framed on the plot, so a
 * family never hunts for it. When the family published no plot, the band says so
 * and prints the office line; it never invents a pin.
 *
 * The portrait is shown WHOLE (`object-fit: contain`), never cropped: on this
 * page the photograph is a person.
 */
export function MemorialProfile({
  memorial,
  contact,
  lots = [],
}: {
  memorial: PublishedMemorial;
  contact: ContactInfo;
  lots?: Lot[];
}) {
  const firstLine = memorialFirstLine(memorial);
  const more = memorial.remembrance.slice(1);
  const place = memorialRestingLine(memorial);
  const plot = memorialPlotCode(memorial);
  const initials = monogram(memorial.name);
  const dates = memorial.life_dates.display;

  return (
    <article className="mem-profile">
      <section className="mem-profile__hero" aria-labelledby="memorial-title">
        <figure className="mem-profile__portrait">
          {memorial.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- family-supplied photograph
            <img
              src={memorial.photo.src}
              alt={memorial.photo.alt}
              width={480}
              height={600}
              loading="eager"
              decoding="async"
            />
          ) : (
            <span className="mem-profile__mark" aria-hidden="true">
              {initials}
            </span>
          )}
        </figure>
        <div className="mem-profile__intro">
          <p className="eyebrow-label">In loving memory</p>
          <h1 className="mem-profile__name" id="memorial-title">
            {memorial.name}
          </h1>
          {/* A name-only memorial is complete: the dates show only when the
              family chose each year. */}
          {dates ? <p className="mem-profile__dates">{dates}</p> : null}
          {firstLine ? <p className="mem-profile__lead">{firstLine}</p> : null}
          <div className="mem-profile__actions">
            <Link className="btn btn--secondary" href="/memorials">
              Find another memorial
            </Link>
            <a className="btn btn--primary" href={contact.phoneHref}>
              Call {contact.phoneDisplay}
            </a>
          </div>
        </div>
      </section>

      {more.length > 0 ? (
        <section className="mem-profile__words" aria-labelledby="memorial-words-title">
          <SectionHead
            id="memorial-words-title"
            kicker="Their family’s words"
            title="The remembrance"
          />
          {more.map((line, index) => (
            <p className="mem-profile__word" key={index}>
              {line}
            </p>
          ))}
        </section>
      ) : null}

      <section className="mem-profile__place" aria-labelledby="memorial-place-title">
        <SectionHead id="memorial-place-title" kicker="Resting place" title="Where they rest" />
        <p className="mem-profile__place-line">
          {place ?? "The family has not published a resting place."}
        </p>
        {plot ? (
          <>
            <MemorialPlot plotCode={plot} lots={lots} />
            <p className="mem-service-note">
              From the office record — ask the office for directions before a visit.
            </p>
          </>
        ) : (
          <p className="mem-service-note">
            From the office record — ask the office for directions before a visit.
          </p>
        )}
      </section>

      <section className="mem-profile__published" aria-labelledby="memorial-published-title">
        <SectionHead id="memorial-published-title" title="Published by the family" />
        <p className="mem-profile__published-line">
          {memorial.published_on ? `Published on ${memorial.published_on}. ` : ""}
          The family can change or close this memorial at any time.
        </p>
        <p className="mem-service-note">
          The only contact here is the office:{" "}
          <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
        </p>
      </section>
    </article>
  );
}
