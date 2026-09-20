import Link from "next/link";
import { ChapelBookingButton, type ChapelCatalogueItem } from "@/components/chapel-booking-dialog";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { EmbalmingDayPicker } from "@/components/villa/embalming-day-picker";
import { InCartNotice } from "@/components/villa/in-cart-notice";
import { ServiceIcons, IconChapel, IconEmbalming } from "@/components/villa/service-icons";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import type { ChapelClass } from "@/lib/chapel-booking";
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
import {
  CHAPEL_SAMPLE_NOTE,
  PARK_PLACE_PHOTOS,
  WAKESETUP_ALCOVE_IMAGE,
} from "@/lib/media";
import { clientPhotoCard, clientPhotoWide, type ClientPhotoId } from "@/lib/client-photos";

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
}: {
  item: CatalogItem | undefined;
  prefill?: { price?: string; note?: string };
  quantity?: number;
  addLabel?: string;
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
    />
  );
}

/** Request context shared by every a-la-carte line. */
const ALACARTE_REQUEST_NOTE =
  "A-la-carte 2026 rate — applies when the family does not take a package.";

/**
 * One plain sentence per a-la-carte line, phrased from the sheet's own package
 * wording (the package inclusions in the Plans page document, read through
 * lib/plan-content.ts) so a card explains the service without inventing
 * anything the sheet does not say.
 */
const ALACARTE_NOTES: Readonly<Record<string, string>> = {
  Retrieval: "Into our care, first 25 km.",
  Delivery: "Delivery to the wake or chapel.",
  "Viewing equipment": "Lights, curtains and carpets, set up.",
  "ORD coffin": "A simple plain coffin. Other models: catalogue.",
  Interment: "Family cars and the graveside trip, staff included.",
};

/**
 * The photograph beside each a-la-carte line (2026-09-19 imagery pass).
 *
 * Every one is the client's OWN material: a casket in their care, the karwahe
 * that delivers, the alcove lights/curtains/carpets they build, and the park the
 * interment runs to. `alts` describes the picture; nothing here claims a
 * specific model, a specific room or a fixed set-up. Retrieval deliberately
 * shows a DIFFERENT photograph from the hero above it (the hero is the draped
 * set-up; this is the office's own bier) so one page never prints one picture
 * twice. Card sizing is the catalogue's 4:3 crop, with both published widths so
 * a phone never loads the desktop file.
 */
function alacartePhoto(id: ClientPhotoId, alt: string) {
  const card = clientPhotoCard(id);
  return { src: card.src, srcSet: card.srcSet, alt };
}

const ALACARTE_PHOTOS: Readonly<Record<string, { src: string; srcSet?: string; alt: string }>> = {
  Retrieval: alacartePhoto(
    "casket-white-open-lid",
    "A casket resting on a bier in the office's own hall, its lid raised — the office's care before a viewing",
  ),
  Delivery: alacartePhoto(
    "hearse-carriage-gold-side",
    "The office's funeral carriage (karwahe) with its gold casket compartment and white flowers",
  ),
  "Viewing equipment": alacartePhoto(
    "wake-setup-lamp-alcove",
    "A prepared viewing alcove — purple and white drapes, hanging flowers and lit lamp stands",
  ),
  "ORD coffin": alacartePhoto(
    "casket-white-closed",
    "A sample plain white casket with silver ornaments, closed on its bier",
  ),
  Interment: {
    src: PARK_PLACE_PHOTOS.mausoleum,
    alt: "The park's mausoleum and its lawn, where the graveside trip ends",
  },
};

/** One legend per priced section: what the two storefront actions mean. */
function ActionsLegend() {
  return (
    <div className="sv-howto">
      <span>
        <b>Add to cart</b> — reserves now; pay nothing here.
      </span>
      <span>
        <b>Request order</b> — a message; nothing reserved.
      </span>
    </div>
  );
}

