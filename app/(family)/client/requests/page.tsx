import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { listFamilyAskFor, listFamilyRequests } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyDayLabel, familyRequestState } from "@/lib/family/family-view";
import {
  Answer,
  CallAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Requests — Villa Memorial" };

/**
 * Requests — the family's “My Requests” screen (PRD screen-inventory),
 * compressed to the family reading budget (2026-09-21): one-sentence hero, the
 * family's own requests as rows, and the “what you can ask for” catalogue
 * behind the ONE shared `WhatThisShows` disclosure (a menu, not status).
 *
 * Real today: the office's own record of what this family asked for, each with
 * the state in a family's words and the one step that moves it. The request log
 * itself is not connected — no service desk exists — so every action keeps the
 * office phone, and nothing here invents a ticket number, a person's name or a
 * date we do not hold (lib/fixtures/family/workspace.json carries the
 * provenance).
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const [requests, askFor] = await Promise.all([listFamilyRequests(), listFamilyAskFor()]);

  const open = requests.filter((request) => request.state !== "done");
  const waiting = requests.filter((request) => request.state === "waiting_on_you");
  const openCount = open.length;

  return (
    <>
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

      <Section
        id="requests"
        title="What you asked for"
        sub="One row per request, and where it stands."
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
          <p className="ag-sub">
            Nothing has been asked for yet. Call us with anything at all.
          </p>
        )}
      </Section>

      <WhatThisShows planned={askFor.map((item) => ({ label: item.label, detail: item.detail }))}>
        The request service isn’t connected yet. Call {FAMILY_HELP.phone} and we’ll write it down.
      </WhatThisShows>
    </>
  );
}
