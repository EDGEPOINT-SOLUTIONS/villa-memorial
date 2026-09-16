import { FileText, Globe, HeartHandshake, Phone, ScrollText, TreePine, Users } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyHousehold } from "@/lib/family/family-view";
import {
  Answer,
  Note,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Your family — Villa Memorial" };

/**
 * Your family — the family account dashboard (PRD screen-inventory “Family
 * Dashboard”; blueprint §39 “My Family”), on the shared portal kit.
 *
 * Real today: the household the snapshot records, the plan and balance, and
 * the papers count — each linked to its own screen. The family circle with its
 * own roles is not wired, so the people block says exactly that instead of
 * showing invented members. Nothing here is a figure we do not hold.
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
        headline={`${household} — everything your family holds with Villa Memorial.`}
        sub="The plan, the lot, the papers and the memorial, and who can see them. Where something is not connected yet, we say so plainly rather than guess."
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

      <Section
        title="The people on this account"
        sub="Who signs in today, and who will be able to when the family circle is switched on."
      >
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
            meta="Joining from overseas will be arranged with the office until the family circle is switched on."
            action={
              <QuietAction href={FAMILY_HELP.phoneHref} label="Ask us to arrange it" />
            }
          />
        </Rows>
      </Section>

      <Section
        title="What your family holds"
        sub="Every row opens the page that holds it — nothing here is a summary we cannot stand behind."
      >
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
            meta="Lot records are kept by the property office — the park map is real, and open, today."
            action={<QuietAction href="/map" label="Open the park map" />}
          />
          <Row
            icon={<HeartHandshake size={22} aria-hidden="true" />}
            title="Remembering"
            meta="Nothing about your loved one is published anywhere until your family says yes."
            action={<QuietAction href="/client/memorials" label="See remembering" />}
          />
          <Row
            icon={<FileText size={22} aria-hidden="true" />}
            title={papers === 1 ? "One paper with your family" : `${countWord(papers)} papers with your family`}
            meta="The papers your family holds today — the rest arrive as the arrangement goes on."
            action={<QuietAction href="/client/documents" label="See your papers" />}
          />
        </Rows>
      </Section>

      <Section
        title="Who can see it"
        sub="Today, one account signs in — this one. A family circle with its own roles, and a log of every staff look-up, is on its way."
      >
        <Rows>
          <Row
            icon={<Users size={22} aria-hidden="true" />}
            title="Roles for each family member"
            meta="Each person with their own sign-in and their own level of access — not switched on yet."
            action={<QuietAction href="/client/privacy" label="Open Privacy Center" />}
          />
        </Rows>
      </Section>

      <Note>
        <p>
          <strong>About this page.</strong> The household, the plan, the balance and the papers
          count come from our office’s own records. Family membership, the lot records and the
          memorial are not switched on yet — until they are, call us and we will arrange anything
          for your family, or add it to your account by hand.
        </p>
      </Note>
    </>
  );
}
