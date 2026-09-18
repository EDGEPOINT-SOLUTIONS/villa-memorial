"use client";

/**
 * Chapel availability (staff Schedule): one chapel's month at a glance — free,
 * held (still in a customer's cart), booked and closed — plus the operator's
 * maintenance closures.
 *
 * An operator closes a date range here and the customer booking step sees it on
 * its next read (same durable store, /api/chapel/schedule): those dates stop
 * being bookable and the refusal names the chapel and the dates. Re-opening a
 * range returns the dates just as directly.
 *
 * The grid is computed from the pure month rule in lib/chapel-admin.ts, so the
 * screen and the tests agree on what "blocked" means; every mutation POSTs a BFF
 * route (scope `scheduling:write`) that keeps its rules in the same module.
 */
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  CHAPEL_WEEKDAY_LABELS,
  addMonths,
  blockDates,
  blockedDateEntries,
  chapelMonthView,
  formatBlockRange,
  type ChapelBlock,
  type ChapelBlockDraft,
  type ChapelBookingStatus,
  type ChapelDayCell,
  type ChapelRecord,
} from "@/lib/chapel-admin";

export type ChapelAvailabilityWindow = {
  id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  admin_status: ChapelBookingStatus;
};

const DAY_STATE_LABEL: Record<ChapelDayCell["status"], string> = {
  free: "Free",
  held: "In a cart",
  booked: "Booked",
  blocked: "Closed",
};

