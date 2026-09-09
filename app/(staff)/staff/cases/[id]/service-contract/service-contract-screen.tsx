"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { buildServicePaper } from "@/lib/contracts/service-paper";
import { paperFileStem } from "@/lib/export/types";
import type { Case } from "@/lib/api-client/operations";
import type { OrderResponse } from "@/lib/api-client/commerce";
import type { TermsRevision } from "@/lib/contracts/villa-terms";
import {
  appliedRows,
  DEAL_ROWS,
  emptyDraftForCase,
  SERVICE_ROWS,
  type DaysSelection,
  type FreeTextSelection,
  type RowSelection,
  type ServiceContractDraft,
  type PaperRow,
  validateDraft,
} from "@/lib/contracts/service-contract-capture";
import { ServiceContractPaper } from "@/components/service-contract-paper";

function valueOf(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "—";
}

/**
 * The paper Funeral Service Contract as a capture screen.
 *
 * Edit view: the header (from the case intake) plus every row of the paper's
 * services-vs-deals table and the deductions block, as discrete inputs. Preview view:
 * the paper artifact, filled from the intake + the working draft, ready for the printer.
 *
 * Honesty rules this screen (FORMS_PLAN.md non-negotiables):
 * - The working draft lives only on this screen. No case-record shape holds the rows or
 *   the deductions yet, so nothing here is persisted — the screen says so, and saving
 *   the intake header happens on the case page through the intake form.
 * - No money: amounts come from the linked order (server-priced) and the deduction /
 *   balance math belongs to finance's sub-ledger. This screen never computes a figure.
 * - Filing a real contract happens through Generate on the case page (documents ⓡ).
 */
