import Link from "next/link";
import { Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import {
  getFamilyLotRecord,
  getFamilySnapshot,
  listFamilyAppointments,
  listFamilyRequests,
  type FamilyAppointment,
  type FamilyLotRecord,
  type FamilyRequest,
} from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  countWord,
  familyAppointmentState,
  familyHousehold,
  monogram,
  paidPercent,
  percentWords,
} from "@/lib/family/family-view";
import { familyPaperPopupItems } from "@/lib/family/family-documents";
import {
  familyAttention,
  familyInstalmentRows,
} from "@/lib/family/family-dashboard";
import { familyPlotLink } from "@/lib/family/family-plots";
import {
  longDueDate,
  nextPaymentDue,
  paymentAmountLabel,
  paymentDueCountdown,
  type PaymentDueState,
} from "@/lib/payment-schedule";
import { readFamilyImage, familyImageUrl } from "@/lib/family-image-store";
import { Answer, Chain, PrimaryAction, QuietLink, WhatThisShows } from "@/components/family/family-ui";
import { PortalProgress } from "@/components/portal/portal-ui";
import { AttentionStrip, DashFacts, DashKpi, DashPanel } from "@/components/family/dash-ui";
import { PapersTable } from "@/components/family/papers-table";
import { FamilyImageUploader } from "@/components/family/family-image-uploader";
import { Avatar } from "@/components/portal/avatar";
import { StatusChip, type StatusTone } from "@/components/kit/status-chip";

export const metadata = { title: "Home — Villa Funeraria" };