export function ChapelAvailability({
  chapels,
  blocks,
  availability,
  initialMonth,
  canWrite,
}: {
  chapels: ChapelRecord[];
  blocks: ChapelBlock[];
  availability: ChapelAvailabilityWindow[];
  /** Server-computed "today" month, so SSR and hydration agree on the grid. */
  initialMonth: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const fromId = useId();
  const toId = useId();
  const reasonId = useId();

  const [chapelId, setChapelId] = useState(chapels[0]?.id ?? "");
  const [month, setMonth] = useState(initialMonth);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = chapels.find((c) => c.id === chapelId) ?? chapels[0] ?? null;
  const chapelBlocks = useMemo(
    () => blocks.filter((block) => block.resource_id === selected?.id),
    [blocks, selected?.id],
  );
  const monthView = useMemo(() => {
    if (!selected) return null;
    return chapelMonthView({
      month,
      chapelName: selected.name,
      bookings: availability.filter((window) => window.resource_id === selected.id),
      blocks: blockedDateEntries(chapelBlocks),
    });
  }, [selected, month, availability, chapelBlocks]);

  async function submitBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!selected) return;
    const dropped = {
      resource_id: selected.id,
      from,
      to: to || from,
      reason: reason.trim(),
    } satisfies ChapelBlockDraft;
    if (blockDates(dropped.from, dropped.to).length === 0) {
      setError("Give the first and last day of the closure as calendar dates.");
      return;
    }
    if (!dropped.reason) {
      setError("Say why the chapel is closed (maintenance, private use, …).");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(
        `/api/schedule/chapels/${encodeURIComponent(selected.id)}/blocks`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(dropped),
        },
      );
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "The closure could not be saved.",
        );
        return;
      }
      setNotice(`${selected.name} is closed ${formatBlockRange(dropped)} — customers can no longer book those dates.`);
      setFrom("");
      setTo("");
      setReason("");
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  async function unblock(block: ChapelBlock) {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/chapel-blocks/${encodeURIComponent(block.id)}`, {
        method: "DELETE",
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "The closure could not be removed.",
        );
        return;
      }
      setNotice(`${formatBlockRange(block)} is open again — customers can book those dates.`);
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  if (chapels.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <h3>Chapel availability</h3>
        </div>
        <div className="card__body">
          <p className="text-sm text-muted">
            Add a chapel on the books first — the calendar and closures follow the chapel list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header row row--space">
        <h3>Chapel availability</h3>
        <span className="text-sm text-muted">free · in a cart · booked · closed</span>
      </div>
      <div className="card__body stack-4">
        {notice ? <Alert tone="success" title={notice} /> : null}
        {error ? (
          <Alert tone="danger" title="That did not go through">
            {error}
          </Alert>
        ) : null}

        <div className="row row--wrap">
          {chapels.map((chapel) => (
            <button
              key={chapel.id}
              type="button"
              className={`pill-toggle${chapel.id === selected?.id ? " pill-toggle--active" : ""}`}
              aria-pressed={chapel.id === selected?.id}
              onClick={() => setChapelId(chapel.id)}
            >
              {chapel.name}
              {chapel.active ? "" : " (off storefront)"}
            </button>
          ))}
        </div>

        {selected && monthView ? (
          <>
            <div className="row row--space">
              <div className="row">
                <Button variant="ghost" size="sm" onClick={() => setMonth(addMonths(month, -1))}>
                  ‹
                </Button>
                <strong>{monthView.label}</strong>
                <Button variant="ghost" size="sm" onClick={() => setMonth(addMonths(month, 1))}>
                  ›
                </Button>
              </div>
              <input
                type="month"
                aria-label="Month"
                value={month}
                onChange={(e) => setMonth(e.target.value || month)}
                className="text-sm"
              />
            </div>

            <div className="chapel-month" aria-label={`${selected.name} availability`}>
              {CHAPEL_WEEKDAY_LABELS.map((label) => (
                <div key={label} className="chapel-month__head" aria-hidden="true">
                  {label}
                </div>
              ))}
              {monthView.weeks.flat().map((cell) => (
                <div
                  key={cell.date}
                  title={cell.label}
                  aria-label={`${cell.label}${cell.clash ? " · also closed" : ""}`}
                  className={`chapel-day chapel-day--${cell.status}${
                    cell.inMonth ? "" : " chapel-day--outside"
                  }`}
                >
                  <span className="chapel-day__num">{Number(cell.date.slice(8, 10))}</span>
                  <span className="chapel-day__state">{DAY_STATE_LABEL[cell.status]}</span>
                  {cell.clash ? (
                    <span className="chapel-day__flag" title="A closure and a booking share this day">
                      !
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="row row--wrap text-sm text-muted">
              <span>
                {selected.active
                  ? `${selected.name} is bookable for 3–9 day stays.`
                  : `${selected.name} is off the storefront — existing bookings still hold their dates.`}
              </span>
            </div>

            {canWrite ? (
              <div className="stack-3">
                <h4>Close dates for {selected.name}</h4>
                <form onSubmit={submitBlock} className="stack-3" noValidate>
                  <div className="field-grid field-grid--2">
                    <Field label="First closed day" htmlFor={fromId} hint="Inclusive.">
                      <input
                        id={fromId}
                        type="date"
                        disabled={pending}
                        value={from}
                        onChange={(e) => {
                          setFrom(e.target.value);
                          if (!to || to < e.target.value) setTo(e.target.value);
                        }}
                      />
                    </Field>
                    <Field label="Last closed day" htmlFor={toId} hint="Inclusive.">
                      <input
                        id={toId}
                        type="date"
                        min={from || undefined}
                        disabled={pending}
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Why is it closed?"
                    htmlFor={reasonId}
                    hint="Maintenance, private use — the office reads this and the bookings list."
                  >
                    <input
                      id={reasonId}
                      type="text"
                      disabled={pending}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Repainting the chapel"
                    />
                  </Field>
                  <div className="capture-actions">
                    <Button type="submit" size="sm" disabled={pending}>
                      {pending ? "Saving…" : "Close these dates"}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Your role can see the schedule but not change it — `scheduling:write` is required to
                close or open dates.
              </p>
            )}

            <div className="stack-3">
              <h4>Closures on the books</h4>
              {chapelBlocks.length === 0 ? (
                <p className="text-sm text-muted">
                  No closure is on the books for {selected.name}.
                </p>
              ) : (
                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Dates</th>
                        <th scope="col">Reason</th>
                        <th scope="col">Recorded by</th>
                        {canWrite ? <th scope="col">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {chapelBlocks.map((block) => (
                        <tr key={block.id}>
                          <td className="text-sm">{formatBlockRange(block)}</td>
                          <td className="text-sm">{block.reason}</td>
                          <td className="text-sm text-muted">{block.created_by}</td>
                          {canWrite ? (
                            <td>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={pending}
                                onClick={() => unblock(block)}
                              >
                                Open again
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
