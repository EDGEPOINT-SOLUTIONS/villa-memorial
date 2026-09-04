import { PageHeader, Badge, Card, Button } from "../components/ui";
import { SCHEDULE, type Booking } from "../lib/data";

const DAYS = ["Wed 02", "Thu 03", "Fri 04", "Sat 05", "Sun 06"];

const RESOURCES = ["Main Chapel", "Chapel B", "Van 2", "Embalming Bay"];

function bookingFor(resource: string, day: string): Booking | undefined {
  return SCHEDULE.find((b) => b.resource === resource && b.date.includes(day.slice(-2)));
}

export function SchedulePage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Schedule"
        actions={<Button size="sm">+ New booking</Button>}
      />

      <Card title="Week at a glance">
        <div className="table-wrapper" style={{ border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Resource</th>
                {DAYS.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((r) => (
                <tr key={r}>
                  <td className="table__name">{r}</td>
                  {DAYS.map((d) => {
                    const b = bookingFor(r, d);
                    return (
                      <td key={d}>
                        {b ? (
                          <Badge tone={b.status === "Booked" ? "info" : b.status === "Complete" ? "success" : "neutral"}>
                            {b.time} · {b.title}
                          </Badge>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="small muted" style={{ marginTop: "var(--space-4)" }}>
        The real booking engine checks live resource availability and prevents double-booking of
        chapels, vehicles, and staff.
      </p>
    </>
  );
}
