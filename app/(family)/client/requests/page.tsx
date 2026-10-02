import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import {
  getFamilyHousehold,
  getFamilySnapshot,
  listFamilyAskFor,
  listFamilyRequests,
} from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyDayLabel, familyRequestState } from "@/lib/family/family-view";
import { personIdFrom } from "@/lib/family/family-household";
import { PersonSwitcherForSnapshot } from "@/components/family/family-person-switcher";
import { FamilyEmptyState } from "@/components/family/family-empty";
import {
  FamilyRequestComposer,
  type ComposerPerson,
} from "@/components/family/family-request-composer";
import {
  Answer,
  CallAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  WhatThisShows,
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Requests — Villa Funeraria" };

/**
 * Requests — the family's “My Requests” screen (PRD screen-inventory), on the
 * dashboard's dense grammar (2026-09-30).
 *
 * THE HOUSEHOLD (captain, 2026-09-30): the manager asks for things on behalf of a
 * loved one, so the composer always names WHICH person and WHICH lot the request
 * is about — the person and lot come from the household's own records, never from
 * a typed sentence, and the office receives that link on the printed request
 * (lib/contracts/family-request-slip.ts). The request log itself is not connected
 * — no service desk exists — so every action keeps the office phone, and nothing
 * here invents a ticket number, a person's name or a date we do not hold.
 */
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalSessionOrRedirect("family");
  const requested = personIdFrom(await searchParams);
  const [snapshot, requests, askFor, household] = await Promise.all([
    getFamilySnapshot(requested),
    listFamilyRequests(requested),
    listFamilyAskFor(),
    getFamilyHousehold(),
  ]);

  if (!snapshot) {
    return (
      <FamilyEmptyState
        kicker="Requests"
        headline="Nobody is on your account yet."
        sub="Add the person you look after, then ask us for anything on their behalf."
      />
    );
  }

  const open = requests.filter((request) => request.state !== "done");
  const waiting = requests.filter((request) => request.state === "waiting_on_you");
  const openCount = open.length;

  const composerPeople: ComposerPerson[] = household.people.map((person) => ({
    id: person.id,
    name: person.name,
    life_dates: person.life_dates,
    lot_number: person.lot?.lot_number ?? "—",
    lot_section: person.lot?.section ?? "—",
    lot_plan: person.lot?.plan_name ?? "—",
    park: person.lot?.park ?? FAMILY_HELP.park,
  }));

  return (
    <div className="dash">
      <PersonSwitcherForSnapshot snapshot={snapshot} basePath="/client/requests" />
      <Answer
        kicker="Requests"
        headline={
          openCount > 0
            ? `${countWord(openCount)} ${openCount === 1 ? "request is" : "requests are"} with us right now.`
            : "Nothing is open with us today."
        }
        sub="Ask us for anything — call and we write it down."
        chips={
          <>
            {openCount > 0 ? (
              <PortalChip>{openCount === 1 ? "One open" : `${countWord(openCount)} open`}</PortalChip>
            ) : null}
            {waiting.length > 0 ? (
              <PortalChip>
                {waiting.length === 1 ? "One is waiting on you" : `${countWord(waiting.length)} waiting on you`}
              </PortalChip>
            ) : null}
          </>
        }
        actions={
          <>
            <CallAction label={`Call ${FAMILY_HELP.phone}`} />
            <QuietLink
              href="#requests"
              label="See what you asked for"
              icon={<MessageCircle size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <div className="dash-grid">
        <DashPanel
          id="requests"
          role="needs"
          className="dash-span-12"
          label="Requests"
          title="What you asked for"
          count={requests.length > 0 ? countWord(requests.length) : undefined}
        >
          {requests.length > 0 ? (
            <Rows>
              {requests.map((request) => {
                const state = familyRequestState(request.state);
                return (
                  <Row
                    key={request.id}
                    icon={
                      request.state === "done" ? (
                        <CheckCircle2 size={22} aria-hidden="true" />
                      ) : request.state === "waiting_on_you" ? (
                        <Clock size={22} aria-hidden="true" />
                      ) : (
                        <Wrench size={22} aria-hidden="true" />
                      )
                    }
                    title={request.title}
                    meta={`Asked ${familyDayLabel(request.asked_on)} · ${request.detail}`}
                    state={state.label}
                    wait={state.wait}
                    action={
                      <QuietAction href={FAMILY_HELP.phoneHref} label={request.action_label} />
                    }
                  />
                );
              })}
            </Rows>
          ) : (
            <p className="dash-empty">
              Nothing has been asked for yet. Call us with anything at all.
            </p>
          )}
        </DashPanel>

        <DashPanel
          id="ask"
          role="neutral"
          className="dash-span-12"
          label="Ask"
          title="Ask us for something"
        >
          <FamilyRequestComposer
            people={composerPeople}
            askFor={askFor}
            defaultPersonId={snapshot.person_id}
            managerName={household.family.display_name}
            managerContact={household.family.primary_contact}
          />
        </DashPanel>
      </div>

      <WhatThisShows planned={askFor.map((item) => ({ label: item.label, detail: item.detail }))}>
        The request service isn’t connected yet. Call {FAMILY_HELP.phone} and we’ll write it down.
      </WhatThisShows>
    </div>
  );
}
