"use client";

/**
 * Lot-prices editor — the working /staff/pricing screen (phase 3 of the
 * admin-commerce plan). It edits the four 2026 lot families (title, caption and
 * every product row: selling · annual · semi-annual · quarterly · monthly, for
 * the regular and senior-citizen tables) and saves them through
 * POST /api/pricing into the same fixture store the public price list reads
 * (/lots/price-list-2026, the package page's Official 2026 price list, the home
 * service cards and the agent lot list).
 *
 * The save rules live in lib/pricing-model.ts (`checkLotCategories`): unique
 * family titles and product names per family, whole-peso amounts, every term
 * present, senior figures never above the regular cell, and the sheet's six-year
 * amortization — annual × 6 must agree with the selling price within the
 * documented peso rounding. The same function runs live here and on the server
 * (the authority). The preview is the public PriceList2026Tables itself.
 *
 * The A-001 fixture-vs-sheet question below is deliberately NOT part of the
 * editable document: a save can never remove or resolve it.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceList2026Tables } from "@/components/villa/price-list-2026";
import {
  checkLotCategories,
  LOT_TERMS,
  type LotCategory,
  type LotPriceRow,
  type LotTerm,
  type PricingQuestion,
} from "@/lib/pricing-model";

type TableId = "regular" | "senior";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** The four installments (selling has its own column), in sheet order. */
const FIGURE_TERMS: ReadonlyArray<LotTerm> = LOT_TERMS;

const TERM_LABEL: Record<LotTerm, string> = {
  selling: "Selling",
  annual: "Annual",
  semi: "Semi-annual",
  quarter: "Quarterly",
  monthly: "Monthly",
};

/** The installments after the selling price, in the public tables' order. */
const INSTALLMENT_TERMS: ReadonlyArray<LotTerm> = ["annual", "semi", "quarter", "monthly"];

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

type SavedLotPricing = {
  lotCategories: LotCategory[];
  updated_at: string | null;
  updated_by: string | null;
};

