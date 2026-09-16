"use client";

/**
 * The chapel booking step — a chapel is never a one-click cart item.
 *
 * `ChapelBookingButton` replaces the plain Add-to-cart control for chapel
 * lines: it opens this dialog, where the customer chooses the chapel, a start
 * date and a 3–9 day stay, sees every day of the range and what that exact
 * range costs, and only then adds it. The dialog reads availability from the
 * park's own schedule through /api/chapel/schedule (never a guess), re-checks
 * server-side on Add to cart, and holds the range (a scheduling booking) for as
 * long as the cart line lives. Removing the line releases the hold.
 *
 * Rules live in lib/chapel-booking.ts; the calls in lib/chapel-booking-api.ts.
 * The "Request order" path stays beside Add to cart — the same prefilled
 * capture every other price-list line offers (senior rates, questions).
 *
 * Accessibility: modal dialog semantics (role/aria-modal/aria-labelledby), focus
 * moves into the panel and returns to the trigger on close, Escape closes, Tab
 * is trapped, and the backdrop is click-to-close.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { Resource } from "@/lib/api-client/scheduling";
import { useCart, type CartLine } from "@/lib/cart/cart-context";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { CHAPEL_NOTES, php } from "@/lib/villa-pricing";
import {
  CHAPEL_CLASS_LABEL,
  CHAPEL_CLASS_ORDER,
  MAX_CHAPEL_DAYS,
  MIN_CHAPEL_DAYS,
  bookingToChapelLine,
  chapelBookingLineSummary,
  chapelDayStatus,
  chapelRefusalMessage,
  chapelRequestPrice,
  chapelStayPrices,
  chapelsOf,
  checkChapelAvailability,
  eachDate,
  formatCalendarDate,
  formatCalendarDay,
  isChapelDayCount,
  type ChapelBookingLine,
  type ChapelClass,
} from "@/lib/chapel-booking";
import {
  fetchChapelSchedule,
  reserveChapelStay,
  type ChapelScheduleData,
} from "@/lib/chapel-booking-api";

/** The catalogue facts a booking line needs (CartLine without the quantity). */
export type ChapelCatalogueItem = {
  sku: string;
  name: string;
  itemType: CartLine["itemType"];
  unitPriceCents: number;
  currency: string;
};

export type ChapelBookingButtonProps = {
  /** The class the customer clicked from (the dialog still lets them switch). */
  chapelClass: ChapelClass;
  /** Pre-set stay length (a 3–9 day row passes its own day count). */
  days?: number;
  /** The catalogue entries the cart line may use, per class. */
  items: Partial<Record<ChapelClass, ChapelCatalogueItem>>;
  /** Visible button label; defaults to "Book common/private chapel dates". */
  label?: string;
  /**
   * Accessible name, when the visible label relies on its group heading for
   * context (the chapel stay rows say "Book 3 days" under a chapel heading).
   * Must contain the visible label in order (WCAG 2.5.3 label-in-name).
   */
  ariaLabel?: string;
};

