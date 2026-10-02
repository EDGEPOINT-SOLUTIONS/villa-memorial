import Link from "next/link";
import { EmbalmingDayPicker } from "@/components/villa/embalming-day-picker";
import { ItemQuoteButton } from "@/components/villa/item-quote-button";
import {
  ChapelBookingButton,
  type ChapelCatalogueItem,
} from "@/components/chapel-booking-dialog";
import { getQuoteLineCatalogDetail } from "@/lib/quote-basket/quote-line-details";
import { ServiceIcons, IconChapel } from "@/components/villa/service-icons";
import { PublicDisclosure } from "@/components/kit";
import { CHAPEL_CLASS_LABEL, CHAPEL_CLASS_ORDER, type ChapelClass } from "@/lib/chapel-booking";
import type { ChapelScheduleResource } from "@/lib/api-client/chapel-reservations";
import type { ContactInfo } from "@/lib/api-client/landing";
import {
  ALACARTE_LINES,
  CHAPEL_SKUS,
  EMBALMING_EXTRA_DAY_SKU,
  embalmingDaySku,
} from "@/lib/catalogue-skus";
import { CHAPEL_RATES, EMBALMING_RATES } from "@/lib/villa-pricing";
import { CHAPEL_SAMPLE_NOTE, SERVICE_SAMPLE_NOTE } from "@/lib/media";
import { CLIENT_PHOTOS, clientPhotoWide, type ClientPhotoId } from "@/lib/client-photos";
import { catalogueItemPhoto } from "@/lib/catalogue-imagery";

/**
 * Funeraria memorial services — the client's 2026 service offerings, quoted.
 *
 * REBUILT 2026-09-30 (captain: "following how our homepage looks, let's apply
 * the same to services page … the images for services are so big … the ui/ux of
 * it is not built by a senior ui/ux engineer"). The page now wears the home's
 * band grammar: a centred, designed band head per section; equal photographic
 * plates sized to the home's own service band; facts as labelled figures; one
 * gold action per item; and ONE shared note per band instead of a caption per
 * card. The sheets' own scoping headings ("If they will not get the package:")
 * are gone from the customer page — they are sheet furniture, and /services
 * publishes no package price for a reader to be "not getting".
 *
 * Request-for-Quote (captain's minutes, 2026-09-21, item 5): no amount is
 * published. Each service line — the five a-la-carte fees, the embalming day
 * ladder and the two chapel classes — carries ONE action that ADDS THE LINE to
 * the quote basket so a family can add several things and send one inquiry. The
 * office prepares a customised quotation from the request.
 *
 * PROVENANCE: `lib/villa-pricing.ts` holds the sheet map (`ALACARTE_SCOPE` stays
 * the office's transcription source even though the page no longer prints it).
 * The chapel photographs are the client's own sample set-ups; both are marked as
 * samples ONCE in the band's shared foot.
 */

type QuoteActionProps = {
  /** The service exactly as the storefront names it (the quote form's topic). */
  item: string;
  /** The catalogue SKU, so the office can quote the exact line. */
  sku?: string;
  /** Extra context for the office (scope, stay length, conditions). */
  note?: string;
  label?: string;
};

/**
 * One "Add to Quote" item action — the only action a funeral-service line
 * takes. The button names the service in its accessible label ("Add to Quote:
 * <service>"), so a screen reader listing the page's controls does not hear
 * the same label for every line, and the visible label leads the name
 * (WCAG 2.5.3 label-in-name).
 */
function QuoteAction({ item, sku, note, label = "Add to Quote" }: QuoteActionProps) {
  return (
    <ItemQuoteButton
      lines={[{ sku: sku ?? item, name: item, detail: note }]}
      name={item}
      label={label}
    />
  );
}

/** Scope shared by the a-la-carte request actions. */
const ALACARTE_REQUEST_NOTE =
  "A-la-carte service — applies when the family does not take a package.";

const EMBALMING_REQUEST_NOTE =
  "Embalming, make-up and dressing. A-la-carte service — applies when the family does not take a package.";

/**
 * The chapel stay length, DERIVED from the sheet's own rows (never typed): the
 * first and last day counts the 2026 chapel table prices.
 */
const CHAPEL_STAY_LABEL = `${CHAPEL_RATES[0].days}–${CHAPEL_RATES[CHAPEL_RATES.length - 1].days} days`;

