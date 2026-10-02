import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { StatusChip, type StatusTone } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { STAFF_FORMS, type StaffFormStatus } from "@/lib/staff-forms";

export const metadata = { title: "Forms — Admin Portal" };

const STATUS_LABEL: Record<StaffFormStatus, string> = {
  working: "Working",
  contextual: "Opened from a record",
  public: "Public form",
  waits: "Waits on a service",
};

const STATUS_TONE: Record<StaffFormStatus, StatusTone> = {
  working: "success",
  contextual: "info",
  public: "neutral",
  waits: "warning",
};

/**
 * Forms (`/staff/forms`) — ONE place listing every form the office fills, each
 * opening its own dedicated page (the captain's follow-up).
 *
 * The list is `lib/staff-forms.ts`, not this view: the hub, the test and any future
 * surface read the same entries, so a form cannot be listed here and missing there.
 * The status is honest — "Working" only when the page writes a durable store,
 * "Waits on a service" when the service is unbuilt, and "Opened from a record" when
 * the form starts from a case or a lot rather than standing alone. The grammar is
 * the existing `.table`, so no new visual language is introduced.
 */
export default async function FormsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Forms & documents" title="Forms" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Forms & documents"
        title="Forms"
        lead="Every form the office fills, each on its own page."
      />

      {STAFF_FORMS.map((group) => (
        <PageSection key={group.key}>
          <div className="row row--space row--wrap">
            <h2 className="page-section-title">{group.label}</h2>
            <span className="text-sm text-muted">{group.blurb}</span>
          </div>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Form</th>
                  <th scope="col">What it is for</th>
                  <th scope="col">State</th>
                  <th scope="col">Open</th>
                </tr>
              </thead>
              <tbody>
                {group.forms.map((form) => (
                  <tr key={form.key}>
                    <td>
                      <strong>
                        <Link href={form.href}>{form.name}</Link>
                      </strong>
                    </td>
                    <td className="text-sm">{form.purpose}</td>
                    <td>
                      <StatusChip tone={STATUS_TONE[form.status]}>
                        {STATUS_LABEL[form.status]}
                      </StatusChip>
                    </td>
                    <td>
                      <Link className="btn btn--secondary btn--sm" href={form.href}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSection>
      ))}
    </>
  );
}
