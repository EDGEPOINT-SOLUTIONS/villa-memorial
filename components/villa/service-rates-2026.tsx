import Link from "next/link";
import { ResultsGrid } from "@/components/kit/results-grid";
import { ServiceCard } from "@/components/villa/service-card";
import { EmbalmingDayPicker } from "@/components/villa/embalming-day-picker";
import { PublicDisclosure, PublicImage, SectionHead } from "@/components/kit";
import { buildQuoteHref } from "@/lib/public-forms/request-prefill";
import { CHAPEL_CLASS_LABEL, CHAPEL_CLASS_ORDER, type ChapelClass } from "@/lib/chapel-booking";
import type { ChapelScheduleResource } from "@/lib/api-client/chapel-reservations";
import type { ContactInfo } from "@/lib/api-client/landing";
import {
  ALACARTE_LINES,
  CHAPEL_SKUS,
  EMBALMING_EXTRA_DAY_SKU,
  embalmingDaySku,
} from "@/lib/catalogue-skus";
import { ALACARTE_SCOPE, CHAPEL_NOTES, EMBALMING_RATES } from "@/lib/villa-pricing";
import { CHAPEL_SAMPLE_NOTE } from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { catalogueItemPhoto } from "@/lib/catalogue-imagery";

/**
 * Funeraria memorial services — the client's 2026 service offerings, quoted.
 *
 * Request-for-Quote (captain's minutes, 2026-09-21, item 5): the funeral-service
 * surfaces no longer publish a price. Each service line — the five a-la-carte
 * fees, the embalming day ladder and the two chapel classes — carries ONE
 * "Request a quote" action instead, which opens the public quote form
 * (`/quote`) prefilled with the service the visitor asked about. The office
 * prepares a customised quotation from the request.
 *
 * Nothing is priced here and no cart item is created: the request is the ONE
 * action, and it is an enquiry, never a reservation. The service labels and
 * SKUs still come from the sheet (lib/catalogue-skus.ts) so the request carries
 * the exact catalogue line the office can quote.
 *
 * PROVENANCE (lib/villa-pricing.ts holds the sheet map): "2026 price FV
 * website A" (= "PRICE LIST FOR 2026 II") block "If they will not get the
 * package": embalming per day and the five a-la-carte fees. "PRICE LIST FOR
 * 2026 III": chapel use (common & private). The sheet's figures are no longer
 * displayed; they remain the office's transcription source for a quotation.
 *
 * The chapel photographs are the client's own sample set-ups cropped from the
 * TYPES OF COFFIN sheet; the sheet marks them "(Illustration purposes only)", so
 * both cards carry CHAPEL_SAMPLE_NOTE and never claim a fixed room.
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
 * One Request-for-Quote action — the only action a funeral-service line takes.
 * The visually-hidden suffix names the service so a screen reader listing the
 * page's links does not read the same "Request a quote" for every line; the
 * visible label leads the accessible name (WCAG 2.5.3 label-in-name).
 */
function QuoteAction({ item, sku, note, label = "Request a quote" }: QuoteActionProps) {
  return (
    <Link className="btn btn--accent btn--sm" href={buildQuoteHref({ item, sku, note })}>
      {label}
      <span className="visually-hidden"> for {item}</span>
    </Link>
  );
}

/** Scope shared by the a-la-carte request actions. */
const ALACARTE_REQUEST_NOTE =
  "A-la-carte service — applies when the family does not take a package.";

const ALL_FIVE_NOTE =
  "Retrieval, delivery, viewing equipment, ORD coffin and interment — the whole at-need arrangement.";

const EMBALMING_REQUEST_NOTE =
  "Embalming, make-up and dressing. A-la-carte service — applies when the family does not take a package.";

/** The two chapel classes are quoted per stay; the office confirms availability. */
const CHAPEL_QUOTE_NOTE = "Chapel use when the service is not with Villa.";