/** The same span read as a modifier ("3–9 day stays"), for the shared foot. */
const CHAPEL_STAY_SPAN = `${CHAPEL_RATES[0].days}–${CHAPEL_RATES[CHAPEL_RATES.length - 1].days} day`;

/**
 * The centred, designed band head — the home's `.home-band-head` grammar
 * (kicker · title · one-line lead · one action) rendered with this page's own
 * class names so the services lane owns its block. The heading id is what the
 * band's `aria-labelledby` points at.
 */
function ServiceBandHead({
  id,
  kicker,
  title,
  lead,
  action,
}: {
  id: string;
  kicker: string;
  title: string;
  lead: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sv-band__head">
      <p className="sv-band__kicker">{kicker}</p>
      <h2 id={id} className="sv-band__title">
        {title}
      </h2>
      <p className="sv-band__lead">{lead}</p>
      {action ? <div className="sv-band__action">{action}</div> : null}
    </div>
  );
}

/**
 * The plate's photograph. The shared map (`catalogueItemPhoto`) publishes the
 * CARD crop, and a card is 4:3; the catalogue row here is the home's 3:2 plate,
 * so a client photograph takes its own 3:2 `wide` derivative instead (the crop
 * scripts/build-client-photos.mjs publishes for exactly this job). An asset
 * outside the client set (a composition derivative, the park gate) is used as
 * stored. The plate fills the frame with `object-fit: cover`, so the five tiles
 * stay equal and seamless.
 */
function platePhoto(sku: string) {
  const photo = catalogueItemPhoto(sku);
  if (!photo) return null;
  if (photo.id in CLIENT_PHOTOS) {
    const wide = clientPhotoWide(photo.id as ClientPhotoId);
    return { src: wide.src, srcSet: wide.srcSet, width: wide.width, height: wide.height, alt: photo.alt };
  }
  return {
    src: photo.src,
    srcSet: photo.srcSet,
    width: photo.width ?? 960,
    height: photo.height ?? 640,
    alt: photo.alt,
  };
}

