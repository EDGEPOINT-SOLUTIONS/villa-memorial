import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ForbiddenState } from "@/components/ui/states";
import { listCustomers } from "@/lib/api-client/crm";
import { listCrmLeads } from "@/lib/api-client/crm-leads";
import { LeadRecordsPanel } from "@/components/crm/lead-records-panel";

export const metadata = { title: "Customers — Staff Portal" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Relationships" title="Customers" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const customers = await listCustomers();
  const leads = await listCrmLeads();
  const activeCount = customers.filter((c) => c.status === "active").length;
  const filtered = query
    ? customers.filter((c) =>
        [c.first_name, c.last_name, c.email, c.phone]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : customers;

  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        actions={
          <>
            <Link href="/staff/customers/new" className="btn btn--primary btn--sm">
              + New customer
            </Link>
            <Link href="/register" className="btn btn--secondary btn--sm">
              Public sign-up page
            </Link>
          </>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Customers</span><span className="kpi-card__value">{customers.length}</span><span className="kpi-card__sub">total records</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Active</span><span className="kpi-card__value">{activeCount}</span><span className="kpi-card__sub">currently active</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Registered</span><span className="kpi-card__value">{customers.filter((x) => x.status === "inactive").length}</span><span className="kpi-card__sub">inactive records</span></span></span>
      </div>

      <PageSection>
        <form className="filter-bar" role="search">
          <input
            className="input"
            type="search"
            name="q"
            placeholder="Search by name, email, or phone…"
            defaultValue={q ?? ""}
            aria-label="Search customers"
          />
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
          {q ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/customers">
              Clear
            </Link>
          ) : null}
        </form>

        {filtered.length === 0 ? (
          <EmptyState
            title={query ? `No customers match “${q}”` : "No customers yet"}
            hint={
              query
                ? "Try a different spelling, or clear the search to see everyone."
                : "New registrations will appear here once the records service is connected."
            }
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registered</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="name-cell">
                        <span className="name-avatar" aria-hidden="true">
                          {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                        </span>
                        <Link href={`/staff/customers/${c.id}`} className="name-cell__link">
                          {c.first_name} {c.last_name}
                        </Link>
                      </span>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td>
                      <Badge tone={c.status === "active" ? "success" : "neutral"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td>{new Date(c.registered_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* The CRM area's other record: the recorded leads (PRD Lead Detail). The
          customer list itself is unchanged; this is the Customers screen's way
          into a lead record, shared with the Sales pipeline screen. */}
      <PageSection>
        <Card header={<h2>Lead records</h2>}>
          <LeadRecordsPanel leads={leads} />
        </Card>
      </PageSection>
    </>
  );
}