/** Local (browser) today as YYYY-MM-DD — the date input's floor. */
function todayCalendarDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function resourcesOf(schedule: ChapelScheduleData | null): Resource[] {
  return (schedule?.chapels ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    resource_type: c.resource_type,
    capacity: c.capacity,
  }));
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ChapelBookingDialog({
  open,
  onClose,
  initialChapelClass,
  initialDays,
  items,
}: {
  open: boolean;
  onClose: () => void;
  initialChapelClass: ChapelClass;
  initialDays: number;
  items: Partial<Record<ChapelClass, ChapelCatalogueItem>>;
}) {
  const cart = useCart();
  const titleId = useId();
  const startId = useId();
  const daysId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [chapelClass, setChapelClass] = useState<ChapelClass>(initialChapelClass);
  const [days, setDays] = useState(
    isChapelDayCount(initialDays) ? initialDays : MIN_CHAPEL_DAYS,
  );
  const [startDate, setStartDate] = useState(todayCalendarDate());
  const [resourceId, setResourceId] = useState("");
  const [schedule, setSchedule] = useState<ChapelScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reserved, setReserved] = useState<ChapelBookingLine | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSchedule(await fetchChapelSchedule());
      setLoadError(null);
    } catch (err) {
      setSchedule(null);
      setLoadError(messageOf(err, "The park schedule is unavailable right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fresh dialog per open: reset the selection, then read the live schedule.
  useEffect(() => {
    if (!open) return;
    setChapelClass(initialChapelClass);
    setDays(isChapelDayCount(initialDays) ? initialDays : MIN_CHAPEL_DAYS);
    setStartDate(todayCalendarDate());
    setResourceId("");
    setReserved(null);
    setActionError(null);
    void reload();
  }, [open, initialChapelClass, initialDays, reload]);

  // Modal behaviour: focus in, Escape out, focus back, page scroll locked.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const chapels = useMemo(
    () => chapelsOf(resourcesOf(schedule), chapelClass),
    [schedule, chapelClass],
  );
  const selectedResourceId = chapels.some((c) => c.id === resourceId)
    ? resourceId
    : (chapels[0]?.id ?? "");
  const catalogue = items[chapelClass];
  const minDate = todayCalendarDate();

  const check = useMemo(() => {
    if (!schedule || chapels.length === 0) return null;
    return checkChapelAvailability({
      resources: resourcesOf(schedule),
      bookings: schedule.bookings,
      blockedDates: schedule.blocked_dates,
      chapelClass,
      startDate,
      days,
      resourceId: selectedResourceId || undefined,
    });
  }, [schedule, chapels.length, chapelClass, startDate, days, selectedResourceId]);

  // Whole-range availability for every chapel, so the class switch and the
  // chapel list answer "which of these is free for MY dates" before any click.
  const availability = useMemo(() => {
    const perChapel = new Map<string, boolean>();
    const perClass = new Map<ChapelClass, { free: number; total: number }>();
    if (!schedule) return { perChapel, perClass };
    const resources = resourcesOf(schedule);
    for (const cls of CHAPEL_CLASS_ORDER) {
      const entries = chapelsOf(resources, cls).map((resource) => {
        const ok = checkChapelAvailability({
          resources,
          bookings: schedule.bookings,
          blockedDates: schedule.blocked_dates,
          chapelClass: cls,
          startDate,
          days,
          resourceId: resource.id,
        }).ok;
        perChapel.set(resource.id, ok);
        return ok;
      });
      perClass.set(cls, { free: entries.filter(Boolean).length, total: entries.length });
    }
    return { perChapel, perClass };
  }, [schedule, startDate, days]);

  const prices = isChapelDayCount(days) ? chapelStayPrices(chapelClass, days) : null;

  const requestHref = buildRequestHref({
    item: `${CHAPEL_CLASS_LABEL[chapelClass]} — chapel stay`,
    sku: catalogue?.sku,
    price: prices ? chapelRequestPrice(chapelClass, days) : undefined,
    note: `Chapel use when the service is not with Villa. Start ${formatCalendarDate(
      startDate,
    )} for ${days} days. ${CHAPEL_NOTES.miscFee}`,
  });

  async function onReserve() {
    if (!check || !check.ok || !catalogue) return;
    setReserving(true);
    setActionError(null);
    try {
      const booking = await reserveChapelStay({
        resourceId: check.resource.id,
        startDate: check.startDate,
        days: check.days,
      });
      const line = bookingToChapelLine(booking, chapelClass);
      cart.add(
        {
          sku: catalogue.sku,
          name: catalogue.name,
          itemType: catalogue.itemType,
          unitPriceCents: catalogue.unitPriceCents,
          currency: catalogue.currency,
          lineId: `chapel:${booking.id}`,
          booking: line,
        },
        line.days,
      );
      setReserved(line);
    } catch (err) {
      setActionError(messageOf(err, "The dates could not be held."));
      void reload();
    } finally {
      setReserving(false);
    }
  }

  function trapFocus(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const focusables = e.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  }

  if (!open) return null;

  return (
    <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="booking-modal__backdrop" onClick={onClose} />
      <div
        className="booking-modal__panel"
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <header className="booking-modal__head">
          <div>
            <p className="booking-modal__eyebrow">Chapel use</p>
            <h2 id={titleId}>Book chapel dates</h2>
          </div>
          <button
            type="button"
            className="quick-menu__close"
            aria-label="Close booking"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="booking-modal__body">
          {reserved ? (
            <div className="stack-3">
              <Alert tone="success" title="Dates held — added to your cart">
                {reserved.resourceName} · {chapelBookingLineSummary(reserved)}
                {prices ? ` · ${php(prices.regular)}` : ""}
              </Alert>
              <p className="text-sm text-muted">
                The park&rsquo;s schedule holds these dates while the line stays in your
                cart. Removing the line releases them; placing the order keeps them.
              </p>
              <div className="booking-modal__actions">
                <Link href="/cart" className="btn btn--primary btn--sm">
                  View cart
                </Link>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Keep browsing
                </Button>
              </div>
            </div>
          ) : (
            <div className="stack-4">
              {loading && !schedule ? (
                <p className="text-sm text-muted" role="status">
                  Checking the park&rsquo;s chapel schedule…
                </p>
              ) : null}
              {loadError ? (
                <Alert tone="warning" title="The chapel schedule can't be reached">
                  {loadError} You can still send the office a request and they will confirm
                  availability and the price.
                </Alert>
              ) : null}

              {/* 01 — the chapel */}
              <section className="booking-step">
                <div className="booking-step__head">
                  <span className="booking-step__num" aria-hidden="true">
                    01
                  </span>
                  <div>
                    <h3 className="booking-step__title">Choose the chapel</h3>
                    <p className="booking-step__blurb">
                      The park schedules common and private chapels separately; every day of
                      your stay must be free for the chapel you pick.
                    </p>
                  </div>
                </div>

                <div className="booking-class" role="radiogroup" aria-label="Chapel type">
                  {CHAPEL_CLASS_ORDER.map((cls) => {
                    const price = chapelStayPrices(cls, days);
                    const state = availability.perClass.get(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        role="radio"
                        aria-checked={chapelClass === cls}
                        className={`booking-class__option${
                          chapelClass === cls ? " booking-class__option--active" : ""
                        }`}
                        onClick={() => {
                          setChapelClass(cls);
                          setResourceId("");
                        }}
                      >
                        <strong>{CHAPEL_CLASS_LABEL[cls]}</strong>
                        <span>{php(price.perDay)} / day</span>
                        {state && state.total > 0 ? (
                          <span className="booking-class__hint">
                            {state.free > 0
                              ? `${state.free} of ${state.total} free for these dates`
                              : "none free for these dates"}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {schedule && chapels.length === 0 ? (
                  <p className="text-sm text-muted">
                    No {CHAPEL_CLASS_LABEL[chapelClass].toLowerCase()} is in the park&rsquo;s
                    schedule yet, so these dates cannot be checked online.
                  </p>
                ) : null}

                {chapels.length > 0 ? (
                  <ul className="booking-chapels" aria-label="Chapels">
                    {chapels.map((chapel) => {
                      const free = availability.perChapel.get(chapel.id) ?? false;
                      return (
                        <li key={chapel.id}>
                          <label
                            className={`booking-chapel${
                              selectedResourceId === chapel.id ? " booking-chapel--active" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="chapel-resource"
                              value={chapel.id}
                              checked={selectedResourceId === chapel.id}
                              onChange={() => setResourceId(chapel.id)}
                            />
                            <span className="booking-chapel__name">
                              <strong>{chapel.name}</strong>
                              <span className="text-sm text-muted">
                                capacity {chapel.capacity}
                              </span>
                            </span>
                            <span
                              className={`booking-chip${
                                free ? " booking-chip--free" : " booking-chip--busy"
                              }`}
                            >
                              {free ? "Free for these dates" : "Taken for these dates"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>

              {/* 02 — the dates */}
              <section className="booking-step">
                <div className="booking-step__head">
                  <span className="booking-step__num" aria-hidden="true">
                    02
                  </span>
                  <div>
                    <h3 className="booking-step__title">Choose the dates</h3>
                    <p className="booking-step__blurb">
                      The 2026 sheet prices chapel use in 3–9 day stays.
                    </p>
                  </div>
                </div>
                <div className="field-grid field-grid--2">
                  <Field
                    label="First day of the stay"
                    htmlFor={startId}
                    hint="Every day from this date is checked against the schedule."
                  >
                    <input
                      id={startId}
                      type="date"
                      min={minDate}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Stay length"
                    htmlFor={daysId}
                    hint={`${MIN_CHAPEL_DAYS}–${MAX_CHAPEL_DAYS} days.`}
                  >
                    <select
                      id={daysId}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                    >
                      {Array.from(
                        { length: MAX_CHAPEL_DAYS - MIN_CHAPEL_DAYS + 1 },
                        (_, i) => MIN_CHAPEL_DAYS + i,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n} days
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {schedule && selectedResourceId && eachDate(startDate, days).length > 0 ? (
                  <ul className="booking-range" aria-label="Availability for the selected range">
                    {eachDate(startDate, days).map((date) => {
                      const status = chapelDayStatus(
                        selectedResourceId,
                        date,
                        schedule.bookings,
                        schedule.blocked_dates,
                      );
                      return (
                        <li
                          key={date}
                          className={`booking-range__day booking-range__day--${status}`}
                        >
                          <span>{formatCalendarDay(date)}</span>
                          <strong>
                            {status === "free" ? "Free" : status === "booked" ? "Booked" : "Blocked"}
                          </strong>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>

              {/* 03 — the price */}
              <section className="booking-step">
                <div className="booking-step__head">
                  <span className="booking-step__num" aria-hidden="true">
                    03
                  </span>
                  <div>
                    <h3 className="booking-step__title">Price for this range</h3>
                    <p className="booking-step__blurb">
                      The client&rsquo;s 2026 chapel sheet, as printed — nothing more.
                    </p>
                  </div>
                </div>
                {prices ? (
                  <dl className="booking-price">
                    <div className="booking-price__row">
                      <dt>
                        {CHAPEL_CLASS_LABEL[chapelClass]} · {days}{" "}
                        {days === 1 ? "day" : "days"}
                      </dt>
                      <dd>
                        <strong>{php(prices.regular)}</strong>{" "}
                        <span className="text-sm text-muted">
                          ({days} × {php(prices.perDay)} / day)
                        </span>
                      </dd>
                    </div>
                    <div className="booking-price__row">
                      <dt>Senior citizen column (2026 sheet)</dt>
                      <dd>
                        <strong>{php(prices.senior)}</strong>{" "}
                        <span className="text-sm text-muted">
                          — the office applies the senior rate; use Request order.
                        </span>
                      </dd>
                    </div>
                  </dl>
                ) : null}
                <p className="booking-note">{CHAPEL_NOTES.miscFee}</p>
                <p className="booking-note">
                  <Link href="/services">See the 2026 chapel rate table</Link> for every
                  day count and both columns.
                </p>
              </section>

              {actionError ? (
                <Alert tone="danger" title="Could not hold those dates">
                  {actionError}
                </Alert>
              ) : check && !check.ok ? (
                <Alert tone="warning" title="These dates are not available">
                  {chapelRefusalMessage(check.refusal)}
                </Alert>
              ) : null}

              <div className="booking-modal__actions">
                <Button
                  type="button"
                  disabled={!check?.ok || reserving || !catalogue}
                  onClick={() => void onReserve()}
                >
                  {reserving ? "Holding the dates…" : "Add to cart"}
                </Button>
                <Link href={requestHref} className="btn btn--secondary btn--sm">
                  Request order
                </Link>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
              </div>
              <p className="field__hint">
                {catalogue
                  ? "Adding to cart holds these dates in the park's schedule until you remove the line or place the order. Nothing is charged here."
                  : "This chapel line is not offered online right now — send the office a request instead."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChapelBookingButton({
  chapelClass,
  days = MIN_CHAPEL_DAYS,
  items,
  label,
  ariaLabel,
}: ChapelBookingButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="accent"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {label ?? `Book ${CHAPEL_CLASS_LABEL[chapelClass].toLowerCase()} dates`}
      </Button>
      <ChapelBookingDialog
        open={open}
        onClose={() => setOpen(false)}
        initialChapelClass={chapelClass}
        initialDays={days}
        items={items}
      />
    </>
  );
}