/** The at-need services block: the five a-la-carte lines, each requestable. */
export function AlacarteServiceRates({
  notes,
}: {
  /** One plain description per service line, edited in Pages & content. */
  notes: Readonly<Record<string, string>>;
}) {
  return (
    <section className="story-band sv-band" id="services" aria-label="Services">
      {/* The band head is GONE (captain, 2026-10-02): the five service plates are
          the page's first content, so no kicker/title/lead sits above them. */}

      {/* FIVE EQUAL PLATES, ONE ROW — the home's own services band (captain,
          2026-09-30). Each plate is the home's 3:2 shape with `object-fit:
          contain`, so no photograph is cropped; the client's one line sits under
          the name and the single gold action closes the tile. At ≤48rem the row
          re-flows to two-up so five services cost three rows, not five. */}
      <ul className="sv-plates" aria-label="The five services">
        {ALACARTE_LINES.map((fee) => {
          const photo = platePhoto(fee.sku);
          const IconShape = ServiceIcons[fee.service] ?? IconChapel;
          return (
            <li className="sv-tile" key={fee.sku}>
              {photo ? (
                <span className="sv-tile__plate">
                  {/* The client's own photograph. It is not a link: a service
                      line has no detail route to open. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- the client's own photograph */}
                  <img
                    src={photo.src}
                    srcSet={photo.srcSet}
                    sizes="(max-width: 48rem) 46vw, 23rem"
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              ) : (
                /* The honest placeholder: the service's own icon on the quiet
                   wash the shared image frame uses, not a stand-in photograph. */
                <span className="sv-tile__plate sv-tile__plate--icon" aria-hidden="true">
                  <IconShape />
                </span>
              )}
              <b className="sv-tile__name">{fee.service}</b>
              <span className="sv-tile__line">{notes[fee.service] ?? ""}</span>
              <span className="sv-tile__action">
                <QuoteAction item={fee.service} sku={fee.sku} note={ALACARTE_REQUEST_NOTE} />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="sv-band__all">
        <ItemQuoteButton
          lines={ALACARTE_LINES.map((fee) => ({
            sku: fee.sku,
            name: fee.service,
            detail: ALACARTE_REQUEST_NOTE,
          }))}
          name="At-need services — all five"
          label="Add all five to Quote"
        />
      </div>

      {/* ONE sample note for the whole band — the four sample photographs
          (retrieval, delivery, viewing, coffin) share it; it replaces the
          per-card captions the page used to repeat. */}
      <p className="sv-band__note">{SERVICE_SAMPLE_NOTE}</p>
    </section>
  );
}

/**
 * Embalming by day: a day-count picker that requests a quote for the chosen
 * stay, then the sheet's full day ladder behind the disclosure. No amount is
 * shown anywhere — the office quotes the stay.
 */
export function EmbalmingRates({ contact }: { contact: ContactInfo }) {
  return (
    <section className="story-band sv-band" id="embalming" aria-labelledby="embalming-title">
      <ServiceBandHead
        id="embalming-title"
        kicker="Embalming"
        title="Embalming — quoted by the day"
        lead="Includes make-up and dressing; the office confirms the day count."
      />

      {/* ONE CENTRED COLUMN (captain, 2026-09-30). The band used to sit in two
          columns that measured 292 px against 43 px, so the day ladder's summary
          bar floated alone at the top-right. The choice now leads and the full
          ladder is a full-width disclosure underneath it. */}
      <div className="sv-embalm">
        <EmbalmingDayPicker />
        <p className="story-note">
          Not sure how many days? Most families choose 3 — call{" "}
          <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
        </p>
        <PublicDisclosure summary="See every day count, 3 to 9 days">
          <ul className="sv-stays" aria-label="Embalming day counts">
            {EMBALMING_RATES.map((row) => (
              <li className="sv-stay" key={row.days}>
                <span className="sv-stay__days">{row.days} days</span>
                <span className="sv-stay__actions">
                  <QuoteAction
                    item={`Embalming — ${row.days} days`}
                    sku={embalmingDaySku(row.days)}
                    note={EMBALMING_REQUEST_NOTE}
                  />
                </span>
              </li>
            ))}
            <li className="sv-stay">
              <span className="sv-stay__days">More than 9</span>
              <span className="sv-stay__actions">
                <QuoteAction
                  item="Embalming — beyond 9 days"
                  sku={EMBALMING_EXTRA_DAY_SKU}
                  note={`${EMBALMING_REQUEST_NOTE} More than nine days.`}
                />
              </span>
            </li>
          </ul>
        </PublicDisclosure>
      </div>
    </section>
  );
}

/**
 * The chapel options — THE CHAPEL SPREAD (captain, 2026-09-30: "improve the
 * section Chapel Use … what is your most premium quality design to present that
 * section"). A family is choosing BETWEEN two rooms, so the band presents a
 * choice: two equal dossiers (a whole 3:2 photograph, the class label over the
 * room's name, the client's one line, the two facts a family compares as
 * labelled figures, and one gold "Ask for dates"), then ONE shared foot that
 * carries the logistics and the sample note once.
 *
 * THE NAME IS THE PARK'S RECORD: the dossier's name reads the same
 * staff-editable chapel record (lib/api-client/chapel-store.ts) the schedule
 * does — a rename on /staff/schedule lands here. Each room's ONE action opens the
 * REAL booking step (captain D5-A, 2026-09-30): the dialog picks the chapel, the
 * dates and the stay, checks the park's schedule and HOLDS the range, so the
 * quote line carries its held dates and stays "To be quoted by the office".
 */
export function ChapelRates({
  chapels,
  chapelNotes,
}: {
  /** The park's active chapel records (getChapelSchedule().chapels). */
  chapels: ChapelScheduleResource[];
  /** One copy line per class, edited in Pages & content. */
  chapelNotes: Readonly<Record<ChapelClass, string>>;
}) {
  /**
   * Each class's sample photograph is the client's own 2026 set (lib/client-photos.ts):
   * the hall for the common class, a decorated viewing room for the private one. The
   * client's material carries no room name or capacity — the name comes from the
   * park's record and the photo stays an illustrative sample.
   */
  const classPhoto = {
    common: clientPhotoWide("chapel-hall-candle-pedestals"),
    private: clientPhotoWide("wake-setup-lamp-alcove"),
  } as const;
  const classPhotoAlt: Record<ChapelClass, string> = {
    common:
      "The chapel hall in the client's own photograph — a draped side table and tall candle pedestals on a green carpet",
    private:
      "A decorated private viewing room in the client's own photograph — purple and white drapes, hanging flowers and lit lamp stands",
  };

  // The catalogue fact each class's booking line needs, read from the recorded
  // commerce fixture by SKU — never typed here.
  const chapelItems: Partial<Record<ChapelClass, ChapelCatalogueItem>> = {};
  for (const cls of CHAPEL_CLASS_ORDER) {
    const sku = CHAPEL_SKUS[cls];
    chapelItems[cls] = {
      sku,
      name: getQuoteLineCatalogDetail(sku)?.name ?? `Chapel use — ${CHAPEL_CLASS_LABEL[cls].toLowerCase()}, per day`,
    };
  }

  // One dossier per class the park's record carries, in the sheet's class order.
  const cards = CHAPEL_CLASS_ORDER.flatMap((chapelClass) => {
    const record = chapels.find((chapel) => chapel.chapel_class === chapelClass);
    return record ? [{ chapelClass, record }] : [];
  });

  return (
    <section className="story-band sv-band" id="chapel" aria-labelledby="chapel-title">
      <ServiceBandHead
        id="chapel-title"
        kicker="The chapel"
        title="Two rooms for your dates"
        lead="A shared hall, or a room for your family alone."
        action={
          <Link className="btn btn--secondary" href="/facilities#rooms">
            See both rooms →
          </Link>
        }
      />

      {cards.length === 0 ? (
        <p className="story-note">
          The park has not published an active chapel right now — call the office for dates.
        </p>
      ) : (
        <>
          <div className="sv-rooms">
            {cards.map(({ chapelClass, record }) => {
              const photo = classPhoto[chapelClass];
              return (
                <article className="sv-room" key={record.id}>
                  <span className="sv-room__plate">
                    {/* The client's own photograph, whole: a 3:2 plate takes the
                        picture's own 3:2 shape, so nothing is cropped. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- the client's own photograph */}
                    <img
                      src={photo.src}
                      srcSet={photo.srcSet}
                      sizes="(max-width: 48rem) 92vw, 34rem"
                      alt={classPhotoAlt[chapelClass]}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <p className="sv-room__class">{CHAPEL_CLASS_LABEL[chapelClass]}</p>
                  <h3 className="sv-room__name">{record.name}</h3>
                  <p className="sv-room__what">{chapelNotes[chapelClass]}</p>
                  <dl className="sv-room__facts">
                    <div>
                      <dt>Room fits about</dt>
                      <dd>{record.capacity} people</dd>
                    </div>
                    <div>
                      <dt>Stay</dt>
                      <dd>{CHAPEL_STAY_LABEL}</dd>
                    </div>
                  </dl>
                  <div className="sv-room__action">
                    <ChapelBookingButton
                      chapelClass={chapelClass}
                      items={chapelItems}
                      label="Ask for dates"
                      ariaLabel={`Ask for dates: ${record.name}`}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          {/* ONE shared enquiry foot: the logistics and the single sample note,
              repeated nowhere. */}
          <div className="sv-room-foot">
            <p>{CHAPEL_STAY_SPAN} stays · the office confirms availability and the price.</p>
            <p className="sv-band__note">{CHAPEL_SAMPLE_NOTE}</p>
          </div>
        </>
      )}
    </section>
  );
}

/** All three service blocks, in the order /services lays them out. */
export function ServiceRates2026({
  contact,
  alacarteNotes,
  chapelNotes,
  chapels,
}: {
  /** The staff-editable 24/7 line (landing content) — never a typed number. */
  contact: ContactInfo;
  /** The five a-la-carte descriptions, edited in Pages & content. */
  alacarteNotes: Readonly<Record<string, string>>;
  /** The two chapel-class copy lines, edited in Pages & content. */
  chapelNotes: Readonly<Record<ChapelClass, string>>;
  /** The park's active chapel records (getChapelSchedule().chapels). */
  chapels: ChapelScheduleResource[];
}) {
  return (
    <>
      <AlacarteServiceRates notes={alacarteNotes} />
      <EmbalmingRates contact={contact} />
      <ChapelRates chapels={chapels} chapelNotes={chapelNotes} />
    </>
  );
}