export function ServiceContractScreen({
  kase,
  order,
  terms,
  canWrite,
}: {
  kase: Case;
  order: OrderResponse | null;
  terms: TermsRevision | null;
  canWrite: boolean;
}) {
  const [draft, setDraft] = useState<ServiceContractDraft>(() => emptyDraftForCase(kase));
  const [preview, setPreview] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const intake = kase.intake;
  const errors = attempted ? validateDraft(draft) : null;
  const applied = appliedRows(draft);

  function patch(fn: (next: ServiceContractDraft) => void) {
    setDraft((current) => {
      const next = structuredClone(current);
      fn(next);
      return next;
    });
    setAttempted(false);
  }

  function toggleSide(bucket: "services" | "deals", key: string, checked: boolean) {
    patch((next) => {
      ((next[bucket] as unknown) as Record<string, RowSelection>)[key].applied = checked;
    });
  }

  function setBlank(bucket: "services" | "deals", key: string, field: "days" | "detail", value: string) {
    patch((next) => {
      ((next[bucket] as unknown) as Record<string, Record<string, unknown>>)[key][field] = value;
    });
  }

  function setDeduction<K extends keyof ServiceContractDraft["deductions"]>(
    key: K,
    value: ServiceContractDraft["deductions"][K],
  ) {
    patch((next) => {
      next.deductions[key] = value;
    });
  }

  function openPreview() {
    setAttempted(true);
    const check = validateDraft(draft);
    if (check.badDays.length === 0 && check.longDetails.length === 0) {
      setPreview(true);
    }
  }

  const signedOn = useMemo(
    () => intake?.contract_date ?? new Date().toISOString(),
    [intake],
  );
  // The export renders the SAME working draft through the shared paper grammar
  // (lib/contracts/service-paper.ts) that feeds the .docx/.pdf renderers.
  const paperDoc = useMemo(
    () => buildServicePaper({ kase, intake: intake ?? null, order, draft, terms, signedOn }),
    [kase, intake, order, draft, terms, signedOn],
  );
  const paperStem = useMemo(
    () => paperFileStem([`Service-Contract-${kase.case_number}`, kase.deceased_name === "Pending intake" ? undefined : kase.deceased_name]),
    [kase],
  );

  if (preview) {
    return (
      <div className="stack">
        <PaperExportActions blocks={paperDoc.blocks} filename={paperStem}>
          <Button type="button" size="sm" variant="secondary" onClick={() => setPreview(false)}>
            Back to editing
          </Button>
        </PaperExportActions>
        <ServiceContractPaper kase={kase} intake={intake} order={order} draft={draft} terms={terms} signedOn={signedOn} />
      </div>
    );
  }

  const ded = draft.deductions;

  return (
    <div className="stack">
      <Alert tone="info" title="What persists, and what does not">
        The header below is the case intake — saved through the intake form on the case
        page. The services table and the deductions block are a working draft on this
        screen only: no case-record shape holds them yet, so nothing here is written
        anywhere (FORMS_PLAN.md gaps 1 &amp; 5 — the draft shape freeze and the guarantee
        sub-ledger are dev-owned). Print the paper contract for the counter&rsquo;s working
        copy; filing through documents ⓡ happens with Generate once an order prices it.
      </Alert>
      <Alert tone="info" title="No money is computed here">
        Amount cells on the print show the linked order&rsquo;s server-priced total when an
        order is linked{order ? ` (${order.number})` : ""}; otherwise they print an em
        dash. Deduction and balance figures belong to finance&rsquo;s sub-ledger. This
        screen never adds, subtracts, numbers a receipt or posts anything.
      </Alert>

      <Card header={<h3>Header — from the case intake</h3>}>
        {intake ? (
          <div className="table-wrapper">
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Deceased</th>
                  <td>{kase.deceased_name === "Pending intake" ? "—" : kase.deceased_name}</td>
                </tr>
                <tr>
                  <th scope="row">Date of death / birth</th>
                  <td>
                    {valueOf(intake.date_of_death)} · {valueOf(intake.deceased_date_of_birth)}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Gender / civil status</th>
                  <td>
                    {intake.deceased_gender ?? "—"} · {intake.deceased_civil_status ?? "—"}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Senior citizen</th>
                  <td>
                    {intake.senior_citizen
                      ? "Yes"
                      : "—" /* claim-only: never assert a "No" nobody gave */}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Client</th>
                  <td>
                    {intake.client_name ?? "—"}
                    {intake.client_gender || intake.client_civil_status
                      ? ` (${[intake.client_gender, intake.client_civil_status].filter(Boolean).join(", ")})`
                      : ""}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Address</th>
                  <td>{intake.client_address ?? "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Contacts</th>
                  <td>
                    {[intake.client_contact, intake.client_facebook, intake.client_email]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Relationship / ID</th>
                  <td>
                    {intake.client_relationship ?? "—"} ·{" "}
                    {[intake.client_id_presented, intake.client_id_number].filter(Boolean).join(" — ") || "—"}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Co-maker</th>
                  <td>{intake.co_maker_name ?? "—"}</td>
                </tr>
                <tr>
                  <th scope="row">Contract date</th>
                  <td>{intake.contract_date ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Nothing captured yet — complete intake on the case page first; the printed
            contract would otherwise show em dashes for this whole block.
          </p>
        )}
      </Card>

      <Card header={<h3>Services rendered vs packaged deals</h3>}>
        <p className="text-sm text-muted">
          Tick the rows the paper covers and fill the paper&rsquo;s number/text blanks
          (Embalming days, Others). Amount cells stay empty on purpose — see the note
          above.
        </p>
        {!canWrite ? (
          <p className="text-sm text-muted">
            Editing needs <code>cases:write</code>.
          </p>
        ) : (
          <div className="contract-rows">
            <div className="contract-rows__col">
              <h4>Services rendered</h4>
              {SERVICE_ROWS.map((row) => (
                <ServiceRowEditor
                  key={row.key}
                  row={row}
                  state={draft.services[row.key]}
                  onToggle={(checked) => toggleSide("services", row.key, checked)}
                  onBlank={(field, value) => setBlank("services", row.key, field, value)}
                />
              ))}
            </div>
            <div className="contract-rows__col">
              <h4>Packaged deals</h4>
              {DEAL_ROWS.map((row) => (
                <ServiceRowEditor
                  key={row.key}
                  row={row}
                  state={draft.deals[row.key]}
                  onToggle={(checked) => toggleSide("deals", row.key, checked)}
                  onBlank={(field, value) => setBlank("deals", row.key, field, value)}
                />
              ))}
            </div>
          </div>
        )}
        {applied.length > 0 ? (
          <p className="text-sm text-muted">
            {applied.length} row{applied.length === 1 ? "" : "s"} selected — they print in
            paper order.
          </p>
        ) : null}
      </Card>

      <Card header={<h3>Less: life plans / insurances / burial assistance / guarantees</h3>}>
        <p className="text-sm text-muted">
          Record which guarantee instruments the family is submitting. Their amounts and
          the three-day instrument deadline belong to the dev-owned guarantee sub-ledger;
          this block only captures what the paper&rsquo;s boxes say.
        </p>
        {!canWrite ? (
          <p className="text-sm text-muted">
            Editing needs <code>cases:write</code>.
          </p>
        ) : (
          <div className="stack">
            <CheckboxLine
              label="LGU guarantee — coffin"
              checked={ded.lgu.coffin}
              onChange={(checked) => setDeduction("lgu", { ...ded.lgu, coffin: checked })}
            />
            <CheckboxLine
              label="LGU guarantee — embalming"
              checked={ded.lgu.embalming}
              onChange={(checked) => setDeduction("lgu", { ...ded.lgu, embalming: checked })}
            >
              {ded.lgu.embalming ? (
                <Field label="Days covered" htmlFor="lgu-embalming-days">
                  <input
                    id="lgu-embalming-days"
                    type="text"
                    inputMode="numeric"
                    value={ded.lgu.embalming_days}
                    onChange={(e) =>
                      setDeduction("lgu", { ...ded.lgu, embalming_days: e.target.value })
                    }
                  />
                </Field>
              ) : null}
            </CheckboxLine>
            <CheckboxLine
              label="LGU guarantee — Others"
              checked={ded.lgu.others}
              onChange={(checked) => setDeduction("lgu", { ...ded.lgu, others: checked })}
            >
              {ded.lgu.others ? (
                <Field label="What the guarantee covers" htmlFor="lgu-others-detail">
                  <input
                    id="lgu-others-detail"
                    value={ded.lgu.others_detail}
                    onChange={(e) =>
                      setDeduction("lgu", { ...ded.lgu, others_detail: e.target.value })
                    }
                  />
                </Field>
              ) : null}
            </CheckboxLine>
            <CheckboxLine
              label="DSWD / Senior Citizen"
              checked={ded.dswd_senior}
              onChange={(checked) => setDeduction("dswd_senior", checked)}
            />
            <div className="contract-rows">
              <div className="contract-rows__col">
                <Field label="SSS ID#" htmlFor="sss-id">
                  <input
                    id="sss-id"
                    value={ded.sss_id}
                    onChange={(e) => setDeduction("sss_id", e.target.value)}
                  />
                </Field>
              </div>
              <div className="contract-rows__col">
                <Field label="GSIS ID#" htmlFor="gsis-id">
                  <input
                    id="gsis-id"
                    value={ded.gsis_id}
                    onChange={(e) => setDeduction("gsis_id", e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <Field
              label="Life Plan / Insurance — Plan #"
              htmlFor="plan-number"
              hint="The paper prints this blank next to the family's plan or policy."
            >
              <input
                id="plan-number"
                value={ded.plan_number}
                onChange={(e) => setDeduction("plan_number", e.target.value)}
              />
            </Field>
          </div>
        )}
      </Card>

      {errors && (errors.badDays.length > 0 || errors.longDetails.length > 0) ? (
        <Alert tone="danger" title="Check the paper blanks">
          {errors.badDays.length > 0
            ? `${errors.badDays.join(" and ")} must be a whole number of days when filled. `
            : ""}
          {errors.longDetails.length > 0 ? errors.longDetails.join(" · ") : ""}
        </Alert>
      ) : null}

      <div className="btn-group">
        <Button type="button" size="sm" onClick={openPreview}>
          Preview paper contract
        </Button>
      </div>
    </div>
  );
}

function CheckboxLine({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="stack">
      <label className="check-row">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
      {checked ? children : null}
    </div>
  );
}

function ServiceRowEditor({
  row,
  state,
  onToggle,
  onBlank,
}: {
  row: PaperRow;
  state: RowSelection | FreeTextSelection | DaysSelection;
  onToggle: (checked: boolean) => void;
  onBlank: (field: "days" | "detail", value: string) => void;
}) {
  const detail = state as FreeTextSelection;
  const days = state as DaysSelection;
  return (
    <div className="service-row">
      <label className="check-row">
        <input type="checkbox" checked={state.applied} onChange={(e) => onToggle(e.target.checked)} />
        <span>{row.label}</span>
      </label>
      {state.applied && row.kind === "free_text" ? (
        <input
          type="text"
          className="service-row__blank"
          placeholder="what services — the paper's Others blank"
          value={detail.detail}
          onChange={(e) => onBlank("detail", e.target.value)}
        />
      ) : null}
      {state.applied && row.kind === "days" ? (
        <span className="service-row__days">
          <input
            type="text"
            inputMode="numeric"
            className="service-row__blank service-row__blank--days"
            value={days.days}
            onChange={(e) => onBlank("days", e.target.value)}
          />
          <span>days</span>
        </span>
      ) : null}
    </div>
  );
}
