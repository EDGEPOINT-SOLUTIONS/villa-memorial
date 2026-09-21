import Link from "next/link";
import { ChapelBookingButton, type ChapelCatalogueItem } from "@/components/chapel-booking-dialog";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { EmbalmingDayPicker } from "@/components/villa/embalming-day-picker";
import { InCartNotice } from "@/components/villa/in-cart-notice";
import { ServiceIcons, IconChapel } from "@/components/villa/service-icons";
import { PublicDisclosure, PublicImage, SectionHead } from "@/components/kit";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { CHAPEL_CLASS_LABEL, CHAPEL_CLASS_ORDER, type ChapelClass } from "@/lib/chapel-booking";
import type { ChapelScheduleResource } from "@/lib/api-client/chapel-reservations";
import type { CatalogItem } from "@/lib/api-client/commerce";
import type { ContactInfo } from "@/lib/api-client/landing";
import {
  ALACARTE_LINES,
  CHAPEL_PER_DAY,
  CHAPEL_SKUS,
  EMBALMING_EXTRA_DAY_SKU,
  embalmingDaySku,
} from "@/lib/catalogue-skus";
import {
  ALACARTE_SCOPE,
  ALACARTE_SERVICE_TOTAL,
  CHAPEL_NOTES,
  CHAPEL_RATES,
  EMBALMING_PER_DAY_BEYOND_9,
  EMBALMING_RATES,
  php,
} from "@/lib/villa-pricing";
import { CHAPEL_SAMPLE_NOTE } from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";

/**
 * Funeraria memorial services — the client's 2026 service prices, in the
 * captain-approved 2026-09-16 layout (docs/08-delivery/services-design/).
 *
 * Provenance (see lib/villa-pricing.ts for the full sheet map):
 *  - "2026 price FV website A" (= "PRICE LIST FOR 2026 II"), block "If they
 *    will not get the package": embalming per day (3–9 days, +₱1,500/day
 *    beyond), the five a-la-carte fees and the sheet's own bottom-line total.
 *    This is the SAME scope the package pages state for embalming: these rates
 *    apply when a family does not take a package.
 *  - "PRICE LIST FOR 2026 III": chapel use only (common & private, per-day rate
 *    with the 3–9 day totals and the senior-citizen totals) plus its notes —
 *    the ₱1,000 miscellaneous fee, the sheet's own senior-per-day line, and the
 *    chapel-only groceries note.
 *
 * No figure is authored here; every amount comes from lib/villa-pricing.ts and
 * is pinned by tests/unit/villa-pricing.test.ts. Each line binds to its
 * catalogue SKU through lib/catalogue-skus.ts and offers the storefront pair:
 * Add to cart (the exact catalogue SKU/price) and Request order (the prefilled
 * capture — an enquiry, never a reservation). A chapel stay adds one unit per
 * day (quantity = the row's day count) and opens the booking step instead of a
 * straight add.
 *
 * Senior-first layout (approved design): one .sv-section per price block, 18px
 * body, one decision per row, prices always with their unit. The embalming
 * table and the sheet's 3–9 day chapel schedule are published in full behind a
 * disclosure ("sv-stay" rows), so a phone never scrolls a table sideways. The
 * chapel photographs are the client's own sample set-ups cropped from the TYPES
 * OF COFFIN sheet; the sheet marks them "(Illustration purposes only)", so both
 * cards carry CHAPEL_SAMPLE_NOTE and never claim a fixed room.
 */

type CatalogueLookup = (sku: string) => CatalogItem | undefined;

function catalogueLookup(items: CatalogItem[]): CatalogueLookup {
  const bySku = new Map(items.map((item) => [item.sku, item]));
  return (sku: string) => bySku.get(sku);
}

function money(n: number): string {
  return php(n);
}

/** Cart shape for a catalogue entry (or undefined when the storefront can't offer it). */
function cartItemOf(item: CatalogItem | undefined) {
  if (!item) return undefined;
  return {
    sku: item.sku,
    name: item.name,
    itemType: item.item_type,
    unitPriceCents: item.unit_price_cents,
    currency: item.currency,
  };
}

/** The two actions for a price-list line, or a request-only fallback on drift. */
function LineActions({
  item,
  prefill,
  quantity,
  addLabel,
  secondaryAsLink = false,
}: {
  item: CatalogItem | undefined;
  prefill?: { price?: string; note?: string };
  quantity?: number;
  addLabel?: string;
  /** Keep ONE gold action per ledger row (plan §5.2): Request order is a link. */
  secondaryAsLink?: boolean;
}) {
  const cartItem = cartItemOf(item);
  if (!item || !cartItem) {
    return <span className="text-sm text-muted">Not offered online — ask the office.</span>;
  }
  return (
    <CatalogueActions
      item={cartItem}
      prefill={prefill}
      quantity={quantity}
      addLabel={addLabel}
      displayPrice={item.display_price}
      secondaryAsLink={secondaryAsLink}
    />
  );
}

