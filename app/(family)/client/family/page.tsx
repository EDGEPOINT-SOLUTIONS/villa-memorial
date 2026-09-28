import { FileText, Globe, HeartHandshake, Phone, ScrollText, TreePine, Users } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyHousehold } from "@/lib/family/family-view";
import {
  Answer,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Your family — Villa Funeraria" };

/**
 * Your family — the family account dashboard (PRD screen-inventory “Family
 * Dashboard”; blueprint §39 “My Family”), compressed to the family reading
 * budget (2026-09-21): one-sentence hero, the household, the four things the
 * family holds, and the gaps in the ONE shared `WhatThisShows` disclosure.
 *
 * Real today: the household the snapshot records, the plan and balance, and the
 * papers count — each linked to its own screen. The family circle with its own
 * roles is not wired, so the disclosure says exactly that once instead of five
 * separate “not switched on” lines.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { family, plan_summary, balance, balance_cents, recent_documents } = snapshot;
  const household = familyHousehold(snapshot.loved_one?.name, snapshot.family?.display_name);
  const hasBalance = (balance_cents?.remaining ?? 0) > 0;
  const papers = recent_documents.length;

  return (
    <>
      <Answer
        kicker="Your family"
        headline={`${household} — everything your family holds.`}
        sub="The plan, the lot, the papers and the memorial."
        chips={
          <>
            <PortalChip>{plan_summary.plan_name}</PortalChip>
            <PortalChip>
              {papers === 1 ? "One paper" : `${countWord(papers)} papers`} with your family
            </PortalChip>
          </>
        }
        actions={
          <>
            <PrimaryAction href="/client/plans" label="See your plan" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Call us about anything"
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <Section title="The people on this account" sub="Who signs in today.">
        <Rows>
          <Row
            icon={<Users size={22} aria-hidden="true" />}
            title={family.display_name}
            meta={`The name on this account · ${family.primary_contact}`}
            state="Signs in"
          />
          <Row
            icon={<Globe size={22} aria-hidden="true" />}
            title="Family living abroad"
            meta="Arranged with the office until the family circle is on."
            action={<QuietAction href={FAMILY_HELP.phoneHref} label="Ask us to arrange it" />}
          />
        </Rows>
      </Section>

      <Section title="What your family holds" sub="Every row opens the page that holds it.">
        <Rows>
          <Row
            icon={<ScrollText size={22} aria-hidden="true" />}
            title={plan_summary.plan_name}
            meta={`${plan_summary.status} · over ${plan_summary.term} · ${
              hasBalance ? `${balance.remaining} still to pay` : "fully paid"
            }`}
            state={plan_summary.status}
            action={<QuietAction href="/client/plans" label="See your plan" />}
          />
          <Row
            icon={<TreePine size={22} aria-hidden="true" />}
            title="Your family’s place at the park"
            meta="The park map is real, and open, today."
            action={<QuietAction href="/map" label="Open the park map" />}
          />
          <Row
            icon={<HeartHandshake size={22} aria-hidden="true" />}
            title="Remembering"
            meta="Nothing is published until your family says yes."
            action={<QuietAction href="/client/memorials" label="See remembering" />}
          />
          <Row
            icon={<FileText size={22} aria-hidden="true" />}
            title={papers === 1 ? "One paper with your family" : `${countWord(papers)} papers with your family`}
            meta="The rest arrive as the arrangement goes on."
            action={<QuietAction href="/client/documents" label="See your papers" />}
          />
        </Rows>
      </Section>

      <WhatThisShows>
        Family membership, the lot records and the memorial aren’t connected yet. Call{" "}
        {FAMILY_HELP.phone} and we’ll arrange anything.
      </WhatThisShows>
    </>
  );
}
