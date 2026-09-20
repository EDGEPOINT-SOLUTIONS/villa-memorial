import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getCustomer, listCustomers } from "@/lib/api-client/crm";

export const metadata = { title: "Customer — Admin Portal" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Relationships" title="Customer not found" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let result: Awaited<ReturnType<typeof getCustomer>> | null = null;
  try {
    result = await getCustomer(id);
  } catch {
    result = null;
  }

  if (!result) {
    // Unknown record → honest error state (fixture dataset is small).
    return (
      <>
        <PageHeader eyebrow="Relationships" title="Customer not found" />
        <PageSection>
          <ErrorState message="We couldn't find that customer record." />
        </PageSection>
      </>
    );
  }

  const { customer, family } = result;
  const allCustomers = await listCustomers();
  const familyMembers =
    family != null
      ? family.members.map((m) => ({
          ...m,
          member: allCustomers.find((c) => c.id === m.customer_id),
        }))
      : [];

  return (
    <>
      <PageHeader eyebrow="Relationships · Customer" title={`${customer.first_name} ${customer.last_name}`} />

      <PageSection>
        <div className="card">
          <div className="card__body case-summary">
            <div>
              <p className="page-header__eyebrow">Customer</p>
              <h2 className="case-summary__name">{customer.first_name} {customer.last_name}</h2>
              <p className="case-summary__meta">
                {customer.email}{customer.phone ? ` · ${customer.phone}` : ""}
                {family ? ` · Family account (${family.members.length} members)` : " · No family account"}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)" }}>
              <Badge tone={customer.status === "active" ? "success" : "neutral"}>{customer.status}</Badge>
              <span className="name-avatar" style={{ width: 44, height: 44, fontSize: "var(--text-md)" }} aria-hidden="true">
                {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
              </span>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card header={<h3>Contact details</h3>}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Email</th>
                  <td>{customer.email}</td>
                </tr>
                <tr>
                  <th scope="row">Phone</th>
                  <td>{customer.phone}</td>
                </tr>
                <tr>
                  <th scope="row">Status</th>
                  <td>
                    <Badge tone={customer.status === "active" ? "success" : "neutral"}>
                      {customer.status}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Registered</th>
                  <td>{new Date(customer.registered_at).toLocaleDateString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Family account</h3>}>
          {family == null ? (
            <p className="mb-0 text-sm text-muted">
              No family account linked yet. Family accounts group members and their
              relationships in one view.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted mb-4">{family.name}</p>
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Relationship</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyMembers.map((m) => (
                      <tr key={m.customer_id}>
                        <td>
                          {m.member ? (
                            <strong>
                              {m.member.first_name} {m.member.last_name}
                            </strong>
                          ) : (
                            <em>unknown member</em>
                          )}
                        </td>
                        <td>{m.relationship}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </PageSection>
    </>
  );
}
