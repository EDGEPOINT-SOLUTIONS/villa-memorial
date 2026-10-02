import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { UnifiedCalendar, type CalendarHrefFor } from "@/components/staff/unified-calendar";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { loadStaffCalendar } from "@/lib/api-client/staff-calendar";
import { isCalendarDate } from "@/lib/chapel-booking";
import { parkToday } from "@/lib/schedule-board";

export const metadata = { title: "Calendar — Admin Portal" };

/**
 * Staff calendar (admin plan wave 1) — every recorded day type on one grid.
 *
 * The read lives in `lib/api-client/staff-calendar.ts` so this page and the
 * dashboard join the same six stores the same way. Read-only and fixture-mode:
 * no burial, dispatch or work-order service exists, and a store that cannot be
 * read is named rather than silently dropped.
 */
export default async function StaffCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; calDate?: string }>;
}) {
  const session = await requireSessionOrRedirect();

  if (!hasAnyScope(session.scopes, ["scheduling:read"])) {
    return (
      <>
        <PageHeader eyebrow="Today" title="Calendar" lead="Every recorded day type on one grid." />
        <PageSection>
          <ForbiddenState requiredScopes={["scheduling:read"]} />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const { items, unreadable, anchor } = await loadStaffCalendar(session.scopes);

  const today = parkToday();
  const recorded = anchor || today;
  const selectedDate = params.date && isCalendarDate(params.date) ? params.date : recorded;
  const month =
    params.calDate && /^\d{4}-\d{2}$/.test(params.calDate) ? params.calDate : selectedDate.slice(0, 7);

  const hrefFor: CalendarHrefFor = ({ month: nextMonth, date }) => {
    const query = new URLSearchParams();
    query.set("calDate", nextMonth ?? month);
    const day = date ?? selectedDate;
    if (day) query.set("date", day);
    return `/staff/calendar?${query.toString()}`;
  };

  const serviceCount = items.filter((item) => item.kind === "burial").length;
  const dueCount = items.filter((item) => item.kind === "payment_due").length;

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Today"
        title="Calendar"
        lead="Every burial, chapel booking, trip, payment due and work order on one grid."
        actions={
          <span className="text-sm text-muted">
            {serviceCount} burials · {dueCount} payments due
          </span>
        }
      />
      <PageSection>
        <UnifiedCalendar
          month={month}
          selectedDate={selectedDate}
          items={items}
          today={today}
          hrefFor={hrefFor}
          heading="Every recorded day type"
        />
        {unreadable.length > 0 ? (
          <p className="text-sm text-muted" style={{ marginTop: "var(--space-3)" }}>
            Not readable right now: {unreadable.join(", ")}. The recorded stores are shown; a live
            service that is configured but not wired says so on its own screen.
          </p>
        ) : null}
      </PageSection>
    </div>
  );
}
