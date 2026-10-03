import Link from "next/link";
import { ENGAGEMENT_KIND_LABEL, type EngagementKind } from "@/lib/lifecycle";

/**
 * Sold prospects still waiting for an outcome on one register.
 *
 * Read from the SAME agent journal the Prospects screen and the agent portal
 * fold, so a sale the office has not yet recorded as a plan / service / lot /
 * product is surfaced with a one-press way to record it — never silently lost
 * between the pipeline and the register.
 */
export function AwaitingSales({
  kind,
  prospects,
}: {
  kind: EngagementKind;
  prospects: Array<{ id: string; name: string; phone: string; want: string }>;
}) {
  if (prospects.length === 0) return null;
  return (
    <section className="card" aria-labelledby="awaiting-sales-title">
      <div className="card__header">
        <h2 id="awaiting-sales-title">Sold, no outcome recorded yet</h2>
      </div>
      <div className="card__body stack-2">
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          These prospects reached &ldquo;Sold&rdquo; in the pipeline. Record their{" "}
          {ENGAGEMENT_KIND_LABEL[kind].toLowerCase()} so the register and the pipeline agree.
        </p>
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Prospect</th>
                <th scope="col">Asked about</th>
                <th scope="col">
                  <span className="visually-hidden">Record</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((prospect) => (
                <tr key={prospect.id}>
                  <th scope="row">
                    {prospect.name || prospect.phone}
                    <span className="text-sm text-muted"> {prospect.phone}</span>
                  </th>
                  <td>{prospect.want || "—"}</td>
                  <td className="table__numeric">
                    <Link
                      href={`/staff/lifecycle/new?kind=${kind}&prospect=${encodeURIComponent(prospect.id)}&name=${encodeURIComponent(prospect.name)}`}
                      className="btn btn--ghost btn--sm"
                    >
                      Record
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
