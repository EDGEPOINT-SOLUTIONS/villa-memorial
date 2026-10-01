"use client";

/**
 * The agent's sign-in day notice — a quiet, dismissable band at the top of the
 * dashboard.
 *
 * WHY IT EXISTS (captain, 2026-10-02): “that should notify them also whenever
 * logged in in the agent portal.” When the agent opens the portal, today's plan
 * and the office's recorded activity surface as a count and the next thing, with
 * a link to the day. It is built from the SAME fold as the calendar
 * (`dayNotice` over `buildAgentCalendarEvents`), so the notice and the calendar's
 * day detail cannot disagree.
 *
 * IT IS NOT A MODAL. It renders in the page flow, carries one line and two
 * actions, and is dismissed with a button. The dismissal lasts the browser
 * session for that day (sessionStorage), so it does not nag on every navigation
 * but a fresh sign-in shows it again. When storage is unavailable (private mode)
 * it simply stays visible — a quiet band, never an error.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { DayNotice } from "@/lib/agent/agent-calendar";

export function AgentDayNotice({ dayKey, notice }: { dayKey: string; notice: DayNotice }) {
  const storageKey = `agent-day-notice:${dayKey}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "1") setDismissed(true);
    } catch {
      // No storage (private mode): leave the notice visible.
    }
  }, [storageKey]);

  function dismiss() {
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // The dismissal still holds for this render.
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  const planLine =
    notice.planCount === 0
      ? "No plans yet for today."
      : `${notice.openPlanCount} of ${notice.planCount} ${
          notice.planCount === 1 ? "plan" : "plans"
        } still to do.`;
  const stopLine =
    notice.stopCount > 0
      ? `${notice.stopCount} office ${notice.stopCount === 1 ? "stop" : "stops"} recorded.`
      : "";

  return (
    <section className="ag-daynotice" aria-label="Today's plan">
      <div className="ag-daynotice__body">
        <p className="ag-daynotice__title">Today&rsquo;s plan</p>
        <p className="ag-daynotice__line">
          {planLine}
          {stopLine ? ` ${stopLine}` : ""}
        </p>
        <p className="ag-daynotice__next">
          {notice.next
            ? `Next: ${notice.next.title}${notice.next.timeLabel ? ` · ${notice.next.timeLabel}` : ""}`
            : "Nothing else is open today."}
        </p>
      </div>
      <div className="ag-daynotice__actions">
        <Link className="btn btn--secondary btn--sm" href={`/agent/appointments?day=${dayKey}`}>
          Open the day
        </Link>
        <button
          className="ag-daynotice__close"
          type="button"
          onClick={dismiss}
          aria-label="Dismiss today's plan"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
