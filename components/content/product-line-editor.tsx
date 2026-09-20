"use client";

/**
 * Product-line editor — the "Product line / variants" panel (P2 of
 * data/villa-pdp-cms-plan/report.md §7 section 4), mounted on an item's page
 * content screen for casket models.
 *
 * WHAT IT EDITS. The captain's model (Q4: line = the sheet's collection) means
 * the line IS the grouping: its staff-editable name, its ordered variant
 * membership and the shared specifications every variant inherits (Q1). A
 * variant's OWN gallery, description and specs are edited on that model's item
 * content screen — this panel links straight to each one, so an office editor
 * always knows where a variant's data lives.
 *
 * THE SAVE RULE IS THE SERVER'S. `validateProductLine` (against the live
 * catalogue SKUs) runs live here to disable Save and show the sentence, and the
 * same function runs in the store after the request. This panel never authors a
 * price: a variant is a catalogue SKU.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoveButtons, TextField } from "@/components/content/content-editor-fields";
import { SpecsEditor } from "@/components/content/specs-editor";
import { validateProductLine, type ContentSpecs, type ProductLine } from "@/lib/content-catalog";
import { casketVariantSkus } from "@/lib/product-line";

type SaveState = { tone: "ok" | "danger"; text: string } | null;

export type ProductLineCatalogueRow = { id: number; sku: string; name: string };

export function ProductLineEditor({
  initial,
  collection,
  catalogue,
}: {
  initial: ProductLine;
  /** The sheet collection this line groups (its variant membership defaults here). */
  collection: string;
  /** The casket catalogue rows: names for the variants and ids for their editors. */
  catalogue: ProductLineCatalogueRow[];
}) {
  const router = useRouter();
  const [line, setLine] = useState<ProductLine>(() => structuredClone(initial));
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [addSku, setAddSku] = useState("");

  const bySku = new Map(catalogue.map((row) => [row.sku, row]));
  const skuSet = new Set(catalogue.map((row) => row.sku));
  const collectionSkus = casketVariantSkus(collection);
  const available = collectionSkus.filter((sku) => !line.variantSkus.includes(sku));

  function patch(next: Partial<ProductLine>) {
    setLine((current) => ({ ...current, ...next }));
  }

  function move(index: number, direction: -1 | 1) {
    setLine((current) => {
      const next = [...current.variantSkus];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return { ...current, variantSkus: next };
    });
  }

  function addVariant() {
    if (!addSku || line.variantSkus.includes(addSku)) return;
    setLine((current) => ({ ...current, variantSkus: [...current.variantSkus, addSku] }));
    setAddSku("");
  }

  async function save() {
    const candidate: ProductLine = { ...line, name: line.name.trim() };
    const verdict = validateProductLine(candidate, { skus: skuSet, rateRefs: new Set<string>() });
    if (!verdict.ok) {
      setSaveState({ tone: "danger", text: verdict.errors.join(" ") });
      return;
    }
    setPending(true);
    setSaveState(null);
    try {
      const res = await fetch("/api/content/product-lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: line.id, line: verdict.value }),
      });
      const body: unknown = await res.json().catch(() => null);
      const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      if (!res.ok) {
        setSaveState({
          tone: "danger",
          text: String(record.error ?? "The save failed. Please try again."),
        });
        return;
      }
      const saved = record.line as ProductLine | undefined;
      if (saved) setLine(saved);
      setSaveState({ tone: "ok", text: "Saved — the selector prints this grouping on the product page’s next visit.", });
      router.refresh();
    } catch {
      setSaveState({ tone: "danger", text: "The save could not reach the server. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card" aria-labelledby="product-line-title">
      <div className="card__body stack-3">
        <div className="row row--space row--wrap">
          <div>
            <h2 id="product-line-title" className="text-lg">
              Product line / variants
            </h2>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              The models a family can choose between on this product page. Variants are the
              sheet&rsquo;s collection; each model&rsquo;s own photos and specs live on its item
              page-content screen.
            </p>
          </div>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save line"}
          </Button>
        </div>

        {saveState ? (
          <p
            className="text-sm"
            style={{
              margin: 0,
              color:
                saveState.tone === "ok"
                  ? "var(--color-status-success-ink)"
                  : "var(--color-status-danger-ink)",
            }}
            role={saveState.tone === "danger" ? "alert" : undefined}
          >
            {saveState.text}
          </p>
        ) : null}

        <div className="field-grid field-grid--2">
          <TextField
            label="Line name"
            value={line.name}
            onChange={(value) => patch({ name: value })}
            hint="The label the selector and the breadcrumb print."
          />
          <div>
            <p className="eyebrow-label" style={{ margin: 0 }}>
              Line id
            </p>
            <p className="text-sm" style={{ margin: 0 }}>
              <code>{line.id}</code>
            </p>
          </div>
        </div>

        <div className="stack-2">
          <p className="eyebrow-label" style={{ margin: 0 }}>
            Variants ({line.variantSkus.length})
          </p>
          {line.variantSkus.length === 0 ? (
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              No variants yet — add at least one model below.
            </p>
          ) : (
            <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {line.variantSkus.map((sku, index) => {
                const row = bySku.get(sku);
                return (
                  <li
                    key={sku}
                    className="row row--space row--wrap"
                    style={{
                      gap: "var(--space-3)",
                      alignItems: "center",
                      borderBottom: "1px solid var(--color-rule)",
                      paddingBottom: "var(--space-2)",
                    }}
                  >
                    <span>
                      <strong className="text-sm">{row?.name ?? sku}</strong>
                      <span className="text-sm text-muted"> · <code>{sku}</code></span>
                    </span>
                    <span className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
                      {row ? (
                        <a className="btn btn--secondary btn--sm" href={`/staff/catalog/${row.id}/content`}>
                          Edit content
                        </a>
                      ) : null}
                      <MoveButtons
                        label={`variant ${index + 1}`}
                        first={index === 0}
                        last={index === line.variantSkus.length - 1}
                        onUp={() => move(index, -1)}
                        onDown={() => move(index, 1)}
                        onRemove={() =>
                          patch({ variantSkus: line.variantSkus.filter((_, i) => i !== index) })
                        }
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {available.length > 0 ? (
            <div className="row row--wrap" style={{ gap: "var(--space-2)", alignItems: "end" }}>
              <div>
                <label className="eyebrow-label" htmlFor="product-line-add-variant" style={{ display: "block" }}>
                  Add a model from {collection}
                </label>
                <select
                  id="product-line-add-variant"
                  value={addSku}
                  onChange={(event) => setAddSku(event.target.value)}
                >
                  <option value="">Choose a model…</option>
                  {available.map((sku) => (
                    <option key={sku} value={sku}>
                      {bySku.get(sku)?.name ?? sku}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="secondary" size="sm" onClick={addVariant} disabled={!addSku}>
                Add variant
              </Button>
            </div>
          ) : null}
        </div>

        <div className="stack-2">
          <p className="eyebrow-label" style={{ margin: 0 }}>
            Shared specifications
          </p>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            Type a row once here and every variant inherits it; a variant&rsquo;s own table can
            override a row by its first cell. Money is a live price, never a cell.
          </p>
          <SpecsEditor
            value={line.sharedSpecs}
            onChange={(sharedSpecs: ContentSpecs | null) => patch({ sharedSpecs })}
          />
        </div>
      </div>
    </section>
  );
}