/** Request context shared by every a-la-carte line. */
const ALACARTE_REQUEST_NOTE =
  "A-la-carte 2026 rate — applies when the family does not take a package.";

/** The at-need services block: the five a-la-carte lines as a compact ledger. */
export function AlacarteServiceRates({
  items,
  notes,
}: {
  items: CatalogItem[];
  /** One plain description per service line, edited in Pages & content. */
  notes: Readonly<Record<string, string>>;
}) {
  const lookup = catalogueLookup(items);

  return (
    <section className="story-band" id="services" aria-labelledby="services-rates-title">
      <SectionHead
        id="services-rates-title"
        kicker={ALACARTE_SCOPE}
        title="Services and prices"
        lead="Five priced lines — add each, or send the whole set as one request."
        action={<span className="text-sm text-muted">Add to cart reserves nothing; pay only at the office.</span>}
      />

      <ul className="story-rates">
        {ALACARTE_LINES.map((fee) => {
          const item = lookup(fee.sku);
          const IconShape = ServiceIcons[fee.service] ?? IconChapel;
          return (
            <li className="story-rate" key={fee.service}>
              <span className="story-rate__icon" aria-hidden="true">
                <IconShape />
              </span>
              <span className="story-rate__text">
                <span className="story-rate__name">{fee.service}</span>
                <span className="story-rate__desc">{notes[fee.service]}</span>
              </span>
              {/* A price block, not prose (structure over sentences). */}
              <span className="story-rate__price">
                {money(fee.amount)}
                <span className="story-rate__unit">per service</span>
              </span>
              <span className="story-rate__actions">
                <LineActions item={item} prefill={{ note: ALACARTE_REQUEST_NOTE }} secondaryAsLink />
                <InCartNotice sku={fee.sku} />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="story-total">
        <span className="story-total__label">All five services — the sheet&rsquo;s own total</span>
        <span className="story-total__amount">{money(ALACARTE_SERVICE_TOTAL)}</span>
        <p>
          Add each in the cart, or{" "}
          <Link
            href={buildRequestHref({
              item: "At-need services — all five",
              price: money(ALACARTE_SERVICE_TOTAL),
              note: "Retrieval, delivery, viewing equipment, ORD coffin and interment. A-la-carte 2026 rate — applies when the family does not take a package.",
            })}
          >
            send the whole set as one request
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/**
 * Embalming per day: the day picker, then the sheet's full day counts.
 * `contact` is the staff-editable 24/7 line from the landing content document —
 * the helper text below must show what the editor's document says.
 */
export function EmbalmingRates({
  items,
  contact,
}: {
  items: CatalogItem[];
  contact: ContactInfo;
}) {
  const lookup = catalogueLookup(items);

  return (
    <section className="story-band" id="embalming" aria-labelledby="embalming-title">
      <SectionHead
        id="embalming-title"
        kicker={ALACARTE_SCOPE}
        title="Embalming — priced by the day"
        lead="Includes make-up and dressing; the office confirms the day count."
      />

      <EmbalmingDayPicker items={items} />

      <PublicDisclosure summary="See every day count, 3 to 9 days">
        <ul className="sv-stays" aria-label="Embalming prices by day">
          {EMBALMING_RATES.map((row) => {
            const item = lookup(embalmingDaySku(row.days));
            return (
              <li className="sv-stay" key={row.days}>
                <span className="sv-stay__days">{row.days} days</span>
                <span className="sv-stay__prices">
                  <span>
                    Embalming <b>{money(row.amount)}</b> for {row.days} days
                  </span>
                </span>
                <span className="sv-stay__actions">
                  <LineActions
                    item={item}
                    prefill={{ note: `${ALACARTE_REQUEST_NOTE} ${row.days} days' embalming.` }}
                    addLabel={`Add ${row.days} days`}
                    secondaryAsLink
                  />
                </span>
              </li>
            );
          })}
          <li className="sv-stay">
            <span className="sv-stay__days">More than 9</span>
            <span className="sv-stay__prices">
              <span>
                Embalming <b>+{money(EMBALMING_PER_DAY_BEYOND_9)}</b> per extra day
              </span>
            </span>
            <span className="sv-stay__actions">
              <LineActions
                item={lookup(EMBALMING_EXTRA_DAY_SKU)}
                prefill={{
                  price: `${money(EMBALMING_PER_DAY_BEYOND_9)} / day`,
                  note: `${ALACARTE_REQUEST_NOTE} Additional embalming beyond nine days.`,
                }}
                secondaryAsLink
              />
            </span>
          </li>
        </ul>
      </PublicDisclosure>

      <p className="story-note">
        Not sure how many days? Most families choose 3 — call{" "}
        <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
      </p>
    </section>
  );
}

/**
 * The chapel options: one photo card per chapel the park's own record carries
 * (common & private, the per-day rate, the 3-day example, both actions).
 *
 * THE NAME IS THE PARK'S RECORD (content-catalogue Phase 3): the card title, the
 * booking dialog and the schedule all read the same staff-editable chapel record
 * (lib/api-client/chapel-store.ts) — a rename on /staff/schedule lands here and
 * in the dialog together. The card's class line and the "what it is" copy come
 * from the sheet / the page document. A chapel is NOT a one-click cart item:
 * every chapel action opens the booking step
 * (components/chapel-booking-dialog.tsx), where the customer picks the chapel, a
 * 3–9 day stay and a start date, sees that the park's own schedule has every one
 * of those days free, sees the exact price for the range, and only then adds it.
 * The prefilled request stays beside it for senior rates, questions and
 * office-arranged stays.
 *
 * TRIMMED (captain, 2026-09-21): the placeholder disclaimer, the full 3–9 day
 * "See every stay" schedule and the senior-rate footnote left this section. The
 * cards keep the per-day rate and the 3-day regular/senior examples; the
 * recorded placeholder chapel names/capacity and the sheet's senior-rate
 * disagreement remain in the data and the client questions, just not on the page.
 */
export function ChapelRates({
  items,
  chapels,
  chapelNotes,
}: {
  items: CatalogItem[];
  /** The park's active chapel records (getChapelSchedule().chapels). */
  chapels: ChapelScheduleResource[];
  /** One copy line per class, edited in Pages & content. */
  chapelNotes: Readonly<Record<ChapelClass, string>>;
}) {
  const lookup = catalogueLookup(items);
  const itemByClass: Record<ChapelClass, CatalogItem | undefined> = {
    common: lookup(CHAPEL_SKUS.common),
    private: lookup(CHAPEL_SKUS.private),
  };
  const chapelItems: Partial<Record<ChapelClass, ChapelCatalogueItem>> = {};
  for (const chapelClass of CHAPEL_CLASS_ORDER) {
    const cart = cartItemOf(itemByClass[chapelClass]);
    if (cart) chapelItems[chapelClass] = cart;
  }

  const chapelRequest = (record: ChapelScheduleResource, item: CatalogItem | undefined, perDay: number) =>
    buildRequestHref({
      item: `Chapel use — ${record.name}, per day`,
      sku: item?.sku,
      price: `${money(perDay)} / day`,
      note: `Chapel use when the service is not with Villa. ${CHAPEL_NOTES.miscFee}`,
    });

  /**
   * Each class's sample photograph is the client's own 2026 set (lib/client-photos.ts):
   * the hall for the common class, a decorated viewing room for the private one. The
   * client's material carries no room name or capacity — the name now comes from the
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
        title="Chapel — check the dates and book online"
        lead="Three to nine day stays, priced per day."
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
            const item = itemByClass[chapelClass];
            const perDay = CHAPEL_PER_DAY[chapelClass];
            const threeDay = CHAPEL_RATES[0][chapelClass];
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
                <p className="story-chapel__rate">
                  {money(perDay)} <span className="story-chapel__unit">per day</span>
                </p>
                <p className="story-chapel__what">{chapelNotes[chapelClass]}</p>
                <dl className="story-facts">
                  <div>
                    <dt>Room fits about</dt>
                    <dd>{record.capacity} people</dd>
                  </div>
                  <div>
                    <dt>3 days — regular</dt>
                    <dd>{money(threeDay.regular)}</dd>
                  </div>
                  <div>
                    <dt>3 days — senior citizen</dt>
                    <dd>{money(threeDay.senior)}</dd>
                  </div>
                </dl>
                <div className="story-actions">
                  {item ? (
                    <ChapelBookingButton
                      chapelClass={chapelClass}
                      items={chapelItems}
                      label="Check dates & price"
                    />
                  ) : null}
                  <Link href={chapelRequest(record, item, perDay)} className="catalogue-actions__link">
                    Request order
                  </Link>
                  <InCartNotice sku={item?.sku ?? ""} unit="stay" />
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
  items,
  contact,
  alacarteNotes,
  chapelNotes,
  chapels,
}: {
  items: CatalogItem[];
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
      <AlacarteServiceRates items={items} notes={alacarteNotes} />
      <EmbalmingRates items={items} contact={contact} />
      <ChapelRates items={items} chapels={chapels} chapelNotes={chapelNotes} />
    </>
  );
}
