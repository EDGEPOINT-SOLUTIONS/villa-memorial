import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QUEUE_KIND_LABEL, type QueueRow } from "@/lib/staff-queue";

/**
 * The dashboard's cross-record work queue (admin plan wave 1).
 *
 * One list across payments, family requests, orders, tasks and today's services,
 * each row typed and linked to the record's own screen. It renders the kit's
 * table/empty grammar only — no bespoke markup.
 */
export function NeedsYou({ rows, limit }: { rows: readonly QueueRow[]; limit?: number }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing needs you right now"
        hint="A new request, a due payment or an overdue task appears here as the office records it."
      />
    );
  }

  const shown = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="table-wrapper" tabIndex={0}>
      <table className="table">
        <thead>
          <tr>
            <th>What</th>
            <th>Record</th>
            <th>Waiting</th>
            <th>Owner</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.id}>
              <td>
                <Badge tone={row.tone}>{QUEUE_KIND_LABEL[row.kind]}</Badge>
              </td>
              <td>
                <div className="table__name">{row.title}</div>
                <div className="table__sub">{row.detail}</div>
              </td>
              <td className="nowrap">{row.waiting}</td>
              <td>{row.owner}</td>
              <td>
                {row.href ? (
                  <Link className="btn btn--secondary btn--sm" href={row.href}>
                    Open
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