/** “Wednesday 1 October” — the day the reader is looking at this page. */
function today(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

/** The status-chip tone for a derived instalment state. */
const INSTALMENT_TONE: Record<PaymentDueState, StatusTone> = {
  paid: "success",
  overdue: "danger",
  due_soon: "warning",
  upcoming: "neutral",
};

/**
 * The office's workspace records, tolerated: a failure here (a provisional
 * fixture drifting) must never blank the dashboard — the money and papers the
 * snapshot holds still render, and the panels that need these records show
 * their honest empty state.
 */
async function loadWorkspace(): Promise<
  [FamilyRequest[], FamilyAppointment[], FamilyLotRecord | null]
> {
  try {
    return await Promise.all([
      listFamilyRequests(),
      listFamilyAppointments(),
      getFamilyLotRecord(),
    ]);
  } catch {
    return [[], [], null];
  }
}

/**
 * Home — the family command centre (the captain's 2026-09-30 rebuild).
 *
 * ONE SCREEN, EVERY ANSWER. The whole point of the rework: the funeral, the
 * schedule, the money, the papers, the lot, the memorial and the office are
 * summarised here from the family's own recorded data, each panel carrying its
 * honest state — a panel whose service is not wired says so in place, in one
 * neutral chip, instead of hiding behind a page-level disclosure. Nothing is
 * invented: an amount, a date, a plot code or a published memorial appears only
 * when the record carries it.
 *
 * The layout is the plan's: a compact header, an attention strip (the ONLY
 * things that need the family now), a six-tile KPI row, then a 12-column grid of
 * small panels. The type is the dense scope (`.dash`) and the colour is carried
 * by thin rules, an uppercase role label and a low-alpha head-strip wash — never
 * a whole painted panel.
 *
 * The old calm hero's ONE dominant answer gave way to the captain's newer
 * instruction (2026-09-30): information density, compact but readable type, and
 * every part earning its space, with the family reading scale still one tap away
 * in “Bigger writing”.
 */
export default async function ClientDashboardPage() {
  const session = await requirePortalSessionOrRedirect("family");

  let snapshot;
  try {
    snapshot = await getFamilySnapshot();
  } catch {
    return (
      <>
        <Answer
          kicker="Home"
          headline="We cannot open your family’s summary just now."
          sub="Nothing is wrong with your plan. Try again, or call us."
          actions={
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<Phone size={20} aria-hidden="true" />}
            />
          }
        />
      </>
    );
  }

  const [requests, appointments, lot] = await loadWorkspace();

  const now = new Date();
  const { family, loved_one, plan_summary, balance, balance_cents } = snapshot;
  const household = familyHousehold(loved_one?.name, family?.display_name);
  const accountName = family?.display_name?.trim() || "your account";

  const hasBalance = (balance_cents?.remaining ?? 0) > 0;
  const percent =
    balance_cents && balance_cents.total > 0
      ? paidPercent(balance_cents.total, balance_cents.paid)
      : null;
  const schedule = snapshot.payment_schedule;
  const nextDue = schedule ? nextPaymentDue(schedule) : null;
  const instalments = familyInstalmentRows(schedule, now);
  const attention = familyAttention(snapshot, requests, appointments, now);
  const papers = familyPaperPopupItems(snapshot.recent_documents);
  const openRequests = requests.filter((request) => request.state !== "done");
  const waitingRequests = requests.filter((request) => request.state === "waiting_on_you");
  const paperTypes = [...new Set(papers.map((paper) => paper.typeLabel))].join(" · ");

  // The private Remembering portrait (the guarded family store); absent is the
  // monogram plate, the shipped state.
  let portraitSrc: string | null = null;
  try {
    const stored = await readFamilyImage(session.userId, "portrait");
    if (stored) portraitSrc = familyImageUrl("portrait", stored.updated_at);
  } catch {
    portraitSrc = null;
  }

  const plot = familyPlotLink(lot?.plot_code);
  const needsCount = attention.length;

  return (
    <div className="dash">
      <Answer
        kicker={`${today()} · ${household}`}
        headline={
          needsCount === 0
            ? "Nothing needs you today."
            : `${countWord(needsCount)} ${needsCount === 1 ? "thing needs" : "things need"} you today.`
        }
        sub={
          hasBalance
            ? `${balance.remaining} still to pay${nextDue ? ` · next due ${longDueDate(nextDue.due_on)}` : ""}.`
            : "Your plan is paid in full."
        }
        actions={
          <>
            <PrimaryAction
              href={hasBalance ? "/client/payments" : "/client/documents"}
              label={hasBalance ? "See how to pay" : "See your papers"}
            />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <AttentionStrip items={attention} />

      <section className="dash-kpis" aria-label="Your family at a glance">
        {hasBalance ? (
          <DashKpi
            label="Still to pay"
            value={balance.remaining}
            sub={`of ${balance.total}`}
            href="/client/payments"
            tone="warning"
          />
        ) : null}
        {nextDue ? (
          <DashKpi
            label="Next due"
            value={paymentAmountLabel(nextDue.due_cents)}
            sub={`${longDueDate(nextDue.due_on)} · ${paymentDueCountdown(nextDue.days_until_due)}`}
            href="/client/payments"
            tone={INSTALMENT_TONE[nextDue.state]}
          />
        ) : null}
        <DashKpi
          label="Paid"
          value={balance.paid}
          sub={percent !== null ? `${percentWords(percent)} · ${percent}%` : `of ${balance.total}`}
          href="/client/plans"
          tone="success"
        />
        <DashKpi
          label="Plan"
          value={plan_summary.plan_name}
          sub={`${plan_summary.status} · ${plan_summary.term}`}
          href="/client/plans"
        />
        <DashKpi
          label="Papers"
          value={countWord(papers.length)}
          sub={paperTypes || "Nothing issued yet"}
          href="/client/documents"
        />
        <DashKpi
          label="Requests"
          value={countWord(openRequests.length)}
          sub={
            waitingRequests.length > 0
              ? `${countWord(waitingRequests.length)} waiting on you`
              : "All with the office"
          }
          href="/client/requests"
          tone={waitingRequests.length > 0 ? "warning" : "neutral"}
        />
      </section>

      <div className="dash-grid">
        <DashPanel
          role="arrangement"
          className="dash-span-8"
          label="The arrangement"
          title="The funeral"
          count="Not connected yet"
          more={{ href: "/client/cases", label: "Open →" }}
        >
          <Chain />
          <p className="dash-state">
            The funeral times aren’t connected to this page yet. Call{" "}
            <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a> and we’ll tell you.
          </p>
        </DashPanel>

        <DashPanel
          role="arrangement"
          className="dash-span-4"
          label="Visits"
          title="Your visits"
          count={appointments.length > 0 ? countWord(appointments.length) : undefined}
          more={{ href: "/client/appointments", label: "Open →" }}
        >
          {appointments.length > 0 ? (
            <table className="table dash-table">
              <caption className="visually-hidden">Your visits</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Visit</th>
                </tr>
              </thead>
              <tbody>
                {appointments.slice(0, 3).map((appointment) => (
                  <tr key={appointment.id}>
                    <th scope="row">
                      {appointment.day_label}
                      <span className="dash-table__sub">{appointment.time_label}</span>
                    </th>
                    <td data-label="Visit">
                      {appointment.title}
                      <span className="dash-table__sub">{appointment.where}</span>
                      <span className="dash-table__state">
                        <StatusChip
                          tone={
                            appointment.state === "confirmed"
                              ? "success"
                              : appointment.state === "waiting"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {familyAppointmentState(appointment.state)}
                        </StatusChip>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="dash-empty">No visits are arranged just now.</p>
          )}
        </DashPanel>

        <DashPanel
          role="money"
          className="dash-span-7"
          id="money"
          label="Money"
          title="Money and your plan"
          count={percent !== null ? `${percentWords(percent)} paid` : undefined}
          more={{ href: "/client/payments", label: "Open →" }}
        >
          <div className="dash-money">
            <PortalProgress
              left={<strong>{balance.paid} paid</strong>}
              right={`${balance.total} in all`}
              percent={percent ?? 0}
              ariaLabel={
                percent !== null
                  ? `${balance.paid} of ${balance.total} paid — ${percentWords(percent)}`
                  : `Paid ${balance.paid} of ${balance.total}`
              }
            />
          </div>
          {instalments.length > 0 ? (
            <table className="table dash-table">
              <caption className="visually-hidden">Your plan instalments</caption>
              <thead>
                <tr>
                  <th scope="col">Due</th>
                  <th scope="col" className="table__numeric">
                    Amount
                  </th>
                  <th scope="col">State</th>
                  <th scope="col">
                    <span className="visually-hidden">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {instalments.slice(0, 6).map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.dueLabel}</th>
                    <td className="table__numeric" data-label="Amount">{row.amount}</td>
                    <td data-label="State">
                      <StatusChip tone={INSTALMENT_TONE[row.stateKey]}>{row.state}</StatusChip>
                    </td>
                    <td className="dash-table__action" data-label="Action">
                      {row.paid ? (
                        <span className="dash-muted">Paid</span>
                      ) : (
                        <Link className="btn btn--secondary btn--sm" href="/client/payments">
                          Pay
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="dash-empty">No instalment schedule is recorded yet.</p>
          )}
        </DashPanel>

        <DashPanel
          role="place"
          className="dash-span-5"
          label="Papers"
          title="Your papers"
          count={countWord(papers.length)}
          more={{ href: "/client/documents", label: "Open →" }}
        >
          <PapersTable items={papers} />
        </DashPanel>

        <DashPanel
          role="place"
          className="dash-span-4"
          label="Place"
          title="My plots"
          count={`${countWord(1)} plot`}
          more={{ href: "/client/property", label: "Open →" }}
        >
          <table className="table dash-table">
            <caption className="visually-hidden">Your plots</caption>
            <thead>
              <tr>
                <th scope="col">Plot</th>
                <th scope="col">Held in the name of</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  {lot?.lot_number ?? "—"}
                  <span className="dash-table__sub">Section {lot?.section ?? "—"}</span>
                </th>
                <td data-label="Held in the name of">{lot?.owner_name ?? accountName}</td>
                <td data-label="State">
                  <StatusChip tone={plot.state === "linked" ? "success" : "neutral"}>
                    {plot.state === "linked" ? "Recorded" : "Not connected yet"}
                  </StatusChip>
                </td>
              </tr>
            </tbody>
          </table>
          <Link
            className="btn btn--secondary btn--sm dash-panel__open"
            href={plot.href}
          >
            {plot.label}
          </Link>
          <p className="dash-note">
            {plot.state === "linked"
              ? "Opens the 3D park framed on this plot."
              : "Ask us and we will point out your plot on the map."}
          </p>
        </DashPanel>

        <DashPanel
          role="place"
          className="dash-span-4"
          label="Remembering"
          title="Remembering"
          count="Nothing published"
        >
          <div className="dash-remember">
            <Avatar src={portraitSrc} initials={monogram(loved_one?.name)} size={72} />
            <div className="dash-remember__body">
              <p className="dash-remember__name">{loved_one?.name ?? "—"}</p>
              <p className="dash-remember__dates">{loved_one?.life_dates ?? ""}</p>
              <StatusChip tone="neutral">Nothing published</StatusChip>
            </div>
          </div>
          <p className="dash-note">Private to your family until you choose to publish it.</p>
          <FamilyImageUploader
            slot="portrait"
            hasImage={Boolean(portraitSrc)}
            label={portraitSrc ? "Change the portrait" : "Attach a portrait"}
            hint="Only your family sees this picture."
          />
          <Link className="dash-panel__link" href="/client/memorials">
            Open Remembering →
          </Link>
        </DashPanel>

        <DashPanel role="neutral" className="dash-span-4" label="Help" title="Help and your family">
          <DashFacts
            facts={[
              { label: "Signed in as", value: accountName },
              {
                label: "Office",
                value: <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a>,
              },
              {
                label: "Second line",
                value: <a href={FAMILY_HELP.secondPhoneHref}>{FAMILY_HELP.secondPhone}</a>,
              },
              { label: "Open", value: FAMILY_HELP.hours },
              {
                label: "Plans and lots",
                value: <a href={FAMILY_HELP.agencyPhoneHref}>{FAMILY_HELP.agencyPhone}</a>,
              },
            ]}
          />
          <Link className="dash-panel__link" href="/client/support">
            Help and requests →
          </Link>
        </DashPanel>
      </div>

      <WhatThisShows>
        The funeral times, the memorial page and your full payment history aren’t connected yet. Call{" "}
        {FAMILY_HELP.phone} and we’ll tell you what is happening.
      </WhatThisShows>
    </div>
  );
}
