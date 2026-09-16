import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { CancelBookingButton, NewBookingForm } from "@/components/schedule-actions";
import { ChapelAvailability } from "./chapel-availability";
import { ChapelBookings } from "./chapel-bookings";
import { ChapelSettings } from "./chapel-settings";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getChapelAdminView } from "@/lib/api-client/chapel-admin";
import { monthOf } from "@/lib/chapel-admin";
import { listBookings, listResources, type Booking } from "@/lib/api-client/scheduling";

export const metadata = { title: "Schedule — Staff Portal" };

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByDay(bookings: Booking[]): Array<{ day: string; bookings: Booking[] }> {
  const byDay = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = dayKey(b.starts_at);
    const list = byDay.get(key) ?? [];
    list.push(b);
    byDay.set(key, list);
  }
  return [...byDay.entries()]
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([day, list]) => ({
      day,
      bookings: [...list].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    }));
}

function nextDays(count: number): string[] {
  const days: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    days.push(new Date(d.getTime() + i * 86400000).toDateString());
  }
  return days;
}

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export default async function SchedulePage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["scheduling:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Schedule" />
        <PageSection>
          <ForbiddenState requiredScopes={["scheduling:read"]} />
        </PageSection>
      </>
    );
  }
  const canWrite = hasAnyScope(session.scopes, ["scheduling:write"]);

  let bookings: Booking[];
  let resources;
  let chapelAdmin: Awaited<ReturnType<typeof getChapelAdminView>>;
  try {
    [bookings, resources, chapelAdmin] = await Promise.all([
      listBookings(),
      listResources(),
      getChapelAdminView(),
    ]);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Schedule" />
        <PageSection>
          <ErrorState message="Unable to load the schedule." />
        </PageSection>
      </>
    );
  }

  const chapelIds = new Set(chapelAdmin.chapels.map((chapel) => chapel.id));
  const today = monthOf(new Date().toISOString().slice(0, 10));

  const byDay = groupByDay(bookings);
  const active = bookings.filter((b) => b.status === "confirmed").length;
  const weekBookings = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.ends_at) >= new Date(),
  );
  const days7 = nextDays(7);
  const windowDays = new Set(days7);
  const weekWindow = weekBookings.filter((b) => windowDays.has(dayKey(b.starts_at)));

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Schedule"
        actions={
          <span className="text-sm text-muted">
            {active} active booking{active === 1 ? "" : "s"} ·{" "}
            {resources.length} resources · {chapelAdmin.chapels.length} chapel{
              chapelAdmin.chapels.length === 1 ? "" : "s"
            }
          </span>
        }
      />

      {/* Chapels: how many exist, their availability, and every booking */}
      <PageSection>
        <ChapelSettings chapels={chapelAdmin.chapels} canWrite={canWrite} />
      </PageSection>

      <PageSection>
        <ChapelAvailability
          chapels={chapelAdmin.chapels}
          blocks={chapelAdmin.blocks}
          availability={chapelAdmin.availability}
          initialMonth={today}
          canWrite={canWrite}
        />
      </PageSection>

      <PageSection>
        <ChapelBookings bookings={chapelAdmin.bookings} canWrite={canWrite} />
      </PageSection>

      {/* Week at a glance matrix */}
      <PageSection>
        <div className="card">
          <div className="card__header row row--space"><h3>Week at a glance</h3><span className="text-sm text-muted">next 7 days</span></div>
          <div className="card__body">
            {weekWindow.length === 0 ? (
              <p className="text-sm text-muted">No bookings in the next 7 days — upcoming services are listed below.</p>
            ) : (
              <div className="week-matrix">
                <div className="week-matrix__row week-matrix__row--head">
                  <span className="week-matrix__resource">Resource</span>
                  {days7.map((d) => <span key={d} className="week-matrix__day">{shortDay(d)}</span>)}
                </div>
                {resources.map((r) => (
                  <div key={r.id} className="week-matrix__row">
                    <span className="week-matrix__resource">{r.name}</span>
                    {days7.map((d) => {
                      const bk = weekWindow.find((x) => x.resource_id === r.id && dayKey(x.starts_at) === d);
                      return (
                        <span key={d} className="week-matrix__cell">
                          {bk ? (
                            <span
                              className={"week-matrix__chip" + (bk.conflicting ? " week-matrix__chip--conflict" : "")}
                              title={bk.title + " · " + timeLabel(bk.starts_at) + "–" + timeLabel(bk.ends_at) + (bk.conflicting ? " (overlap)" : "")}
                            >
                              {timeLabel(bk.starts_at)}
                            </span>
                          ) : (
                            <span className="week-matrix__empty">—</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageSection>

      {canWrite ? (
        <PageSection>
          <NewBookingForm resources={resources} />
        </PageSection>
      ) : null}

      <PageSection>
        {byDay.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            hint="Bookings for chapels, preparation rooms and vehicles will appear here."
          />
        ) : (
          byDay.map(({ day, bookings: dayBookings }) => (
            <section key={day} className="mb-4">
              <h3>{dayLabel(day)}</h3>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      <th scope="col">Resource</th>
                      <th scope="col">Title</th>
                      <th scope="col">Case</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="text-sm">
                          {timeLabel(b.starts_at)} – {timeLabel(b.ends_at)}
                        </td>
                        <td>
                          <strong>{b.resource_name}</strong>
                        </td>
                        <td>
                          {b.title}
                          {b.conflicting && b.status === "confirmed" ? (
                            <div>
                              <Badge tone="danger">overlap warning</Badge>
                            </div>
                          ) : null}
                        </td>
                        <td className="text-sm">
                          {b.case_number ? b.case_number : "—"}
                        </td>
                        <td>
                          <Badge tone={b.status === "confirmed" ? "success" : "neutral"}>
                            {b.status}
                          </Badge>
                        </td>
                        <td>
                          {b.status === "confirmed" && canWrite ? (
                            <CancelBookingButton
                              bookingId={b.id}
                              chapel={chapelIds.has(b.resource_id)}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </PageSection>
    </>
  );
}
