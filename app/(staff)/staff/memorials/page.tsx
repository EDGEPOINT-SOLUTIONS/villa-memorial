import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { StatCard, StatusChip } from "@/components/kit";
import { DataTable } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getFamilyHousehold } from "@/lib/api-client/family";
import { readMemorialConsents } from "@/lib/api-client/memorial-store";
import {
  MEMORIAL_CONSENT_DEFAULT,
  MEMORIAL_FIELD_CHOICES,
  type MemorialConsent,
  type MemorialConsentRecord,
} from "@/lib/memorials";

export const metadata = { title: "Memorials — Admin Portal" };

/**
 * Staff Memorials (`/staff/memorials`) — the Families & inquiries area's view of
 * the published digital memorials (admin plan; F-04).
 *
 * The family's own consent switch is the reader's gate: nothing is published
 * until the family says so, and each field (photograph, birth year, death year,
 * resting place) is chosen separately. This screen shows the office what is
 * public and what is not, from the SAME consent store the family page writes —
 * a person with no saved consent reads the safe default, off.
 *
 * No digital-memorial service or contract exists (`lib/live-mode.ts` keeps the
 * switch in state “none”), so the page states that boundary plainly.
 */

function chosenFields(consent: MemorialConsent): string[] {
  const labels: string[] = [];
  if (consent.show_photo) labels.push("Photograph");
  if (consent.show_birth) labels.push("Birth year");
  if (consent.show_death) labels.push("Death year");
  if (consent.show_lot) labels.push("Resting place");
  return labels;
}

export default async function MemorialsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Families & inquiries" title="Memorials" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let people: Awaited<ReturnType<typeof getFamilyHousehold>>["people"];
  let consents: MemorialConsentRecord[];
  try {
    const household = await getFamilyHousehold();
    people = household.people;
    consents = await readMemorialConsents();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Families & inquiries" title="Memorials" />
        <PageSection>
          <ErrorState message="Unable to load the memorial consent records." />
        </PageSection>
      </>
    );
  }

  const byPerson = new Map(consents.map((record) => [record.person_id, record]));
  const rows = people.map((person) => {
    const record = byPerson.get(person.id);
    const consent: MemorialConsent = record ?? MEMORIAL_CONSENT_DEFAULT;
    return {
      id: person.id,
      name: person.name,
      life_dates: person.life_dates,
      visible: consent.visible,
      fields: chosenFields(consent),
      updated_at: record?.updated_at ?? null,
    };
  });

  const published = rows.filter((row) => row.visible).length;

  return (
    <>
      <PageHeader
        eyebrow="Families & inquiries"
        title="Memorials"
        lead="The digital memorials the office holds, and the family's public choices."
        actions={
          <StatusChip tone="warning">No digital-memorial service yet</StatusChip>
        }
      />

      <div className="kpi-grid">
        <StatCard label="People on record" value={rows.length} sub="in the office household" />
        <StatCard label="Published" value={published} sub="family switch on" />
        <StatCard label="Not published" value={rows.length - published} sub="safe default" />
        <StatCard
          label="Service"
          value="Off"
          sub="no digital-memorial contract is frozen"
        />
      </div>

      <PageSection>
        <DataTable
          columns={[
            { key: "name", header: "Person" },
            { key: "life", header: "Life dates", className: "text-sm" },
            { key: "state", header: "Public" },
            { key: "fields", header: "Fields shown" },
            { key: "updated", header: "Last changed", className: "text-sm" },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
          emptyTitle="No memorials on record"
          emptyHint="A loved one appears here as the office records them."
          renderCell={(row, column) => {
            switch (column.key) {
              case "name":
                return <strong className="table__name">{row.name}</strong>;
              case "life":
                return row.life_dates;
              case "state":
                return (
                  <StatusChip tone={row.visible ? "success" : "neutral"}>
                    {row.visible ? "Published" : "Not published"}
                  </StatusChip>
                );
              case "fields":
                return row.fields.length > 0 ? row.fields.join(" · ") : "—";
              case "updated":
                return row.updated_at
                  ? new Date(row.updated_at).toLocaleDateString()
                  : "Never saved";
              default:
                return null;
            }
          }}
          caption={
            <>
              The family&apos;s switch is the gate — {MEMORIAL_FIELD_CHOICES.length} fields may be shown
              separately, and nothing is public by default.
            </>
          }
        />
      </PageSection>

      <PageSection>
        <p className="text-sm text-muted">
          A published memorial is read by the public search at <code>/memorials</code>. The
          office cannot publish one on a family&apos;s behalf: the family page owns the switch.
        </p>
      </PageSection>
    </>
  );
}
