import type { ContactInfo } from "@/lib/api-client/landing";
import { SectionHead } from "@/components/public/section-head";
import {
  LOCATION_MAP_NOTE,
  directionsUrl,
  locationPlaces,
  mapSearchUrl,
} from "@/lib/location-map";

/**
 * LocationBlock — where Villa Memorial is, and how to get there (client's
 * minutes 2026-09-21, item 6). One public band: a section head, a STATIC map
 * card carrying the park's recorded address, one clear "Get directions" action,
 * the office as a supporting row, and a one-line honesty note.
 *
 * It renders the Phase 0 `SectionHead` and nothing else bespoke; the addresses
 * and the directions URLs come from `lib/location-map.ts` (recorded landing
 * content + the provider builders), never typed here. It is a plain server
 * component — no hooks, no map SDK, no third-party embed — so it is safe on any
 * public page and in the offline demo; `LOCATION_MAP_NOTE` says plainly that the
 * card is static and the directions action is what leaves the site.
 *
 * Placement: the pages customers look at when they need the place — `/contact`
 * (the contact surface) and `/map` (the park page) — plus a "Get directions"
 * action in the shared footer's park line, so every public page carries it.
 */
export function LocationBlock({
  contact,
  className,
  titleId = "location-title",
}: {
  contact: ContactInfo;
  className?: string;
  /** The heading id, so the band can `aria-labelledby` it without collision. */
  titleId?: string;
}) {
  const places = locationPlaces(contact);
  if (places.length === 0) return null;

  const [primary, ...others] = places;

  return (
    <section
      className={`location-block${className ? ` ${className}` : ""}`}
      data-location-block=""
      aria-labelledby={titleId}
    >
      <SectionHead
        id={titleId}
        kicker="Visit us"
        title="Where to find Villa Memorial"
        lead="Directions open in your maps app from the recorded address below."
      />

      <div className="location-block__body">
        <div className="location-map">
          <span className="location-map__pin" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
              <path
                fill="currentColor"
                d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
              />
            </svg>
          </span>
          <div className="location-map__text">
            <h3 className="location-map__name">{primary.label}</h3>
            <p className="location-map__address">{primary.address}</p>
          </div>
        </div>

        <div className="location-block__actions">
          <a
            className="btn btn--primary"
            href={directionsUrl("google", primary.address)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions
          </a>
          <a
            className="btn btn--secondary"
            href={directionsUrl("apple", primary.address)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apple Maps
          </a>
          <a className="btn btn--secondary" href="/map">
            Park map
          </a>
        </div>
      </div>

      {others.length > 0 ? (
        <ul className="location-block__other">
          {others.map((place) => (
            <li key={place.id} className="location-other">
              <span className="location-other__label">{place.label}</span>
              <span className="location-other__address">{place.address}</span>
              <span className="location-other__actions">
                <a
                  className="location-other__link"
                  href={directionsUrl("google", place.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions
                </a>
                <a
                  className="location-other__link"
                  href={mapSearchUrl("google", place.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on map
                </a>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="location-block__note">{LOCATION_MAP_NOTE}</p>
    </section>
  );
}
