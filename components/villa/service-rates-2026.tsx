import Link from "next/link";
import { ChapelBookingButton, type ChapelCatalogueItem } from "@/components/chapel-booking-dialog";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { ServiceIcons, IconChapel, IconEmbalming } from "@/components/villa/service-icons";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import type { ChapelClass } from "@/lib/chapel-booking";
import type { CatalogItem } from "@/lib/api-client/commerce";
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
  CHAPEL_COMMON_IMAGE,
  CHAPEL_PRIVATE_IMAGE,
  CHAPEL_SAMPLE_NOTE,
  SERVICE_CARRIAGE_IMAGE,
  SERVICE_SAMPLE_NOTE,
  VIEWING_CARE_IMAGE,
} from "@/lib/media";

/**
 * Funeraria memorial services — the client's 2026 service prices, presented as
 * premium grouped sections with the storefront's two actions on every line.
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
 * day (quantity = the row's day count).
 *
 * Layout: one .mid-section per price block (the same grammar the package page's
 * price module uses) — at-need service cards with the sheet's totals band, the
 * embalming table beside the client's own wake photograph, and the two chapel
 * options as photo cards above the full 3–9 day schedule. The chapel
 * photographs are the client's own sample set-ups cropped from the TYPES OF
 * COFFIN sheet; the sheet marks them "(Illustration purposes only)", so both
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
    return (
      <span className="text-sm text-muted">
        Not offered online — ask the office.
      </span>
    );
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
 * One short sentence per a-la-carte line, phrased from the sheet's own package
 * wording (VMP_PACKAGE in lib/villa-pricing.ts) so a card explains the service
 * without inventing anything the sheet does not say.
 */
const ALACARTE_NOTES: Readonly<Record<string, string>> = {
  Retrieval:
    "Our coordinators bring your loved one into our care — good for the first 25 kms.",
  Delivery:
    "Delivery of your loved one in casket, from our care to the wake or the chapel.",
  "Viewing equipment":
    "Lights, curtains and carpets for the viewing area, set up before the family arrives.",
  "ORD coffin":
    "A plain coffin the sheet prices on its own; any other model is priced in the casket catalogue.",
  Interment:
    "The family cars and the trip to the graveside, with our staff attending the burial.",
};

