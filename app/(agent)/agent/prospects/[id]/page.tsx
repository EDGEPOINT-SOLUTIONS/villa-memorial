import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentHero, Chip, StageChip, money } from "@/components/agent/agent-ui";
import { getAgentProspect } from "@/lib/api-client/agent";
import {
  activityKindLabel,
  acquisitionSteps,
  interestLabel,
  leadSourceLabel,
  manilaDay,
  manilaTime,
  nextStage,
  stageMeta,
  stageTrail,
} from "@/lib/agent/agent-view";
import { convertedClientId } from "@/lib/agent/acquisition";
import { MoveForwardForm } from "./move-forward";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Lead — Villa Funeraria agent portal" };

const TIMELINE_CLASS: Record<string, string> = {
  call: "ag-tl--appt",
  visit: "ag-tl--appt",
  link: "ag-tl--note",
  message: "ag-tl--note",
  note: "ag-tl--note",
};

/**
 * The lead record (F-09, captain 2026-09-18) — the approved agent design's
 * doorstep view, grown into a record the office can follow:
 *
 *   who they are · where they are (the recorded stage movement, not a badge) ·
 *   what was said (calls, visits, links — as recorded) · what happens next.
 *
 * Everything on the page is read from lib/fixtures/agent/workspace.json through
 * lib/api-client/agent.ts: the stage history, the activity and the next action
 * are records, never invented at render time. The move-forward controls are the
 * design's final shape and disabled; the one honest line at the foot says what
 * still waits on the unbuilt customer-records service, and the office number is
 * read from lib/family/contact.ts rather than typed.
 */
