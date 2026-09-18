import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { CrmLead } from "@/lib/api-client/crm-leads";
import { leadSourceLabel, manilaDay, stageBadgeTone, stageMeta } from "@/lib/crm/lead-view";

/**
 * The CRM area's entry point to the staff lead records: one row per recorded
 * lead, each opening its record at /staff/pipeline/[id]. Shared by the Sales
 * pipeline screen and the Customers screen so there is ONE way into a lead and
 * one grammar for it (CRM area, `cases:read`).
 *
 * Read-only: the rows are the recorded file, not a working pipeline. Nothing
 * here assigns, moves or creates a lead — that waits on the customer-records
 * service, and the pages around this panel say so.
 */
export function LeadRecordsPanel({ leads }: { leads: CrmLead[] }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        title="No lead records yet"
        hint="Recorded enquiries appear here once the office captures them."
      />
    );
  }

  return (
    <div className="table-wrapper" tabIndex={0}>
      <table className="table lead-table">
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Stage</th>
            <th scope="col">Enquiry</th>
            <th scope="col">Handled by</th>
            <th scope="col">Next step</th>
            <th scope="col" aria-label="Record" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <strong>{lead.name}</strong>
                <br />
                <span className="text-sm text-muted">{lead.phone}</span>
              </td>
              <td>
                <Badge tone={stageBadgeTone(lead.stage)}>{stageMeta(lead.stage).label}</Badge>
              </td>
              <td className="text-sm">
                {leadSourceLabel(lead.source)} · {manilaDay(lead.first_contact_at)}
              </td>
              <td className="text-sm">{lead.owner}</td>
              <td className="text-sm">{lead.next_action}</td>
              <td>
                <Link
                  className="btn btn--secondary btn--sm"
                  href={`/staff/pipeline/${lead.id}`}
                  aria-label={`Open record for ${lead.name}`}
                >
                  Open record
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