export function LotPricesEditor({
  initialCategories,
  initialUpdatedAt,
  initialUpdatedBy,
  questions,
  live = false,
}: {
  initialCategories: LotCategory[];
  initialUpdatedAt: string | null;
  initialUpdatedBy: string | null;
  questions: PricingQuestion[];
  /** True when COMMERCE_BASE_URL is set: writes are refused (no pricing contract). */
  live?: boolean;
}) {
  const [categories, setCategories] = useState<LotCategory[]>(() => clone(initialCategories));
  // The comparison baseline follows successful saves/discards: after Save the
  // screen is clean ("Unsaved changes" off), and Discard returns to the LAST
  // SAVED document rather than the one this page was opened with.
  const [baseline, setBaseline] = useState<LotCategory[]>(() => clone(initialCategories));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);
  const [stamp, setStamp] = useState({ at: initialUpdatedAt, by: initialUpdatedBy });

  const problem = useMemo(() => checkLotCategories(categories), [categories]);
  const dirty = useMemo(
    () => JSON.stringify(categories) !== JSON.stringify(baseline),
    [categories, baseline],
  );

  function patchCategory(index: number, patch: Partial<LotCategory>) {
    setCategories((prev) =>
      prev.map((category, i) => (i === index ? { ...category, ...patch } : category)),
    );
    setNotice((prev) => (prev?.tone === "success" ? null : prev));
  }

  function patchRow(ci: number, ri: number, patch: Partial<LotPriceRow>) {
    setCategories((prev) =>
      prev.map((category, i) =>
        i === ci
          ? {
              ...category,
              rows: category.rows.map((row, j) => (j === ri ? { ...row, ...patch } : row)),
            }
          : category,
      ),
    );
    setNotice((prev) => (prev?.tone === "success" ? null : prev));
  }

  function patchFigure(ci: number, ri: number, table: TableId, term: LotTerm, raw: string) {
    const value = raw.trim() === "" ? Number.NaN : Number(raw);
    setCategories((prev) =>
      prev.map((category, i) =>
        i === ci
          ? {
              ...category,
              rows: category.rows.map((row, j) =>
                j === ri
                  ? { ...row, [table]: { ...row[table], [term]: value } }
                  : row,
              ),
            }
          : category,
      ),
    );
    setNotice((prev) => (prev?.tone === "success" ? null : prev));
  }

  function addRow(ci: number) {
    const blank = (): LotPriceRow => ({
      product: "",
      area: 0,
      regular: { selling: 0, annual: 0, semi: 0, quarter: 0, monthly: 0 },
      senior: { selling: 0, annual: 0, semi: 0, quarter: 0, monthly: 0 },
    });
    setCategories((prev) =>
      prev.map((category, i) =>
        i === ci ? { ...category, rows: [...category.rows, blank()] } : category,
      ),
    );
  }

  function removeRow(ci: number, ri: number) {
    setCategories((prev) =>
      prev.map((category, i) =>
        i === ci ? { ...category, rows: category.rows.filter((_, j) => j !== ri) } : category,
      ),
    );
  }

  function addCategory() {
    setCategories((prev) => [
      ...prev,
      {
        title: `Family ${prev.length + 1}`,
        caption: "",
        rows: [
          {
            product: "New product",
            area: 2.5,
            regular: { selling: 0, annual: 0, semi: 0, quarter: 0, monthly: 0 },
            senior: { selling: 0, annual: 0, semi: 0, quarter: 0, monthly: 0 },
          },
        ],
      },
    ]);
  }

  function removeCategory(ci: number) {
    setCategories((prev) => prev.filter((_, i) => i !== ci));
  }

  function discard() {
    setCategories(clone(baseline));
    setNotice(null);
  }

  async function save() {
    const live = checkLotCategories(categories);
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
        body: JSON.stringify({ section: "lots", lotCategories: categories }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice({
          tone: "danger",
          msg: messageFrom(payload) ?? "The save was refused — nothing changed.",
        });
        return;
      }
      const saved = (payload as { pricing: SavedLotPricing }).pricing;
      setCategories(clone(saved.lotCategories));
      setBaseline(clone(saved.lotCategories));
      setStamp({ at: saved.updated_at, by: saved.updated_by });
      setNotice({
        tone: "success",
        msg: `Saved. The 2026 price list pages and the home service cards now print these figures${
          saved.updated_by ? ` (${saved.updated_by})` : ""
        }.`,
      });
    } catch {
      setNotice({ tone: "danger", msg: "The pricing store could not be reached — nothing changed." });
    } finally {
      setBusy(false);
    }
  }

  function figureInput(
    ci: number,
    ri: number,
    table: TableId,
    term: LotTerm,
    rowLabel: string,
  ) {
    const amount = categories[ci].rows[ri][table][term];
    return (
      <td key={`${ci}-${ri}-${table}-${term}`}>
        <input
          className="input pricing-editor__num"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          aria-label={`${categories[ci].title || `Family ${ci + 1}`} · ${rowLabel || `Row ${ri + 1}`} · ${table === "regular" ? "Regular" : "Senior"} ${TERM_LABEL[term]} (pesos)`}
          value={Number.isFinite(amount) ? amount : ""}
          onChange={(e) => patchFigure(ci, ri, table, term, e.target.value)}
        />
      </td>
    );
  }

  return (
    <div className="stack-4 pricing-editor">
      <Alert tone="info" title="These figures publish directly">
        The client&rsquo;s PRICE LIST FOR 2026 (six-year amortization, regular + senior),
        kept in the pricing store. Saving republishes /lots/price-list-2026, the package
        page&rsquo;s Official 2026 price list, the home service cards&rsquo; “from …” lines and the
        agent lot list. Never type an amount the sheet does not print: if the sheet changes,
        transcribe the new sheet. In live mode this screen refuses instead of pretending a
        pricing write API exists (none has frozen yet).
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
            <Badge tone="success">Six-year schedules agree</Badge>
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
          <Link
            href="/lots/price-list-2026"
            target="_blank"
            rel="noreferrer"
            className="btn btn--secondary btn--sm"
          >
            View live page
          </Link>
          <Button variant="secondary" size="sm" onClick={discard} disabled={busy || !dirty}>
            Discard changes
          </Button>
          <Button onClick={save} disabled={busy || problem !== null}>
            {busy ? "Saving…" : "Save lot prices"}
          </Button>
        </div>
      </div>

      {notice ? <Alert tone={notice.tone}>{notice.msg}</Alert> : null}
      {problem ? <Alert tone="danger" title="This cannot be saved yet">{problem}</Alert> : null}

      {categories.map((category, ci) => (
        <section
          className="card"
          key={`${category.title}-${ci}`}
          aria-labelledby={`lot-family-${ci}`}
        >
          <div className="card__body stack">
            <div className="pricing-editor__family">
              <div className="field-grid field-grid--2">
                <div className="field">
                  <label htmlFor={`family-title-${ci}`}>Family name</label>
                  <input
                    id={`family-title-${ci}`}
                    className="input"
                    type="text"
                    value={category.title}
                    onChange={(e) => patchCategory(ci, { title: e.target.value })}
                  />
                  <span className="field__hint">
                    The sheet&rsquo;s printed heading, shown on the public page and used by the
                    home service cards to price their “from …” line.
                  </span>
                </div>
                <div className="field">
                  <label htmlFor={`family-caption-${ci}`}>Table caption</label>
                  <input
                    id={`family-caption-${ci}`}
                    className="input"
                    type="text"
                    value={category.caption}
                    onChange={(e) => patchCategory(ci, { caption: e.target.value })}
                  />
                  <span className="field__hint">The family name as the sheet prints it.</span>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeCategory(ci)}
                disabled={categories.length <= 1}
                title={
                  categories.length <= 1
                    ? "The price list needs at least one family."
                    : "Remove this family (unsaved until you press Save)."
                }
              >
                Remove family
              </Button>
            </div>

            <div className="table-wrapper pricing-editor__scroll">
              <table className="table pricing-editor__table">
                <caption className="sr-only">
                  {category.title || `Family ${ci + 1}`} — regular and senior amounts by product
                </caption>
                <thead>
                  <tr>
                    <th scope="col" rowSpan={2}>
                      Product
                    </th>
                    <th scope="col" rowSpan={2}>
                      Area (sqm)
                    </th>
                    <th scope="colgroup" colSpan={5}>
                      Regular
                    </th>
                    <th scope="colgroup" colSpan={5}>
                      Senior citizen
                    </th>
                    <th scope="col" rowSpan={2}>
                      <span className="sr-only">Row actions</span>
                    </th>
                  </tr>
                  <tr>
                    {(["regular", "senior"] as const).flatMap((table) =>
                      FIGURE_TERMS.map((term) => (
                        <th scope="col" key={`${table}-${term}`}>
                          {TERM_LABEL[term]}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {category.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td>
                        <input
                          className="input pricing-editor__name"
                          type="text"
                          aria-label={`Product name — ${category.title || `Family ${ci + 1}`} row ${ri + 1}`}
                          value={row.product}
                          onChange={(e) => patchRow(ci, ri, { product: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input pricing-editor__num"
                          type="number"
                          min={0}
                          step={0.01}
                          inputMode="decimal"
                          aria-label={`${category.title || `Family ${ci + 1}`} · ${row.product || `Row ${ri + 1}`} · Area (sqm)`}
                          value={Number.isFinite(row.area) ? row.area : ""}
                          onChange={(e) =>
                            patchRow(ci, ri, {
                              area: e.target.value.trim() === "" ? Number.NaN : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      {figureInput(ci, ri, "regular", "selling", row.product)}
                      {INSTALLMENT_TERMS.map((term) =>
                        figureInput(ci, ri, "regular", term, row.product),
                      )}
                      {figureInput(ci, ri, "senior", "selling", row.product)}
                      {INSTALLMENT_TERMS.map((term) =>
                        figureInput(ci, ri, "senior", term, row.product),
                      )}
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(ci, ri)}
                          disabled={category.rows.length <= 1}
                          title={
                            category.rows.length <= 1
                              ? "A family needs at least one product row."
                              : "Remove this row (unsaved until you press Save)."
                          }
                          aria-label={`Remove ${row.product || `row ${ri + 1}`} from ${category.title || `family ${ci + 1}`}`}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pricing-editor__family-actions">
              <Button variant="secondary" size="sm" onClick={() => addRow(ci)}>
                + Add product row
              </Button>
              <span className="text-sm text-muted">
                Annual × 6 must equal the selling price within ₱3 (the sheet&rsquo;s rounding).
              </span>
            </div>
          </div>
        </section>
      ))}

      <div className="pricing-editor__actions">
        <Button variant="secondary" onClick={addCategory}>
          + Add lot family
        </Button>
      </div>

      <section className="card" aria-labelledby="lot-prices-preview">
        <div className="card__body stack">
          <h2 id="lot-prices-preview">Preview — exactly what /lots/price-list-2026 prints</h2>
          <p className="text-sm text-muted">
            Rendered live by the same component the public page mounts, using the unsaved
            figures above. Nothing is published until you press Save.
          </p>
          <PriceList2026Tables categories={categories} />
        </div>
      </section>
    </div>
  );
}

export default LotPricesEditor;