/** The at-need services block: five sellable cards, the sheet's total. */
export function AlacarteServiceRates({ items }: { items: CatalogItem[] }) {
  const lookup = catalogueLookup(items);

  return (
    <section className="sv-section" id="services" aria-labelledby="services-rates-title">
      <p className="sv-section__kicker">{ALACARTE_SCOPE}</p>
      <h2 className="sv-section__title" id="services-rates-title">
        Services and prices
      </h2>
      <ActionsLegend />

      <div className="sv-prices sv-prices--photos">
        {ALACARTE_LINES.map((fee) => {
          const item = lookup(fee.sku);
          const IconShape = ServiceIcons[fee.service] ?? IconChapel;
          const photo = ALACARTE_PHOTOS[fee.service];
          return (
            <article className="sv-price-card sv-price-card--photo" key={fee.service}>
              {photo ? (
                <figure className="sv-price-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element -- the client's own 2026 photograph */}
                  <img
                    src={photo.src}
                    srcSet={photo.srcSet}
                    sizes="(max-width: 40rem) 92vw, (max-width: 70rem) 45vw, 22rem"
                    alt={photo.alt}
                    loading="lazy"
                  />
                </figure>
              ) : null}
              <h3 className="sv-price-card__head">
                <span className="sv-price-card__icon" aria-hidden="true">
                  <IconShape />
                </span>
                {fee.service}
              </h3>
              {/* A price block, not prose (structure over sentences). */}
              <div className="sv-price-card__amount">
                {money(fee.amount)} <span className="sv-price-card__unit">per service</span>
              </div>
              <p className="sv-price-card__plain">{ALACARTE_NOTES[fee.service]}</p>
              <div className="sv-price-card__actions">
                <LineActions item={item} prefill={{ note: ALACARTE_REQUEST_NOTE }} />
                <InCartNotice sku={fee.sku} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="sv-total">
        <span className="sv-total__label">All five services — the sheet&rsquo;s own total</span>
        <span className="sv-total__amount">{money(ALACARTE_SERVICE_TOTAL)}</span>
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
    <section className="sv-section" id="embalming" aria-labelledby="embalming-title">
      <p className="sv-section__kicker">{ALACARTE_SCOPE}</p>
      <h2 className="sv-section__title" id="embalming-title">
        Embalming — priced by the day
      </h2>
      <ActionsLegend />

      <div className="sv-split">
        <div>
          <EmbalmingDayPicker items={items} />

          <details className="sv-disclosure">
            <summary>See every day count, 3 to 9 days (and each price)</summary>
            <div className="sv-disclosure__body">
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
                    />
                  </span>
                </li>
              </ul>
            </div>
          </details>
        </div>

        <div className="sv-aside">
          <figure className="sv-figure">
            {/* eslint-disable-next-line @next/next/no-img-element -- the client's own 2026 photograph */}
            <img
              src={clientPhotoWide("wake-setup-flower-bank").src}
              srcSet={clientPhotoWide("wake-setup-flower-bank").srcSet}
              sizes="(max-width: 60rem) 92vw, 22rem"
              alt="A finished wake set-up — a white casket banked in white flowers under purple drapes the office prepared"
              loading="lazy"
            />
            <figcaption>A wake set-up the office prepared — illustration purposes only.</figcaption>
          </figure>
          <div className="sv-helper">
            <p>
              <strong>Not sure how many days?</strong> Most families choose 3 days — call{" "}
              <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
            </p>
          </div>
          <div className="sv-fact">
            <IconEmbalming />
            <p>Includes make-up and dressing. The office confirms the day count.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The chapel options: two photo cards (common & private, per day, the 3-day
 * example, both actions) above the sheet's full 3–9 day schedule, published as
 * one row per stay so a phone never scrolls a table sideways.
 *
 * A chapel is NOT a one-click cart item: every chapel action opens the booking
 * step (components/chapel-booking-dialog.tsx), where the customer picks the
 * chapel, a 3–9 day stay and a start date, sees that the park's own schedule has
 * every one of those days free, sees the exact price for the range, and only
 * then adds it. The prefilled request stays beside it for senior rates,
 * questions and office-arranged stays.
 */
export function ChapelRates({ items }: { items: CatalogItem[] }) {
  const lookup = catalogueLookup(items);
  const common = lookup(CHAPEL_SKUS.common);
  const privateChapel = lookup(CHAPEL_SKUS.private);
  const commonCart = cartItemOf(common);
  const privateCart = cartItemOf(privateChapel);
  const chapelItems: Partial<Record<ChapelClass, ChapelCatalogueItem>> = {};
  if (commonCart) chapelItems.common = commonCart;
  if (privateCart) chapelItems.private = privateCart;

  const chapelRequest = (
    chapelClass: ChapelClass,
    item: CatalogItem | undefined,
    perDay: number,
  ) =>
    buildRequestHref({
      item: `Chapel use — ${chapelClass} chapel, per day`,
      sku: item?.sku,
      price: `${money(perDay)} / day`,
      note: `Chapel use when the service is not with Villa. ${CHAPEL_NOTES.miscFee}`,
    });

  const chapels = [
    {
      key: "common",
      name: "Common chapel",
      image: clientPhotoWide("chapel-hall-candle-pedestals").src,
      srcSet: clientPhotoWide("chapel-hall-candle-pedestals").srcSet,
      alt: "The chapel hall in the client's own photograph — a draped side table and tall candle pedestals on a green carpet",
      perDay: CHAPEL_PER_DAY.common,
      threeDay: CHAPEL_RATES[0].common,
      resource: "Chapel A",
      capacity: 120,
      item: common,
      what: "Shared chapel; several families at once.",
    },
    {
      key: "private",
      name: "Private chapel",
      image: WAKESETUP_ALCOVE_IMAGE,
      srcSet: clientPhotoWide("wake-setup-lamp-alcove").srcSet,
      alt: "A decorated private viewing room in the client's own photograph — purple and white drapes, hanging flowers and lit lamp stands",
      perDay: CHAPEL_PER_DAY.private,
      threeDay: CHAPEL_RATES[0].private,
      resource: "Chapel B",
      capacity: 60,
      item: privateChapel,
      what: "A room for your family alone.",
    },
  ] as const;

  return (
    <section className="sv-section" id="chapel" aria-labelledby="chapel-title">
      <p className="sv-section__kicker">{CHAPEL_NOTES.scope}</p>
      <h2 className="sv-section__title" id="chapel-title">
        Chapel — check the dates and book online
      </h2>
      <p className="sv-section__intro">
        3–9 day stays, priced per day. <Link href="/facilities#rooms">See both rooms</Link>.
      </p>
      <ActionsLegend />

      <div className="sv-chapels">
        {chapels.map((chapel) => (
          <article className="sv-chapel" key={chapel.key}>
            <figure className="sv-chapel__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
              <img
                src={chapel.image}
                srcSet={chapel.srcSet}
                sizes="(max-width: 60rem) 92vw, 38rem"
                alt={chapel.alt}
                loading="lazy"
              />
            </figure>
            <div className="sv-chapel__body">
              <h3 className="sv-chapel__name">{chapel.name}</h3>
              <div className="sv-chapel__rate">
                {money(chapel.perDay)} <span className="sv-chapel__unit">per day</span>
              </div>
              <p className="sv-chapel__what">{chapel.what}</p>
              <dl className="sv-chapel__facts">
                <div>
                  <dt>Booked as</dt>
                  <dd>{chapel.resource}</dd>
                </div>
                <div>
                  <dt>Room fits about</dt>
                  <dd>{chapel.capacity} people</dd>
                </div>
                <div>
                  <dt>3 days — regular</dt>
                  <dd>{money(chapel.threeDay.regular)}</dd>
                </div>
                <div>
                  <dt>3 days — senior citizen</dt>
                  <dd>{money(chapel.threeDay.senior)}</dd>
                </div>
              </dl>
              <div className="sv-chapel__actions">
                {chapel.item ? (
                  <ChapelBookingButton
                    chapelClass={chapel.key}
                    items={chapelItems}
                    label="Check dates & price"
                  />
                ) : null}
                <Link
                  href={chapelRequest(chapel.key, chapel.item, chapel.perDay)}
                  className="btn btn--secondary btn--block"
                >
                  Request order
                </Link>
                <InCartNotice sku={chapel.item?.sku ?? ""} unit="stay" />
              </div>
              <p className="sv-chapel__illus">{CHAPEL_SAMPLE_NOTE}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="sv-placeholder">
        <span aria-hidden="true"><HeartMark /></span>
        <p>
          <strong>Chapel names are placeholders</strong> — the client has not confirmed the
          real list yet. Prices and dates are real.
        </p>
      </div>

      <details className="sv-disclosure" id="chapel-stays">
        <summary id="chapel-stays-title">
          See every stay, 3 to 9 days — regular and senior prices
        </summary>
        <div className="sv-disclosure__body">
          <p className="sv-note">The sheet&rsquo;s own totals. Senior bookings: use Request.</p>
          {chapels.map((chapel) => (
            <div key={chapel.key}>
              <h4 className="sv-stay__heading">
                {chapel.name} — {chapel.resource}
              </h4>
              <ul className="sv-stays" aria-label={`${chapel.name} stays`}>
                {CHAPEL_RATES.map((row) => {
                  const rate = row[chapel.key];
                  const request = buildRequestHref({
                    item: `Chapel use — ${row.days} days`,
                    price: `${money(rate.regular)} regular / ${money(rate.senior)} senior for ${row.days} days (${money(rate.ratePerDay)} / day)`,
                    note: `Chapel use when the service is not with Villa, ${row.days} days. ${CHAPEL_NOTES.miscFee}`,
                  });
                  return (
                    <li className="sv-stay" key={`${chapel.key}-${row.days}`}>
                      <span className="sv-stay__days">{row.days} days</span>
                      <span className="sv-stay__prices">
                        <span>
                          Regular <b>{money(rate.regular)}</b>
                        </span>
                        <span>
                          Senior citizen <b>{money(rate.senior)}</b>
                        </span>
                        <span className="sv-note">
                          ({row.days} × {money(rate.ratePerDay)} per day)
                        </span>
                      </span>
                      <span className="sv-stay__actions">
                        {chapel.item ? (
                          <ChapelBookingButton
                            chapelClass={chapel.key}
                            days={row.days}
                            items={chapelItems}
                            label={`Book ${row.days} days`}
                            ariaLabel={`Book ${row.days} days — ${chapel.name}`}
                          />
                        ) : null}
                        <Link href={request} className="btn btn--secondary btn--sm">
                          Request
                        </Link>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <div className="sv-senior">
        <span aria-hidden="true"><HeartMark /></span>
        <div className="sv-senior__body">
          {/* The sheet disagrees with itself (captain Q8): both figures stay,
              neither is resolved. The per-day figures are derived from the
              published table, never typed. */}
          <p>
            <strong>Senior rate:</strong> the table&rsquo;s column and the sheet&rsquo;s
            footnote disagree — the office applies the rate.
          </p>
          <dl className="sv-chapel__facts">
            <div>
              <dt>Table column (per day)</dt>
              <dd>
                {money(CHAPEL_RATES[0].common.senior / CHAPEL_RATES[0].days)} common ·{" "}
                {money(CHAPEL_RATES[0].private.senior / CHAPEL_RATES[0].days)} private
              </dd>
            </div>
            <div>
              <dt>Sheet footnote</dt>
              <dd>{CHAPEL_NOTES.seniorPerDay}</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="sv-note sv-section__note">
        {CHAPEL_NOTES.miscFee} {CHAPEL_NOTES.privateChapelOnly}
      </p>
    </section>
  );
}

/** A small inline heart mark for the placeholder + senior notes. */
function HeartMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
    </svg>
  );
}

/** All three service blocks, in the order /services lays them out. */
export function ServiceRates2026({
  items,
  contact,
}: {
  items: CatalogItem[];
  /** The staff-editable 24/7 line (landing content) — never a typed number. */
  contact: ContactInfo;
}) {
  return (
    <>
      <AlacarteServiceRates items={items} />
      <EmbalmingRates items={items} contact={contact} />
      <ChapelRates items={items} />
    </>
  );
}