export default async function AgentLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePortalSessionOrRedirect("agent");
  const { id } = await params;
  const result = await getAgentProspect(id);
  if (!result) notFound();

  const { prospect, activity, shares } = result;
  const tel = `tel:${prospect.phone.replace(/\s/g, "")}`;
  const sms = `sms:${prospect.phone.replace(/\s/g, "")}`;
  const trail = stageTrail(prospect.stage);
  const history = prospect.stage_history;
  const steps = acquisitionSteps(prospect.stage);
  const currentStep = steps.find((step) => step.current) ?? steps[0];
  const upcoming = nextStage(prospect.stage);
  const upcomingLabel = upcoming ? stageMeta(upcoming).label : "";
  const convertedClient = prospect.stage === "sold" ? convertedClientId(prospect.id) : null;

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow={`Lead · ${interestLabel(prospect.interest)} enquiry`}
        title={prospect.name}
        lead={`${leadSourceLabel(prospect.source)} · came in ${manilaDay(prospect.first_contact_at)} · handled by ${prospect.owner}`}
        chips={
          <>
            <Chip>{prospect.phone}</Chip>
            <Chip>{prospect.email}</Chip>
            <StageChip stage={prospect.stage} />
          </>
        }
      >
        <div className="ag-action">
          <div className="ag-action__body">
            <p className="ag-action__title">{prospect.next_action}</p>
            <p className="ag-action__detail">
              Best time: {prospect.best_time} · Last contact: {manilaDay(prospect.last_contact_at)} ·
              Possible value {money(prospect.possible_value_cents)}
            </p>
          </div>
          <div className="ag-action__buttons">
            <a className="btn btn--primary ag-btn-xl" href={tel}>
              Call now
            </a>
            <a className="btn btn--secondary ag-btn-xl" href={sms}>
              Text
            </a>
          </div>
        </div>
      </AgentHero>

      <section className="ag-sec">
        <div className="ag-sec__head">
          <div>
            <h2 className="ag-h2">Where they are</h2>
            <p className="ag-sub">The pipeline, and every recorded move that got them here.</p>
          </div>
          <StageChip stage={prospect.stage} />
        </div>
        <div className="ag-card">
          <div className="ag-card__body">
            <ol className="ag-trail" aria-label="Pipeline progress">
              {trail.map((step) => (
                <li
                  key={step.stage}
                  className={`ag-trail__step${step.reached ? " ag-trail__step--reached" : ""}${
                    step.current ? " ag-trail__step--current" : ""
                  }`}
                >
                  <span className="ag-trail__dot" aria-hidden="true" />
                  {step.label}
                </li>
              ))}
            </ol>
            {history.length === 0 ? (
              <p className="ag-note">No movement recorded yet — this is where the record starts.</p>
            ) : (
              <ol className="ag-timeline" aria-label="Stage history">
                {history.map((event) => (
                  <li className="ag-tl" key={`${event.stage}-${event.at}`}>
                    <span className="ag-tl__dot" />
                    <p className="ag-tl__when">
                      {manilaDay(event.at)} · {event.by}
                    </p>
                    <p className="ag-tl__title">Moved to {stageMeta(event.stage).label}</p>
                    <p className="ag-tl__detail">{event.note}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <div className="ag-grid-2">
        <div className="ag-card">
          <div className="ag-card__head">
            <div>
              <h3 className="ag-card__title">What they want</h3>
              <p className="ag-card__sub">In their words, not ours.</p>
            </div>
          </div>
          <div className="ag-card__body">
            <dl style={{ margin: 0 }}>
              <div className="ag-kv">
                <dt>Product</dt>
                <dd>{interestLabel(prospect.interest)}</dd>
              </div>
              <div className="ag-kv">
                <dt>Wants</dt>
                <dd>{prospect.want}</dd>
              </div>
              <div className="ag-kv">
                <dt>Notes</dt>
                <dd>{prospect.notes}</dd>
              </div>
            </dl>
            <p className="ag-note">Possible value is the whole contract, not a monthly figure.</p>
          </div>
        </div>

        <div className="ag-card">
          <div className="ag-card__head">
            <div>
              <h3 className="ag-card__title">What you&apos;ve shared</h3>
              <p className="ag-card__sub">Links you sent, and whether they were opened.</p>
            </div>
          </div>
          <div className="ag-card__body">
            {shares.length === 0 ? (
              <p className="ag-note">Nothing shared yet. The materials page has the office&apos;s own sheets.</p>
            ) : (
              shares.map((s) => (
                <div className="ag-person" key={s.id}>
                  <span className="ag-person__av" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" /></svg>
                  </span>
                  <div>
                    <p className="ag-person__name">{s.title}</p>
                    <p className="ag-person__role">
                      Sent {manilaDay(s.sent_at)} · opened {s.opens === 1 ? "once" : `${s.opens} times`},
                      last {manilaDay(s.last_open)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div className="ag-actions">
              <Link className="btn btn--primary btn--sm" href="/agent/marketing">
                Send something else
              </Link>
              <button className="btn btn--ghost btn--sm" type="button" disabled title="Not switched on yet">
                Log a visit or note
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="ag-sec">
        <div className="ag-sec__head">
          <div>
            <h2 className="ag-h2">Every conversation</h2>
            <p className="ag-sub">Newest first — what was said, so the next call does not start from zero.</p>
          </div>
        </div>
        <div className="ag-card">
          <div className="ag-card__body">
            {activity.length === 0 ? (
              <p className="ag-note">No contact yet — the first call is the next action above.</p>
            ) : (
              <ol className="ag-timeline">
                {activity.map((a) => (
                  <li className={`ag-tl ${TIMELINE_CLASS[a.kind] ?? "ag-tl--note"}`} key={a.id}>
                    <span className="ag-tl__dot" />
                    <p className="ag-tl__when">
                      {activityKindLabel(a.kind)} · {manilaDay(a.at)} · {manilaTime(a.at)}
                    </p>
                    <p className="ag-tl__title">{a.title}</p>
                    <p className="ag-tl__detail">{a.detail}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section className="ag-sec">
        <div className="ag-sec__head">
          <div>
            <h2 className="ag-h2">Move them forward</h2>
          </div>
          <StageChip stage={prospect.stage} />
        </div>

        <div className="ag-card">
          <div className="ag-card__body">
            <ol className="ag-steps" aria-label="Acquisition steps">
              {steps.map((step) => (
                <li
                  key={step.stage}
                  className={`ag-step${step.reached ? " ag-step--reached" : ""}${
                    step.current ? " ag-step--current" : ""
                  }`}
                >
                  <span className="ag-step__dot" aria-hidden="true" />
                  <div className="ag-step__body">
                    <span className="ag-step__label">
                      {step.label}
                      {step.current ? <span className="ag-step__now">Current step</span> : null}
                    </span>
                    {step.current && step.purpose ? (
                      <span className="ag-step__purpose">{step.purpose}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            <MoveForwardForm
              prospectId={prospect.id}
              nextStage={upcoming}
              nextLabel={upcomingLabel}
              action={currentStep?.action ?? ""}
              clientId={convertedClient}
            />
          </div>
        </div>

        <div className="ag-choice-row">
          <button className="ag-choice" type="button" disabled title="Waits on the property hold contract">
            Ask the office to hold a lot
            <small>Lot hold · property contract</small>
          </button>
          <button className="ag-choice" type="button" disabled title="Waits on the orders contract">
            Start an order
            <small>Order · commerce contract</small>
          </button>
          <button className="ag-choice" type="button" disabled title="Waits on the billing contract">
            Take a payment
            <small>Payment · billing contract</small>
          </button>
          <button className="ag-choice" type="button" disabled title="Waits on the documents contract">
            File a document
            <small>Upload · documents contract</small>
          </button>
        </div>
        <p className="ag-note">
          Stage moves save with your name and the time. Holds, orders, payments and uploads stay with
          the office.
        </p>
      </section>

      <p className="ag-note">
        Kept on the demo record — enquiry capture, customer sync and lead assignment wait on the
        customer-records service; the office is on{" "}
        <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a>.
      </p>
    </div>
  );
}
