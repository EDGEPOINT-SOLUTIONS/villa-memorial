import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyHousehold, listFamilyAskFor } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { personIdFrom } from "@/lib/family/family-household";
import {
  buildFamilyRequestSlip,
  familyRequestFileStem,
} from "@/lib/contracts/family-request-slip";
import { familyVisitKind } from "@/lib/family/family-calendar";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { Answer, PrimaryAction, QuietLink, Section } from "@/components/family/family-ui";

export const metadata = { title: "Your request — Villa Funeraria" };

type SearchParams =
  | Record<string, string | string[] | undefined>
  | undefined;

function paramValue(params: SearchParams, key: string): string | undefined {
  const value = params?.[key];
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) return value.find((entry) => typeof entry === "string" && entry.trim())?.trim();
  return undefined;
}

/**
 * The printed request — one manager's request about ONE loved one and their lot,
 * laid out on the office's own stationery.
 *
 * The payload is rebuilt from the household's records (never from a typed
 * sentence): the person's name and dates, their lot (section · number · plan) and
 * the park come from the fixtures, and only the family's own words are free text.
 * A person or kind the household does not carry is a 404 rather than a slip naming
 * an invented lot.
 *
 * This is not a ticket and nothing is booked: the sheet says so, and the office
 * phone is the action that reaches a person — the request service does not exist.
 */
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalSessionOrRedirect("family");
  const params = searchParams ? await searchParams : undefined;
  const requestedPerson = personIdFrom(params);
  const requestedKind = paramValue(params, "kind");
  const requestedVisit = paramValue(params, "visit");
  const wantedOn = paramValue(params, "date");
  const note = paramValue(params, "note");

  const [household, askFor] = await Promise.all([getFamilyHousehold(), listFamilyAskFor()]);
  const person = requestedPerson
    ? household.people.find((entry) => entry.id === requestedPerson)
    : household.people[0];
  if (!person) notFound();

  // A visit request names the kind from the recorded visit vocabulary; a general
  // request names the office's own request taxonomy. An unknown value on either
  // is a 404 rather than a slip naming the wrong thing.
  let kind: { label: string; detail: string };
  if (requestedVisit) {
    const visit = familyVisitKind(requestedVisit);
    if (!visit) notFound();
    kind = { label: visit.label, detail: visit.detail };
  } else if (requestedKind) {
    const found = askFor.find((entry) => entry.key === requestedKind);
    if (!found) notFound();
    kind = { label: found.label, detail: found.detail };
  } else {
    kind = { label: askFor[0].label, detail: askFor[0].detail };
  }
  const wanted_on = wantedOn && /^\d{4}-\d{2}-\d{2}$/.test(wantedOn) ? wantedOn : undefined;

  const written_on = new Date().toISOString().slice(0, 10);
  const slip = buildFamilyRequestSlip({
    person_name: person.name,
    life_dates: person.life_dates,
    lot_number: person.lot?.lot_number ?? "—",
    lot_section: person.lot?.section ?? "—",
    lot_plan: person.lot?.plan_name ?? "—",
    park: person.lot?.park ?? FAMILY_HELP.park,
    kind: { label: kind.label, detail: kind.detail },
    note,
    wanted_on,
    manager_name: household.family.display_name,
    manager_contact: household.family.primary_contact,
    manager_email: household.family.email,
    written_on,
  });
  const filename = familyRequestFileStem(person.name, written_on);

  return (
    <>
      <Answer
        kicker="Your request"
        headline={`A request about ${person.name}’s lot.`}
        sub="Exactly what we will write down."
        actions={
          <>
            <PrimaryAction href="/client/requests" label="Back to your requests" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />
      <Section
        title="The printed request"
        sub="It names the person, the lot and the request. Print it, or call us."
      >
        <PaperExportActions blocks={slip.blocks} profile={slip.profile} filename={filename} />
        <PaperSheet blocks={slip.blocks} profile={slip.profile} />
      </Section>
    </>
  );
}
