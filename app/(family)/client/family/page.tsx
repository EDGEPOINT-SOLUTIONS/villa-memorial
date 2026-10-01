import { FileText, Globe, HeartHandshake, Phone, ScrollText, TreePine, Users } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyHousehold } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyHousehold } from "@/lib/family/family-view";
import { PersonSwitcher } from "@/components/family/family-person-switcher";
import {
  Answer,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  WhatThisShows,
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Your family — Villa Funeraria" };

/**
 * Your family — the household dashboard (PRD screen-inventory “Family
 * Dashboard”; blueprint §39 “My Family”), on the dashboard's dense grammar
 * (2026-09-30).
 *
 * THE HOUSEHOLD (captain, 2026-09-30): one account looks after MANY loved ones,
 * so “who you look after” is one row per person, each with their OWN plan and
 * their OWN remaining balance — never one blended total. A household of one
 * reads exactly as it did before.
 *
 * Real today: the household the snapshot records, each loved one's plan and
 * balance, and the papers count — each row links to its own screen. The family
 * circle with its own roles is not wired, so the disclosure says exactly that
 * once.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const household = await getFamilyHousehold();
  const people = household.people;
  const householdName = familyHousehold(people[0]?.name, household.family.display_name);
  const papers = people.reduce((sum, person) => sum + person.recent_documents.length, 0);

  return (
    <div className="dash">
      <PersonSwitcher
        people={people.map((person) => ({
          id: person.id,
          name: person.name,
          life_dates: person.life_dates,
        }))}
        basePath="/client/family"
      />
      <Answer
        kicker="Your family"
        headline={`${householdName} — everything your family holds.`}
        sub="The plans, the lots, the papers and the memorial."
        chips={
          <>
            <PortalChip>
              {people.length === 1 ? "One loved one" : `${countWord(people.length)} loved ones`}
            </PortalChip>
            <PortalChip>
              {papers === 1 ? "One paper" : `${countWord(papers)} papers`} with your family
            </PortalChip>
          </>
        }
        actions={
          <>
            <PrimaryAction href="/client/plans" label="See the plans" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Call us about anything"
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <div className="dash-grid">
        <DashPanel
          role="money"
          className="dash-span-7"
          label="People"
          title="Who you look after"
        >
          <Rows>
            {people.map((person) => {
              const remaining = person.balance_cents?.remaining ?? 0;
              const first = person.name.split(/\s+/)[0] || person.name;
              return (
                <Row
                  key={person.id}
                  icon={<Users size={22} aria-hidden="true" />}
                  title={person.name}
                  meta={`${person.life_dates} · ${person.plan_summary.plan_name}`}
                  state={remaining > 0 ? `${person.balance.remaining} to pay` : "Paid in full"}
                  wait={remaining > 0}
                  action={
                    <QuietAction
                      href={`/client/plans?person=${encodeURIComponent(person.id)}`}
                      label={`${first}’s plan`}
                    />
                  }
                />
              );
            })}
          </Rows>
        </DashPanel>

        <DashPanel
          role="place"
          className="dash-span-5"
          label="People"
          title="The people on this account"
        >
          <Rows>
            <Row
              icon={<Users size={22} aria-hidden="true" />}
              title={household.family.display_name}
              meta={`The name on this account · ${household.family.primary_contact}`}
              state="Signs in"
            />
            <Row
              icon={<Globe size={22} aria-hidden="true" />}
              title="Family living abroad"
              meta="Arranged with the office until the family circle is on."
              action={<QuietAction href={FAMILY_HELP.phoneHref} label="Ask us to arrange it" />}
            />
          </Rows>
        </DashPanel>

        <DashPanel
          role="money"
          className="dash-span-12"
          label="Held"
          title="What your family holds"
        >
          <Rows>
            <Row
              icon={<ScrollText size={22} aria-hidden="true" />}
              title={people.length === 1 ? "The plan" : "The plans"}
              meta={people.length === 1 ? "Your plan, and what is left on it." : "One plan per loved one."}
              action={<QuietAction href="/client/plans" label="See the plans" />}
            />
            <Row
              icon={<TreePine size={22} aria-hidden="true" />}
              title="Your family’s places at the park"
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
              meta="The rest arrive as the arrangements go on."
              action={<QuietAction href="/client/documents" label="See your papers" />}
            />
          </Rows>
        </DashPanel>
      </div>

      <WhatThisShows>
        Family membership, the lot records and the memorial aren’t connected yet. Call{" "}
        {FAMILY_HELP.phone} and we’ll arrange anything.
      </WhatThisShows>
    </div>
  );
}
