"use client";

/**
 * Plan-rates editor — the working /staff/plans screen (phase 3 of the
 * admin-commerce plan). It edits the two published payment-mode tables (regular
 * + senior citizen) for all five tiers × four terms and saves them through
 * POST /api/pricing, which validates and persists into the same fixture store
 * every public plan surface reads (/plans, /plans/villa-memorial-plan,
 * /plans/senior-benefits, /plans/[sku], the home board, /agent/lots).
 *
 * The rules the save must pass live in lib/pricing-model.ts (`checkPlanPricing`):
 * every payment mode present exactly once, whole-peso amounts, and the schedule's
 * ratio — annual = semi-annual × 2 = quarterly × 4 = monthly × 12 — plus senior
 * figures that never exceed the regular cell. The same function runs live here
 * (so a bad edit is explained before Save is even pressed) and on the server (the
 * authority). The preview below is the public PlanPaymentTable itself, so what
 * staff see before saving is exactly what the public pages will print.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import {
  checkPlanPricing,
  PLAN_TERM_DEFS,
  type PlanPricing,
  type PlanTier,
  type PricingQuestion,
} from "@/lib/pricing-model";
import { PLAN_TIERS } from "@/lib/villa-pricing";

type TableId = "regular" | "senior";

/** The plan slice of the saved pricing document (what POST /api/pricing returns). */
type SavedPlanPricing = {
  plans: PlanPricing;
  updated_at: string | null;
  updated_by: string | null;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function formatStamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function messageFrom(payload: unknown): string | null {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error: unknown }).error;
    if (typeof error === "string" && error.trim().length > 0) return error;
  }
  return null;
}

