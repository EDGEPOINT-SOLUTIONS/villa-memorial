/**
 * Villa's Funeral Service Contract as it prints — the paper form, filled from the case
 * intake and the working draft of the services/deals table + deductions block.
 *
 * This is a CAPTURE SCREEN's paper preview, not a filed document: it composes the same
 * caller content the documents ⓡ `agreement` template renders (KEB-D4-02 variables) so
 * the counter sees exactly what the paper would show, but filing still happens through
 * Generate (which needs the documents service). No row is created here, no receipt
 * number is issued, and no figure is computed: money cells show the linked order's
 * server-priced figures when one is linked, and an em dash with an honest note
 * otherwise. The clause wording comes from `villa-terms.ts`, versioned by effective
 * date, never from this file.
 */
import type { Case } from "@/lib/api-client/operations";
import type { OrderResponse } from "@/lib/api-client/commerce";
import type { TermsRevision } from "@/lib/contracts/villa-terms";
import { formatMinorUnits } from "@/lib/money";
import {
  addDays,
  PAYMENT_TERM_DAYS,
} from "@/lib/contracts/service-contract";
import {
  appliedRows,
  CIVIL_STATUS_LETTER,
  GENDER_LETTER,
  type ServiceContractDraft,
} from "@/lib/contracts/service-contract-capture";

function displayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function ServiceContractPaper({
  kase,
  intake,
  order,
  draft,
  terms,
}: {
  kase: Pick<Case, "case_number" | "deceased_name">;
  intake: Case["intake"];
  order: OrderResponse | null;
  draft: ServiceContractDraft;
  terms: TermsRevision | null;
}) {
  const contractDate = displayDate(intake?.contract_date) || displayDate(new Date().toISOString());
  const dueDate = addDays(contractDate, PAYMENT_TERM_DAYS);
  // The frozen intake shape carries senior-citizen as a plain boolean, so a stored
  // false is the service default rather than an answer nobody can distinguish from
  // one. Only a claimed "Yes" ticks a box here; anything else prints unticked, which
  // is also what Generate files (omit-when-false).
  const seniorClaimed = intake?.senior_citizen === true;

  const rows = appliedRows(draft);
  const noServices = rows.length === 0;

  const ded = draft.deductions;
  const deductionsLines: string[] = [];
  if (ded.lgu.coffin || ded.lgu.embalming || ded.lgu.others) {
    const parts: string[] = [];
    if (ded.lgu.coffin) parts.push("coffin");
    if (ded.lgu.embalming) parts.push(`embalming (${ded.lgu.embalming_days.trim() || "___"} days)`);
    if (ded.lgu.others) parts.push(`Others: ${ded.lgu.others_detail.trim() || "___"}`);
    deductionsLines.push(`LGU guarantee — ${parts.join(", ")}`);
  }
  if (ded.dswd_senior) deductionsLines.push("DSWD / Senior Citizen");
  if (ded.sss_id.trim()) deductionsLines.push(`SSS (ID# ${ded.sss_id.trim()})`);
  if (ded.gsis_id.trim()) deductionsLines.push(`GSIS (ID# ${ded.gsis_id.trim()})`);
  if (ded.plan_number.trim()) deductionsLines.push(`Life Plan / Insurance (Plan # ${ded.plan_number.trim()})`);

  const orderTotal = order ? formatMinorUnits(order.total_cents, order.currency) : null;

  return (
    <div className="paper-artifact">
      <div className="paper-artifact__doc">
        <p className="paper-artifact__ref">
          <strong>SERVICE CONTRACT No.:</strong> {kase.case_number}
          <span className="paper-artifact__ref-date">
            <strong>Date:</strong> {contractDate}
          </span>
        </p>

        <h1 className="paper-artifact__title">SERVICE CONTRACT</h1>

        {/* Particulars — the paper's header block */}
        <table className="paper-artifact__table">
          <tbody>
            <tr>
              <th scope="row" colSpan={2}>Name of Deceased</th>
              <td colSpan={2}>{kase.deceased_name === "Pending intake" ? "" : kase.deceased_name}</td>
              <td colSpan={2} className="paper-artifact__ticks">
                Gender:&nbsp;
                {(["male", "female"] as const).map((g) => (
                  <span key={g} className={intake?.deceased_gender === g ? "paper-artifact__tick paper-artifact__tick--on" : "paper-artifact__tick"}>
                    {intake?.deceased_gender === g ? "☒" : "☐"} {GENDER_LETTER[g]}
                  </span>
                ))}
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>Date of Death</th>
              <td colSpan={2}>{displayDate(intake?.date_of_death)}</td>
              <td colSpan={2} className="paper-artifact__ticks">
                Civil Status:&nbsp;
                {(["single", "married", "other"] as const).map((s) => (
                  <span key={s} className={intake?.deceased_civil_status === s ? "paper-artifact__tick paper-artifact__tick--on" : "paper-artifact__tick"}>
                    {intake?.deceased_civil_status === s ? "☒" : "☐"} {CIVIL_STATUS_LETTER[s]}
                  </span>
                ))}
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>Date of Birth</th>
              <td colSpan={2}>{displayDate(intake?.deceased_date_of_birth)}</td>
              <td colSpan={2} className="paper-artifact__ticks">
                Senior Citizen?&nbsp;
                <span className={seniorClaimed ? "paper-artifact__tick paper-artifact__tick--on" : "paper-artifact__tick"}>
                  {seniorClaimed ? "☒" : "☐"} Yes
                </span>
                <span className="paper-artifact__tick">
                  ☐ No
                </span>
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>Name of Client</th>
              <td colSpan={2}>{intake?.client_name ?? ""}</td>
              <td colSpan={2} className="paper-artifact__ticks">
                Gender:&nbsp;
                {(["male", "female"] as const).map((g) => (
                  <span key={g} className={intake?.client_gender === g ? "paper-artifact__tick paper-artifact__tick--on" : "paper-artifact__tick"}>
                    {intake?.client_gender === g ? "☒" : "☐"} {GENDER_LETTER[g]}
                  </span>
                ))}
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>Address</th>
              <td colSpan={4}>{intake?.client_address ?? ""}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>Telephone Numbers</th>
              <td colSpan={2}>{intake?.client_contact ?? ""}</td>
              <th scope="row">Facebook:</th>
              <td>{intake?.client_facebook ?? ""}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>Relationship to Deceased</th>
              <td colSpan={2}>{intake?.client_relationship ?? ""}</td>
              <th scope="row">Email:</th>
              <td>{intake?.client_email ?? ""}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>ID Presented</th>
              <td colSpan={2}>{intake?.client_id_presented ?? ""}</td>
              <th scope="row">ID#:</th>
              <td>{intake?.client_id_number ?? ""}</td>
            </tr>
          </tbody>
        </table>

        {/* Services rendered vs packaged deals */}
        <table className="paper-artifact__table">
          <thead>
            <tr>
              <th colSpan={2} className="paper-artifact__colhead">Services Rendered</th>
              <th className="paper-artifact__colhead">Amount</th>
              <th colSpan={2} className="paper-artifact__colhead">Packaged Deals</th>
              <th className="paper-artifact__colhead">Amount</th>
            </tr>
          </thead>
          <tbody>
            {noServices ? (
              <tr>
                <td colSpan={6} className="paper-artifact__muted">
                  No rows selected on this working draft yet.
                </td>
              </tr>
            ) : (
              rows.map(({ row, label }, i) => (
                <tr key={`${row.side}-${i}`}>
                  {row.side === "service" ? (
                    <>
                      <td colSpan={2}>{label}</td>
                      <td className="paper-artifact__amount">—</td>
                      <td colSpan={2} />
                      <td className="paper-artifact__amount">—</td>
                    </>
                  ) : (
                    <>
                      <td colSpan={2} />
                      <td className="paper-artifact__amount">—</td>
                      <td colSpan={2}>{label}</td>
                      <td className="paper-artifact__amount">—</td>
                    </>
                  )}
                </tr>
              ))
            )}
            <tr>
              <th scope="row" colSpan={4} className="paper-artifact__total">
                TOTAL COST OF SERVICES RENDERED
              </th>
              <td colSpan={2} className="paper-artifact__amount paper-artifact__amount--total">
                {orderTotal ?? "—"}
              </td>
            </tr>
          </tbody>
        </table>
        {order ? (
          <p className="paper-artifact__note">
            Amounts shown are the linked order {order.number}&rsquo;s server-priced total.
          </p>
        ) : (
          <p className="paper-artifact__note">
            Amounts print when the services are priced on a linked order; this screen never
            computes a figure.
          </p>
        )}

        {/* Deductions */}
        <p className="paper-artifact__heading">
          Less: LIFE PLANS / INSURANCES / BURIAL ASSISTANCE / GUARANTEES:
        </p>
        {deductionsLines.length === 0 ? (
          <p className="paper-artifact__muted">None recorded on this working draft.</p>
        ) : (
          <ul className="paper-artifact__deductions">
            {deductionsLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <table className="paper-artifact__table">
          <tbody>
            <tr>
              <th scope="row" colSpan={4}>GRAND TOTAL AFTER DEDUCTIONS:</th>
              <td colSpan={2} className="paper-artifact__amount">—</td>
            </tr>
            <tr>
              <th scope="row" colSpan={4}>DOWNPAYMENT:</th>
              <td colSpan={2} className="paper-artifact__amount">—</td>
            </tr>
            <tr>
              <th scope="row" colSpan={4}>BALANCE &amp; DUE DATE ({dueDate}):</th>
              <td colSpan={2} className="paper-artifact__amount">—</td>
            </tr>
          </tbody>
        </table>
        <p className="paper-artifact__note">
          Deduction amounts, the grand total and the balance belong to the guarantee
          sub-ledger and finance (dev-owned); the due date shown is the paper&rsquo;s nine
          (9) day rule from the contract date.
        </p>

        {/* Terms — versioned wording */}
        {terms ? (
          <>
            <h2 className="paper-artifact__heading">KNOW ALL MEN BY THESE PRESENTS:</h2>
            <p className="paper-artifact__body">
              This Service Contract is made and entered into on the date written above
              between {terms.partyFirst} and the CLIENT
              {intake?.co_maker_name ? `, together with Co-Maker ${intake.co_maker_name}` : ""},
              jointly and solidarily liable, under the terms below.
            </p>
            <ol className="paper-artifact__clauses">
              {terms.clauses.map((clause) => (
                <li key={clause}>{clause}</li>
              ))}
            </ol>
            <p className="paper-artifact__body">
              The parties hereby indicate by their signatures below that they have read and
              agree with the terms and conditions of this contract in its entirety.
            </p>
            <div className="paper-artifact__signatures">
              <div>
                <p className="paper-artifact__signline">{intake?.client_name ?? ""}</p>
                <p className="paper-artifact__signrole">CLIENT (Sign over Printed Name)</p>
              </div>
              <div>
                <p className="paper-artifact__signline">{intake?.co_maker_name ?? ""}</p>
                <p className="paper-artifact__signrole">Co-Maker (Sign over Printed Name)</p>
              </div>
              <div>
                <p className="paper-artifact__signline">Armando A. Villa</p>
                <p className="paper-artifact__signrole">Funeraria Villa</p>
              </div>
            </div>
            <p className="paper-artifact__notarial">{terms.notarialNote}</p>
          </>
        ) : (
          <p className="paper-artifact__muted">
            The terms revision for this contract date could not be resolved; the printed
            terms are unavailable until it is.
          </p>
        )}
      </div>
    </div>
  );
}
