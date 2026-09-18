import Link from "next/link";
import type { ContactInfo } from "@/lib/api-client/landing";
import { monogram } from "@/lib/family/family-view";
import {
  memorialFirstLine,
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
 * `tests/unit/memorials-pages.test.tsx` renders this component directly with a
 * test record — the fixture store publishes no one (nothing may be fabricated),
 * so the shape is proven here without a real person ever reaching a page.
 */
export function MemorialProfile({
  memorial,
  contact,
}: {
  memorial: PublishedMemorial;
  contact: ContactInfo;
}) {
  const firstLine = memorialFirstLine(memorial);
  const more = memorial.remembrance.slice(1);
  const place = memorialRestingLine(memorial);
  const initials = monogram(memorial.name);

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
          <p className="mem-profile__dates">{memorial.life_dates.display}</p>
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
          <p className="mem-kicker">Their family&rsquo;s words</p>
          <h2 className="mem-section-title" id="memorial-words-title">
            The remembrance
          </h2>
          {more.map((line, index) => (
            <p className="mem-profile__word" key={index}>
              {line}
            </p>
          ))}
        </section>
      ) : null}

      <section className="mem-profile__place" aria-labelledby="memorial-place-title">
        <p className="mem-kicker">Resting place</p>
        <h2 className="mem-section-title" id="memorial-place-title">
          Where they rest
        </h2>
        <p className="mem-profile__place-line">
          {place ?? "The family has not published a resting place."}
        </p>
        <p className="mem-service-note">
          From the office record — ask the office for directions before a visit.
        </p>
      </section>

      <section className="mem-profile__published" aria-labelledby="memorial-published-title">
        <h2 className="mem-section-title" id="memorial-published-title">
          Published by the family
        </h2>
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