export function PlanRatesEditor({
  initialPlans,
  initialUpdatedAt,
  initialUpdatedBy,
  questions,
  live = false,
}: {
  initialPlans: PlanPricing;
  initialUpdatedAt: string | null;
  initialUpdatedBy: string | null;
  questions: PricingQuestion[];
  /** True when COMMERCE_BASE_URL is set: writes are refused (no pricing contract). */
  live?: boolean;
}) {
  const [plans, setPlans] = useState<PlanPricing>(() => clone(initialPlans));
  // The comparison baseline follows successful saves/discards: after Save the
  // screen is clean ("Unsaved changes" off), and Discard returns to the LAST
  // SAVED document rather than the one this page was opened with.
  const [baseline, setBaseline] = useState<PlanPricing>(() => clone(initialPlans));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);
  const [stamp, setStamp] = useState({ at: initialUpdatedAt, by: initialUpdatedBy });

  const problem = useMemo(() => checkPlanPricing(plans), [plans]);
  const dirty = useMemo(
    () => JSON.stringify(plans) !== JSON.stringify(baseline),
    [plans, baseline],
  );

  function setAmount(table: TableId, mode: string, tier: PlanTier, raw: string) {
    const value = raw.trim() === "" ? Number.NaN : Number(raw);
    setPlans((prev) => ({
      ...prev,
      [table]: prev[table].map((row) => (row.mode === mode ? { ...row, [tier]: value } : row)),
    }));
    setNotice((prev) => (prev?.tone === "success" ? null : prev));
  }

  function discard() {
    setPlans(clone(baseline));
    setNotice(null);
  }

  async function save() {
    const live = checkPlanPricing(plans);
    if (live) {
      setNotice({ tone: "danger", msg: live });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ section: "plans", plans }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice({
          tone: "danger",
          msg: messageFrom(payload) ?? "The save was refused — nothing changed.",
        });
        return;
      }
      const saved = (payload as { pricing: SavedPlanPricing }).pricing;
      setPlans(clone(saved.plans));
      setBaseline(clone(saved.plans));
      setStamp({ at: saved.updated_at, by: saved.updated_by });
      setNotice({
        tone: "success",
        msg: `Saved. The public plan pages now print these figures${
          saved.updated_by ? ` (${saved.updated_by})` : ""
        }.`,
      });
    } catch {
      setNotice({ tone: "danger", msg: "The pricing store could not be reached — nothing changed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-4 pricing-editor">
      <Alert tone="info" title="These figures publish directly">
        The client&rsquo;s 2026 payment-mode sheets, kept in the pricing store. Saving
        republishes every surface that prints a plan rate: /plans,
        /plans/villa-memorial-plan, /plans/senior-benefits, each package page and the home
        board. In live mode this screen refuses instead of pretending a pricing write API
        exists (none has frozen yet) — the figures stay as recorded.
      </Alert>

      {live ? (
        <Alert tone="warning" title="Live mode — saving is not wired">
          COMMERCE_BASE_URL is set, but no catalog-pricing write contract has frozen. The
          published figures still render here and on the public pages; pressing Save is
          refused with 503 rather than inventing an endpoint. This is the contract ask
          recorded in the PR.
        </Alert>
      ) : null}

      {questions.map((q) => (
        <Alert key={q.id} tone="warning" title={`Open client question — ${q.title}`}>
          {q.detail}{" "}
          <span className="text-sm text-muted">Recorded from: {q.source}.</span>
        </Alert>
      ))}

      <div className="pricing-editor__bar">
        <div className="pricing-editor__state">
          {problem ? (
            <Badge tone="danger">Fix before saving</Badge>
          ) : (
            <Badge tone="success">Schedule agrees</Badge>
          )}
          {dirty ? <Badge tone="warning">Unsaved changes</Badge> : null}
          {stamp.at ? (
            <span className="text-sm text-muted">
              Last saved {formatStamp(stamp.at)}
              {stamp.by ? ` by ${stamp.by}` : ""}
            </span>
          ) : (
            <span className="text-sm text-muted">Recorded seed — not yet edited.</span>
          )}
        </div>
        <div className="pricing-editor__actions">
          <Link href="/plans" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live page
          </Link>
          <Button variant="secondary" size="sm" onClick={discard} disabled={busy || !dirty}>
            Discard changes
          </Button>
          <Button onClick={save} disabled={busy || problem !== null}>
            {busy ? "Saving…" : "Save plan rates"}
          </Button>
        </div>
      </div>

      {notice ? <Alert tone={notice.tone}>{notice.msg}</Alert> : null}
      {problem ? <Alert tone="danger" title="This cannot be saved yet">{problem}</Alert> : null}

      {(["regular", "senior"] as const).map((table) => {
        const label = table === "regular" ? "Regular rate (ages 1–60)" : "Senior citizen rate (61–100)";
        return (
          <section className="card" key={table} aria-labelledby={`plan-rates-${table}`}>
            <div className="card__body stack">
              <h2 id={`plan-rates-${table}`}>{label}</h2>
              <p className="text-sm text-muted">
                Amounts in pesos. Annual × 1 = Semi-Annual × 2 = Quarterly × 4 = Monthly × 12 —
                the save refuses a table that breaks the schedule.
              </p>
              <div className="table-wrapper" tabIndex={0}>
                <table className="table pricing-editor__table">
                  <caption className="visually-hidden">{label} — five tiers, four payment modes</caption>
                  <thead>
                    <tr>
                      <th scope="col">Payment mode</th>
                      {PLAN_TIERS.map((tier) => (
                        <th scope="col" key={tier.id}>
                          {tier.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plans[table].map((row) => (
                      <tr key={row.mode}>
                        <th scope="row">{row.mode}</th>
                        {PLAN_TIERS.map((tier) => (
                          <td key={tier.id}>
                            <input
                              className="input pricing-editor__num"
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              aria-label={`${label} · ${row.mode} · ${tier.name} (pesos)`}
                              value={Number.isFinite(row[tier.id]) ? row[tier.id] : ""}
                              onChange={(e) => setAmount(table, row.mode, tier.id, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pricing-editor__checklist">
                {PLAN_TERM_DEFS.filter((t) => t.paymentsPerYear > 1).map((t) => (
                  <span key={t.id} className="text-sm text-muted">
                    {t.label} × {t.paymentsPerYear} = Annual
                  </span>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="card" aria-labelledby="plan-rates-preview">
        <div className="card__body stack">
          <h2 id="plan-rates-preview">Preview — exactly what the public pages print</h2>
          <p className="text-sm text-muted">
            Rendered live by the same components the public pages mount, using the unsaved
            figures above. Nothing is published until you press Save.
          </p>
          <PlanPaymentTable rows={plans.regular} label="Villa Memorial Plan — regular (preview)" />
          <PlanPaymentTable
            rows={plans.senior}
            senior
            label="Villa Memorial Plan — senior citizen (preview)"
          />
        </div>
      </section>
    </div>
  );
}

export default PlanRatesEditor;