/** The at-need services block: five sellable cards, the carriage photo, the sheet's total. */
export function AlacarteServiceRates({ items }: { items: CatalogItem[] }) {
  const lookup = catalogueLookup(items);

  return (
    <section className="mid-section" aria-labelledby="at-need-title">
      <p className="mid-kicker">2026 price list · {ALACARTE_SCOPE}</p>
      <h2 id="at-need-title">At-need services</h2>
      <p className="mid-intro">
        What the sheet prices for a family who does not take a package — bringing your loved one
        into our care, the viewing set-up, a plain coffin and the interment. Every line can go
        straight into the cart, or be sent to the office as a request.
      </p>

      <div className="svc-layout">
        <div className="svc-grid">
          {ALACARTE_LINES.map((fee) => {
            const item = lookup(fee.sku);
            const IconShape = ServiceIcons[fee.service] ?? IconChapel;
            return (
              <article className="svc-card" key={fee.service}>
                <span className="svc-card__icon" aria-hidden="true">
                  <IconShape />
                </span>
                <h3 className="svc-card__name">{fee.service}</h3>
                <p className="svc-card__price">
                  {money(fee.amount)} <span className="svc-card__unit">per service</span>
                </p>
                <p className="svc-card__note">{ALACARTE_NOTES[fee.service]}</p>
                <div className="svc-card__actions">
                  <LineActions
                    item={item}
                    prefill={{ note: ALACARTE_REQUEST_NOTE }}
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="svc-aside">
          <figure className="svc-figure">
            {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
            <img
              src={SERVICE_CARRIAGE_IMAGE}
              alt="Illustrative sample service — the client's funeral carriage"
              loading="lazy"
            />
            <figcaption>
              Sample service — the client&rsquo;s own funeral carriage. {SERVICE_SAMPLE_NOTE}
            </figcaption>
          </figure>
        </div>
      </div>

      <div className="svc-total">
        <div>
          <span className="svc-total__label">All five services</span>
          <span className="svc-total__amount">{money(ALACARTE_SERVICE_TOTAL)}</span>
        </div>
        <p className="svc-total__note">
          The sheet&rsquo;s own bottom line for retrieval, delivery, viewing equipment, the ORD
          coffin and interment together. Add each line above, or{" "}
          <Link
            href={buildRequestHref({
              item: "At-need services — all five",
              price: money(ALACARTE_SERVICE_TOTAL),
              note: "Retrieval, delivery, viewing equipment, ORD coffin and interment. A-la-carte 2026 rate — applies when the family does not take a package.",
            })}
          >
            request the whole set
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/** Embalming per day (3–9 days + the beyond-nine line) beside the client's wake photo. */
export function EmbalmingRates({ items }: { items: CatalogItem[] }) {
  const lookup = catalogueLookup(items);

  return (
    <section className="mid-section" aria-labelledby="embalming-title">
      <p className="mid-kicker">2026 price list · {ALACARTE_SCOPE}</p>
      <h2 id="embalming-title">Embalming — per day</h2>
      <p className="mid-intro">
        Preparation, make-up and dressing, priced by the day the family keeps the viewing open.
        A complete Villa Memorial Plan package includes embalming with no fixed day count — this
        table is the sheet&rsquo;s a-la-carte rate.
      </p>

      <div className="svc-layout">
        <div className="stack-3">
          <div className="table-wrapper">
            <table className="table price-table">
              <caption>{ALACARTE_SCOPE}</caption>
              <thead>
                <tr>
                  <th scope="col">No. of days</th>
                  <th scope="col">Embalming</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {EMBALMING_RATES.map((r) => {
                  const item = lookup(embalmingDaySku(r.days));
                  return (
                    <tr key={r.days}>
                      <th scope="row">{r.days}</th>
                      <td className="table__numeric">{money(r.amount)}</td>
                      <td className="text-sm text-muted">{r.days} days</td>
                      <td>
                        <LineActions
                          item={item}
                          prefill={{ note: `${ALACARTE_REQUEST_NOTE} ${r.days} days' embalming.` }}
                          addLabel={`Add ${r.days} days`}
                        />
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <th scope="row">More than 9</th>
                  <td className="table__numeric">
                    +{money(EMBALMING_PER_DAY_BEYOND_9)} / day
                  </td>
                  <td className="text-sm text-muted">per additional day</td>
                  <td>
                    <LineActions
                      item={lookup(EMBALMING_EXTRA_DAY_SKU)}
                      prefill={{
                        price: `${money(EMBALMING_PER_DAY_BEYOND_9)} / day`,
                        note: `${ALACARTE_REQUEST_NOTE} Additional embalming beyond nine days.`,
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mid-note">
            Embalming also carries the ₱1,000 miscellaneous fee when the service is not a package.
          </p>
        </div>

        <div className="svc-aside">
          <figure className="svc-figure">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client photo */}
            <img
              src={VIEWING_CARE_IMAGE}
              alt="A sample wake set-up with the casket, floral arrangements and viewing area prepared"
              loading="lazy"
            />
            <figcaption>
              A sample viewing set-up from the client&rsquo;s own photographs — the wake stays open
              for as many days as the family keeps the vigil.
            </figcaption>
          </figure>
          <div className="svc-fact">
            <IconEmbalming />
            <p>
              Includes make-up and dressing, so the family sees their loved one at peace. The
              office confirms the day count with you before the service.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The chapel options: two photo cards (common & private, per day, senior rates
 * and the two actions) above the sheet's full 3–9 day schedule and its notes.
 *
 * published verbatim beside the table rather than silently reconciled.
 *
 * A chapel is NOT a one-click cart item: every chapel action opens the booking
 * step (components/chapel-booking-dialog.tsx), where the customer picks the
 * chapel, a 3–9 day stay and a start date, sees that the park's own schedule has
 * every one of those days free, sees the exact price for the range, and only
 * then adds it (the dialog holds the dates via scheduling). The prefilled
 * request stays beside it for senior rates, questions and office-arranged stays.
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
      image: CHAPEL_COMMON_IMAGE,
      alt: "Illustrative sample wake set-up in the client's shared common chapel",
      perDay: CHAPEL_PER_DAY.common,
      threeDay: CHAPEL_RATES[0].common,
      item: common,
      note: "The shared chapel where several families keep their vigils — the sheet prices it per day, with a senior-citizen column.",
    },
    {
      key: "private",
      name: "Private chapel",
      image: CHAPEL_PRIVATE_IMAGE,
      alt: "Illustrative sample decorated viewing room in the client's private chapel",
      perDay: CHAPEL_PER_DAY.private,
      threeDay: CHAPEL_RATES[0].private,
      item: privateChapel,
      note: "A private room for the family's own viewing, dressed with the casket on its stand — the sheet prices it per day, with a senior-citizen column.",
    },
  ] as const;

  return (
    <section className="mid-section" aria-labelledby="chapel-title">
      <p className="mid-kicker">PRICE LIST FOR 2026 III · {CHAPEL_NOTES.scope}</p>
      <h2 id="chapel-title">Chapel options</h2>
      <p className="mid-intro">
        Common or private chapel, priced per day with the sheet&rsquo;s own 3–9 day totals and
        senior-citizen column. The photographs below are the client&rsquo;s own sample set-ups.
      </p>

      <div className="chapel-grid">
        {chapels.map((chapel) => (
          <article className="chapel-card" key={chapel.key}>
            <figure className="chapel-card__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
              <img src={chapel.image} alt={chapel.alt} loading="lazy" />
            </figure>
            <div className="chapel-card__body">
              <div className="chapel-card__head">
                <span className="svc-card__icon" aria-hidden="true">
                  <IconChapel />
                </span>
                <h3 className="chapel-card__name">{chapel.name}</h3>
              </div>
              <p className="chapel-card__rate">
                {money(chapel.perDay)} <span className="svc-card__unit">per day</span>
              </p>
              <p className="svc-card__note">{chapel.note}</p>
              <dl className="chapel-card__facts">
                <div>
                  <dt>3 days — regular</dt>
                  <dd>{money(chapel.threeDay.regular)}</dd>
                </div>
                <div>
                  <dt>3 days — senior citizen</dt>
                  <dd>{money(chapel.threeDay.senior)}</dd>
                </div>
              </dl>
              <div className="chapel-card__actions">
                <div className="catalogue-actions">
                  {chapel.item ? (
                    <ChapelBookingButton
                      chapelClass={chapel.key}
                      items={chapelItems}
                      label="Book these dates"
                    />
                  ) : null}
                  <Link
                    href={chapelRequest(chapel.key, chapel.item, chapel.perDay)}
                    className="btn btn--secondary btn--sm"
                  >
                    Request order
                  </Link>
                </div>
              </div>
              <p className="chapel-card__illus">{CHAPEL_SAMPLE_NOTE}</p>
            </div>
          </article>
        ))}      </div>

      <h3 className="section-title" id="chapel-schedule-title">
        Chapel use — per day, common &amp; private
      </h3>
      <div className="table-wrapper">
        <table className="table price-table">
          <caption>{CHAPEL_NOTES.scope}</caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                Days
              </th>
              <th scope="col" colSpan={3}>
                Common chapel
              </th>
              <th scope="col" colSpan={3}>
                Private chapel
              </th>
              <th scope="col" rowSpan={2}>
                Actions
              </th>
            </tr>
            <tr>
              <th scope="col">Rates</th>
              <th scope="col">Regular</th>
              <th scope="col">Senior citizen</th>
              <th scope="col">Rates</th>
              <th scope="col">Regular</th>
              <th scope="col">Senior citizen</th>
            </tr>
          </thead>
          <tbody>
            {CHAPEL_RATES.map((r) => (
              <tr key={r.days}>
                <th scope="row">{r.days}</th>
                <td className="table__numeric">{money(r.common.ratePerDay)}</td>
                <td className="table__numeric">{money(r.common.regular)}</td>
                <td className="table__numeric">{money(r.common.senior)}</td>
                <td className="table__numeric">{money(r.private.ratePerDay)}</td>
                <td className="table__numeric">{money(r.private.regular)}</td>
                <td className="table__numeric">{money(r.private.senior)}</td>
                <td>
                  <div className="catalogue-actions catalogue-actions--column">
                    {commonCart ? (
                      <ChapelBookingButton
                        chapelClass="common"
                        days={r.days}
                        items={chapelItems}
                        label={`Book common ${r.days} days`}
                      />
                    ) : null}
                    {privateCart ? (
                      <ChapelBookingButton
                        chapelClass="private"
                        days={r.days}
                        items={chapelItems}
                        label={`Book private ${r.days} days`}
                      />
                    ) : null}
                    <Link
                      href={buildRequestHref({
                        item: `Chapel use — ${r.days} days`,
                        price: `common ${money(r.common.regular)} regular / ${money(r.common.senior)} senior · private ${money(r.private.regular)} regular / ${money(r.private.senior)} senior`,
                        note: `Chapel use when the service is not with Villa, ${r.days} days. ${CHAPEL_NOTES.miscFee}`,
                      })}
                    >
                      Request this stay
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="svc-notes">
        <li className="text-sm text-muted">{CHAPEL_NOTES.miscFee}</li>
        <li className="text-sm text-muted">{CHAPEL_NOTES.seniorPerDay}</li>
        <li className="text-sm text-muted">{CHAPEL_NOTES.privateChapelOnly}</li>
      </ul>
    </section>  );
}

/** All three service blocks, in the order /services lays them out. */
export function ServiceRates2026({ items }: { items: CatalogItem[] }) {
  return (
    <>
      <AlacarteServiceRates items={items} />
      <EmbalmingRates items={items} />
      <ChapelRates items={items} />
    </>
  );
}
