import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import {
  ChapelBookingButton,
  type ChapelCatalogueItem,
} from "@/components/chapel-booking-dialog";
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

/**
 * Funeraria memorial services — the client's 2026 service prices, as sellable
 * rows rather than a bare rate table.
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
    />
  );
}

/** Request context shared by every a-la-carte line. */
const ALACARTE_REQUEST_NOTE =
  "A-la-carte 2026 rate — applies when the family does not take a package.";

/** Embalming per day + the five a-la-carte fees, exactly as the sheet prints them. */
export function AlacarteServiceRates({ items }: { items: CatalogItem[] }) {
  const lookup = catalogueLookup(items);

  return (
    <div className="split-grid">
      <Card header={<h3>Embalming — per day</h3>}>
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
                        prefill={{
                          price: item?.display_price ?? money(r.amount),
                          note: `${ALACARTE_REQUEST_NOTE} ${r.days} days' embalming.`,
                        }}
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
      </Card>

      <Card header={<h3>At-need services — per service</h3>}>
        <div className="table-wrapper">
          <table className="table price-table">
            <caption>{ALACARTE_SCOPE}</caption>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Amount</th>
                <th scope="col">Unit</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ALACARTE_LINES.map((f) => {
                const item = lookup(f.sku);
                return (
                  <tr key={f.service}>
                    <th scope="row">{f.service}</th>
                    <td className="table__numeric">{money(f.amount)}</td>
                    <td className="text-sm text-muted">per service</td>
                    <td>
                      <LineActions
                        item={item}
                        prefill={{
                          price: item?.display_price ?? money(f.amount),
                          note: ALACARTE_REQUEST_NOTE,
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
              <tr>
                <th scope="row">Total — all five services above</th>
                <td className="table__numeric">{money(ALACARTE_SERVICE_TOTAL)}</td>
                <td className="text-sm text-muted">all five services</td>
                <td className="text-sm text-muted">
                  Add each service above, or{" "}
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/**
 * Chapel use rates (common & private) with the sheet's senior column and notes.
 * The senior column is printed exactly as the sheet computes it (96% of the
 * regular total, pinned in tests) and the sheet's own senior-per-day footnote is
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

  return (
    <div className="stack-3">
      <div className="split-grid">
        <Card header={<h3>Common chapel — per day</h3>}>
          <p className="text-sm text-muted">
            {money(CHAPEL_PER_DAY.common)} / day. Senior-citizen stays are priced on the
            sheet&rsquo;s 3–9 day column below.
          </p>
          <div className="catalogue-actions">
            {commonCart ? (
              <ChapelBookingButton
                chapelClass="common"
                items={chapelItems}
                label="Book these dates"
              />
            ) : null}
            <Link
              href={chapelRequest("common", common, CHAPEL_PER_DAY.common)}
              className="btn btn--secondary btn--sm"
            >
              Request order
            </Link>
          </div>
        </Card>

        <Card header={<h3>Private chapel — per day</h3>}>
          <p className="text-sm text-muted">
            {money(CHAPEL_PER_DAY.private)} / day. Senior-citizen stays are priced on the
            sheet&rsquo;s 3–9 day column below.
          </p>
          <div className="catalogue-actions">
            {privateCart ? (
              <ChapelBookingButton
                chapelClass="private"
                items={chapelItems}
                label="Book these dates"
              />
            ) : null}
            <Link
              href={chapelRequest("private", privateChapel, CHAPEL_PER_DAY.private)}
              className="btn btn--secondary btn--sm"
            >
              Request order
            </Link>
          </div>
        </Card>
      </div>

      <Card header={<h3>Chapel use — per day, common &amp; private</h3>}>
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
        <ul className="stack-3" style={{ marginTop: "var(--space-3)" }}>
          <li className="text-sm text-muted">{CHAPEL_NOTES.miscFee}</li>
          <li className="text-sm text-muted">{CHAPEL_NOTES.seniorPerDay}</li>
          <li className="text-sm text-muted">{CHAPEL_NOTES.privateChapelOnly}</li>
        </ul>
      </Card>
    </div>
  );
}

/** Both service price blocks, the way /services lays them out. */
export function ServiceRates2026({ items }: { items: CatalogItem[] }) {
  return (
    <div className="stack-4">
      <AlacarteServiceRates items={items} />
      <ChapelRates items={items} />
    </div>
  );
}