/** The at-need services block: the five a-la-carte lines, each requestable. */
export function AlacarteServiceRates({
  notes,
}: {
  /** One plain description per service line, edited in Pages & content. */
  notes: Readonly<Record<string, string>>;
}) {
  return (
    <section className="story-band" id="services" aria-labelledby="services-rates-title">
      <SectionHead
        id="services-rates-title"
        kicker={ALACARTE_SCOPE}
        title="Services we provide"
        lead="Five services — ask for the ones you need."
      />

      {/* BOXES, NOT A LIST (captain, 2026-09-27: "more graphics … use boxes …
          dont overwhelm visitors"). Each line is a picture-first `.shop-card` —
          the same box /products, /plans and /lots render — carrying the client's
          own photograph for that service, its icon, its name and the client's one
          line. The prose that used to sit beside the list is gone; the one fact a
          family needs from it is a compact box above the grid. */}
      <p className="sv-scope">
        <strong>A Villa Memorial Plan already includes all five.</strong>{" "}
        <Link href="/plans">See what the plan covers →</Link>
      </p>

      <ResultsGrid
        items={ALACARTE_LINES}
        itemKey={(fee) => fee.sku}
        label="At-need services"
        emptyTitle="The service list is being prepared."
        className="sv-services"
        renderItem={(fee) => (
          <ServiceCard
            name={fee.service}
            line={notes[fee.service] ?? ""}
            photo={catalogueItemPhoto(fee.sku)}
            action={<QuoteAction item={fee.service} sku={fee.sku} note={ALACARTE_REQUEST_NOTE} />}
          />
        )}
      />

      <div className="story-actions">
        <QuoteAction
          item="At-need services — all five"
          note={ALL_FIVE_NOTE}
          label="Request a quote for all five"
        />
      </div>
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
    <section className="story-band" id="embalming" aria-labelledby="embalming-title">
      <SectionHead
        id="embalming-title"
        kicker={ALACARTE_SCOPE}
        title="Embalming — quoted by the day"
        lead="Includes make-up and dressing; the office confirms the day count."
      />

      {/* Two columns on a wide screen: the choice on the left, the full ladder on
          the right. It was a stack, which left the right half of a 1440px window
          empty while the ladder sat folded underneath. */}
      <div className="sv-embalm">
        <div>
          <EmbalmingDayPicker />
          <p className="story-note">
            Not sure how many days? Most families choose 3 — call{" "}
            <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
          </p>
        </div>

        <div className="sv-embalm__ladder">
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
      </div>
    </section>
  );
}

/**
 * The chapel options: one photo card per chapel the park's own record carries.
 *
 * THE NAME IS THE PARK'S RECORD: the card title reads the same staff-editable
 * chapel record (lib/api-client/chapel-store.ts) the schedule does — a rename on
 * /staff/schedule lands here. Each card's ONE action asks the office for dates
 * and a quote; a chapel stay is not priced here and is not a cart item.
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

  // One card per class the park's record carries, in the sheet's class order.
  const cards = CHAPEL_CLASS_ORDER.flatMap((chapelClass) => {
    const record = chapels.find((chapel) => chapel.chapel_class === chapelClass);
    return record ? [{ chapelClass, record }] : [];
  });

  return (
    <section className="story-band" id="chapel" aria-labelledby="chapel-title">
      <SectionHead
        id="chapel-title"
        kicker={CHAPEL_NOTES.scope}
        title="Chapel — ask us for dates and a quote"
        lead="Three to nine day stays; the office confirms availability and the price."
        action={<Link href="/facilities#rooms">See both rooms</Link>}
      />

      {cards.length === 0 ? (
        <p className="story-note">
          The park has not published an active chapel right now — call the office for dates.
        </p>
      ) : (
        <div className="story-chapels">
          {cards.map(({ chapelClass, record }) => {
            const photo = classPhoto[chapelClass];
            return (
              <article className="story-chapel" key={record.id}>
                <div className="story-figure">
                  <PublicImage
                    role="card"
                    className="story-chapel__media"
                    src={photo.src}
                    srcSet={photo.srcSet}
                    sizes="(max-width: 60rem) 92vw, 28rem"
                    alt={classPhotoAlt[chapelClass]}
                    width={photo.width}
                    height={photo.height}
                  />
                  <p className="public-image__caption">{CHAPEL_SAMPLE_NOTE}</p>
                </div>
                <h3 className="story-chapel__name">{record.name}</h3>
                <p className="story-chapel__class text-sm text-muted">{CHAPEL_CLASS_LABEL[chapelClass]}</p>
                <p className="story-chapel__what">{chapelNotes[chapelClass]}</p>
                <dl className="story-facts">
                  <div>
                    <dt>Room fits about</dt>
                    <dd>{record.capacity} people</dd>
                  </div>
                </dl>
                <div className="story-actions">
                  <QuoteAction
                    item={`Chapel use — ${record.name}`}
                    sku={CHAPEL_SKUS[chapelClass]}
                    note={CHAPEL_QUOTE_NOTE}
                  />
                </div>
              </article>
            );
          })}
        </div>
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
