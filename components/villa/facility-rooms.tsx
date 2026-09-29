import { CHAPEL_CLASS_LABEL, CHAPEL_CLASS_ORDER, type ChapelClass } from "@/lib/chapel-booking";
import type { ChapelScheduleResource } from "@/lib/api-client/chapel-reservations";
import type { ContactInfo } from "@/lib/api-client/landing";
import { CHAPEL_SKUS } from "@/lib/catalogue-skus";
import { CHAPEL_SAMPLE_NOTE } from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { ItemQuoteButton } from "@/components/villa/item-quote-button";

/**
 * FacilityRooms — the /facilities rooms comparator (approved plan §5, Band 2).
 *
 * WHAT IT IS FOR: the page's job is a family choosing WHERE the wake is held, so
 * its heart is a COMPARISON, not a catalogue. Two photo-headed columns put the
 * same facts side by side — capacity, stay, and who the room is shared with — so
 * a family can decide without calling to ask.
 *
 * WHERE EVERY FACT COMES FROM (nothing is authored here):
 *  · the room NAMES and the CAPACITY are the park's own schedule record
 *    (`getChapelSchedule()`, read by the page) — the same record /services and
 *    the home publish, so the three pages cannot name the park differently. A
 *    rename or a capacity edit on /staff/schedule lands here;
 *  · the class label is the frozen `CHAPEL_CLASS_LABEL` vocabulary;
 *  · the one line per class is the page document's copy (`chapelNotes`), shared
 *    with /services;
 *  · the 3–9 day stay is DERIVED from the sheet's own rows (`CHAPEL_RATES`);
 *  · the photographs are the client's own 2026 set, and the sheet's
 *    "(Illustration purposes only)" discipline stays on the band foot, so no
 *    photograph claims to be the exact room a family gets;
 *  · the quote line carries the sheet's exact SKU with NO amount — the office
 *    quotes by hand (captain's minute, 2026-09-21, item 5).
 *
 * HONEST STATE: the record's names/capacity are a labelled placeholder seed until
 * the client confirms the real chapel list. The band publishes the record the
 * rest of the product already publishes and says so in ONE plain provenance line;
 * it never invents a name or a figure. With no active chapel, the band prints the
 * honest line instead of an empty grid.
 */
export function FacilityRooms({
  chapels,
  chapelNotes,
  contact,
  stayedDaysLabel,
}: {
  /** The park's active chapel records (`getChapelSchedule().chapels`). */
  chapels: readonly ChapelScheduleResource[];
  /** One copy line per class, edited in Pages & content. */
  chapelNotes: Readonly<Record<ChapelClass, string>>;
  /** The staff-editable 24/7 line — never a typed number. */
  contact: ContactInfo;
  /**
   * The sheet's own stay span as words ("3–9 days"), passed by the page so the
   * figure has ONE owner (`CHAPEL_RATES`) and this view types none.
   */
  stayedDaysLabel: string;
}) {
  // Each class's sample photograph is the client's own 2026 set: the hall for the
  // common class, a decorated viewing room for the private one.
  const classPhoto: Record<ChapelClass, ReturnType<typeof clientPhotoWide>> = {
    common: clientPhotoWide("chapel-hall-candle-pedestals"),
    private: clientPhotoWide("wake-setup-lamp-alcove"),
  };
  const classPhotoAlt: Record<ChapelClass, string> = {
    common:
      "The chapel hall in the client's own photograph — a draped side table and tall candle pedestals on a green carpet",
    private:
      "A decorated private viewing room in the client's own photograph — purple and white drapes, hanging flowers and lit lamp stands",
  };
  /**
   * Who the room is shared with. This is the CLASS truth (a common hall is shared,
   * a private room is not) — the same statement the client's own class labels
   * make, and the same one /services prints. It is not a fact about a named room.
   */
  const classShares: Record<ChapelClass, string> = {
    common: "Other families",
    private: "Your family only",
  };

  // One column per class the park's record carries, in the sheet's class order.
  const cards = CHAPEL_CLASS_ORDER.flatMap((chapelClass) => {
    const record = chapels.find((chapel) => chapel.chapel_class === chapelClass);
    return record ? [{ chapelClass, record }] : [];
  });

  return (
    <section className="story-band fac-band" id="rooms" aria-labelledby="rooms-title">
      <div className="home-band-head">
        <p className="home-band-head__kicker">The rooms</p>
        <h2 id="rooms-title" className="home-band-head__title">
          Two rooms, for the whole wake
        </h2>
        <p className="home-band-head__lead">A shared hall, or a room for your family alone.</p>
      </div>

      {cards.length === 0 ? (
        <p className="fac-empty">
          The park has not published an active chapel right now — call the office for dates.
        </p>
      ) : (
        <>
          <div className="fac-rooms">
            {cards.map(({ chapelClass, record }) => {
              const photo = classPhoto[chapelClass];
              return (
                <article className="fac-room" key={record.id}>
                  <span className="fac-room__plate">
                    {/* The client's own photograph, whole: a 3:2 plate takes the
                        picture's own 3:2 shape, so nothing is cropped. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- the client's own photograph */}
                    <img
                      src={photo.src}
                      srcSet={photo.srcSet}
                      sizes="(max-width: 48rem) 92vw, 36rem"
                      alt={classPhotoAlt[chapelClass]}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <p className="fac-room__class">{CHAPEL_CLASS_LABEL[chapelClass]}</p>
                  <h3 className="fac-room__name">{record.name}</h3>
                  <p className="fac-room__what">{chapelNotes[chapelClass]}</p>
                  <dl className="fac-room__facts">
                    <div>
                      <dt>Fits about</dt>
                      <dd>{record.capacity} people</dd>
                    </div>
                    <div>
                      <dt>Stay</dt>
                      <dd>{stayedDaysLabel}</dd>
                    </div>
                    <div>
                      <dt>Who shares it</dt>
                      <dd>{classShares[chapelClass]}</dd>
                    </div>
                  </dl>
                  <div className="fac-room__action">
                    {/* One gold per-item action per column (the CTA contract),
                        plus the outline support call. Adding the line puts the
                        office's exact sheet SKU in the quote basket with NO
                        amount — the office quotes by hand. */}
                    <ItemQuoteButton
                      lines={[
                        {
                          sku: CHAPEL_SKUS[chapelClass],
                          name: `Chapel use — ${record.name}`,
                          itemType: "service",
                          detail: "Chapel use when the service is not with Villa.",
                        },
                      ]}
                      name={`Chapel use — ${record.name}`}
                      label="Ask for dates"
                    />
                    <a className="btn btn--secondary btn--sm" href={contact.phoneHref}>
                      <span className="visually-hidden">Ask about the {record.name}: </span>
                      Call {contact.phoneDisplay}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ONE shared foot: the logistics, the single sample note and the one
              provenance line. Printed once, not per card. */}
          <div className="fac-room-foot">
            <p>{stayedDaysLabel} · the office confirms availability and the price.</p>
            <p className="fac-room-foot__note">{CHAPEL_SAMPLE_NOTE}</p>
            <p className="fac-room-foot__note">
              Room names and capacity come from the park&rsquo;s own schedule record.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
