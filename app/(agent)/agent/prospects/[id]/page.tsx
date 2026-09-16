import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentHero, Chip, money } from "@/components/agent/agent-ui";
import { getAgentProspect } from "@/lib/api-client/agent";
import { interestLabel, manilaDay, manilaTime, stageMeta } from "@/lib/agent/agent-view";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";

export const metadata = { title: "Prospect — Villa Memorial agent portal" };

const TIMELINE_CLASS: Record<string, string> = {
  call: "ag-tl--appt",
  visit: "ag-tl--appt",
  link: "ag-tl--note",
  message: "ag-tl--note",
  note: "ag-tl--note",
};

/**
 * Prospect record — the doorstep view (approved design page 04). Everything the
 * agent needs at the door: who they are, what they want, what was said, and the
 * next action. Stage movement is shown in its final shape; the write itself
 * waits on the crm-families contract and says so.
 */
export default async function AgentProspectPage({
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
  const stage = stageMeta(prospect.stage);

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow={`Prospect · ${interestLabel(prospect.interest)} enquiry`}
        title={prospect.name}
        lead={`${interestLabel(prospect.interest)} interest · source ${prospect.source.replace("_", " ")} · ${prospect.notes}`}
        chips={
          <>
            <Chip>{prospect.phone}</Chip>
            <Chip>{prospect.email}</Chip>
            <Chip>Stage: {stage.label}</Chip>
            <Chip>Source: {prospect.source.replace("_", " ")}</Chip>
          </>
        }
      >
        <div className="ag-action">
          <div className="ag-action__body">
            <p className="ag-action__title">{prospect.next_action}</p>
            <p className="ag-action__detail">
              Best time: {prospect.best_time} · Possible value {money(prospect.possible_value_cents)} ·
              Last contact {manilaDay(prospect.last_contact_at)}
            </p>
          </div>
          <div className="ag-action__buttons">
            <a className="btn btn--primary ag-btn-xl" href={tel}>
              Call now
            </a>
            <a className="btn btn--secondary ag-btn-xl" href={sms}>
              Text
            </a>
            <button
              className="btn btn--ghost"
              type="button"
              disabled
              title="Waits on the crm-families write contract"
            >
              Mark done
            </button>
          </div>
        </div>
      </AgentHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(20rem, 100%), 1fr))", gap: "var(--space-5)", alignItems: "start" }}>
        <div className="ag-card">
          <div className="ag-card__head">
            <div>
              <h2 className="ag-card__title">What they want</h2>
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
                <dt>Best time</dt>
                <dd>{prospect.best_time}</dd>
              </div>
              <div className="ag-kv">
                <dt>Notes</dt>
                <dd>{prospect.notes}</dd>
              </div>
            </dl>
            <p className="ag-note">
              Amounts shown are the client&apos;s own 2026 sheet, read live in the real app from
              lib/villa-pricing.ts — never typed by hand.
            </p>
          </div>
        </div>

        <div className="ag-card">
          <div className="ag-card__head">
            <div>
              <h2 className="ag-card__title">What you&apos;ve shared</h2>
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
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <Link className="btn btn--primary btn--sm" href="/agent/marketing">
                Send something else
              </Link>
              <button className="btn btn--ghost btn--sm" type="button" disabled title="Waits on the CRM write contract">
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
            <p className="ag-sub">What was said, so the next call does not start from zero.</p>
          </div>
        </div>
        <div className="ag-card">
          <div className="ag-card__body">
            {activity.length === 0 ? (
              <p className="ag-note">No contact yet. Introduce yourself and confirm the need — the script is in the design.</p>
            ) : (
              <ol className="ag-timeline">
                {activity.map((a) => (
                  <li className={`ag-tl ${TIMELINE_CLASS[a.kind] ?? "ag-tl--note"}`} key={a.id}>
                    <span className="ag-tl__dot" />
                    <p className="ag-tl__when">
                      {manilaDay(a.at)} · {manilaTime(a.at)}
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
        <h2 className="ag-h2">Move them forward</h2>
        <p className="ag-sub">One tap records the change with your name and the time — the office sees the same stage.</p>
        <div className="ag-choice-row">
          <button className="ag-choice" type="button" disabled title="Waits on the crm-families write contract">
            Send to the office for a quote
            <small>Presentation done → quote</small>
          </button>
          <button className="ag-choice" type="button" disabled title="Waits on the crm-families write contract">
            Ready to file
            <small>Application + documents</small>
          </button>
          <button className="ag-choice" type="button" disabled title="Waits on the crm-families write contract">
            Not now
            <small>Keep the record, stop the nudges</small>
          </button>
        </div>
        <p className="ag-note">
          The stage write waits on the crm-families contract — this is the designed final shape, not a
          working button yet. Stage history will be kept: the office will see when a person moved and why.
        </p>
      </section>
    </div>
  );
}
