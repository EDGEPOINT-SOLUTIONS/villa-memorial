import type { ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  Church,
  Clock,
  Coins,
  FileText,
  MessageCircle,
  Phone,
  TreePine,
  Users,
  Wrench,
} from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { listFamilyAskFor, listFamilyRequests } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyDayLabel, familyRequestState } from "@/lib/family/family-view";
import {
  Answer,
  CallAction,
  Note,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";
export const metadata = { title: "Requests — Villa Memorial" };

/**
 * One glyph per kind of request (crm-cases.md:44's taxonomy keys). Presentation
 * only — the family's words come from the fixture, and a key the office adds
 * later falls back to the plain message glyph rather than breaking the page.
 */
const ASK_FOR_ICONS: Record<string, ReactNode> = {
  lot: <TreePine size={22} aria-hidden="true" />,
  papers: <FileText size={22} aria-hidden="true" />,
  payment: <Coins size={22} aria-hidden="true" />,
  transfer: <Users size={22} aria-hidden="true" />,
  interment: <BookOpen size={22} aria-hidden="true" />,
  memorial: <MessageCircle size={22} aria-hidden="true" />,
  services: <Church size={22} aria-hidden="true" />,
};

/**
 * Requests — the family's “My Requests” screen (PRD screen-inventory; crm-cases.md
 * » Customer service ticketing), on the shared portal kit.
 *
 * Real today: the office's own record of what this family asked for, each with the
 * state in a family's words and the one step that moves it. The request log itself
 * is not connected to this page — no service desk exists — so every action keeps
 * the office phone, and nothing here invents a ticket number, a person's name or a
 * date we do not hold (lib/fixtures/family/workspace.json carries the provenance).
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const [requests, askFor] = await Promise.all([listFamilyRequests(), listFamilyAskFor()]);

  const open = requests.filter((request) => request.state !== "done");
  const waiting = requests.filter((request) => request.state === "waiting_on_you");
  const done = requests.filter((request) => request.state === "done");
  const openCount = open.length;

  return (
    <>
      <Answer
        kicker="Requests"
        headline={
          openCount > 0
            ? `Ask us for anything. ${countWord(openCount)} ${
                openCount === 1 ? "thing is" : "things are"
              } with us right now.`
            : "Ask us for anything. Nothing is open with us today."
        }
        sub="A repair, a paper, a change, a visit — anything. This is the office’s own record of what your family has asked for, and where each one stands. To add something, call us: we write it down and read it back to you."
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
            {done.length > 0 ? (
              <PortalChip>{done.length === 1 ? "One done" : `${countWord(done.length)} done`}</PortalChip>
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
        sub="One row per request, in the order we wrote it down. Each row says where it stands and what happens now."
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
                  meta={`Asked ${familyDayLabel(request.asked_on)} · ${request.detail} ${request.next}`}
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
            Nothing has been asked for yet. Call us with anything at all and we will write it down
            on this list.
          </p>
        )}
      </Section>

      <Section
        title="What you can ask us for"
        sub="These are the things families ask us for most. You never have to find the right words — describe it and we will write it down."
      >
        <div className="fv-ask">
          {askFor.map((item) => (
            <Row
              key={item.key}
              icon={ASK_FOR_ICONS[item.key] ?? <MessageCircle size={22} aria-hidden="true" />}
              title={item.label}
              meta={item.detail}
            />
          ))}
        </div>
        <p>
          <QuietLink
            href={FAMILY_HELP.phoneHref}
            label="Call us about any of these"
            icon={<Phone size={20} aria-hidden="true" />}
          />
        </p>
      </Section>

      <Note>
        <p>
          <strong>About this page.</strong> This is the office’s own record of your family’s
          requests, kept by hand until the request service is switched on. It is not connected to
          this page yet, so anything new — and anything that has moved — reaches us by phone: call{" "}
          {FAMILY_HELP.phone}, {FAMILY_HELP.hours}, and we will write it down and tell you who has
          it.
        </p>
      </Note>
    </>
  );
}
