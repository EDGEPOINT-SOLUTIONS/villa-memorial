"use client";

/**
 * The content editor's shared fields — extracted from the page-document editor
 * so the service-entry editor (content-catalogue Phase 3) reuses ONE block
 * grammar. `TextField` / `AreaField` / `MoveButtons` are the editor controls and
 * `BlockForm` is the full block vocabulary form (paragraph · bullets · checklist
 * · steps · images · table · price table/list bound to live records · note ·
 * links). A price block edits a REFERENCE, never an amount.
 */
import { useId } from "react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  CONTENT_RATE_REFS,
  type ChecklistItem,
  type ContentBlock,
  type ContentImage,
  type LinkItem,
  type PriceBinding,
  type PriceListRow,
  type StepItem,
} from "@/lib/content-catalog";

export type SkuOption = {
  sku: string;
  name: string;
  displayPrice: string;
};


/* ------------------------------- small fields ------------------------------ */

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function MoveButtons({
  label,
  first,
  last,
  onUp,
  onDown,
  onRemove,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="row" style={{ gap: "var(--space-2)" }}>
      <button type="button" className="ed-icon-btn" aria-label={`Move ${label} up`} disabled={first} onClick={onUp}>
        ↑
      </button>
      <button type="button" className="ed-icon-btn" aria-label={`Move ${label} down`} disabled={last} onClick={onDown}>
        ↓
      </button>
      <button type="button" className="ed-icon-btn ed-icon-btn--danger" aria-label={`Remove ${label}`} onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

/* ------------------------------- block forms ------------------------------- */

export function BlockForm({
  block,
  skuOptions,
  skuLabel,
  onChange,
  onPickImage,
}: {
  block: ContentBlock;
  skuOptions: SkuOption[];
  skuLabel: (sku: string) => string;
  onChange: (next: ContentBlock) => void;
  onPickImage: (imageId: string) => void;
}) {
  const heading = (
    <TextField
      label="Block heading (optional)"
      value={block.heading}
      onChange={(value) => onChange({ ...block, heading: value } as ContentBlock)}
    />
  );

  switch (block.type) {
    case "paragraph":
      return (
        <div className="stack-3">
          {heading}
          <AreaField
            label="Paragraphs"
            value={block.body.join("\n\n")}
            onChange={(value) => onChange({ ...block, body: value.split(/\n\s*\n/) })}
            rows={4}
            hint="Leave a blank line between paragraphs."
          />
        </div>
      );
    case "bullets":
      return (
        <div className="stack-3">
          {heading}
          <AreaField
            label="Bullets"
            value={block.items.join("\n")}
            onChange={(value) => onChange({ ...block, items: value.split("\n") })}
            rows={4}
            hint="One item per line."
          />
        </div>
      );
    case "checklist":
      return (
        <div className="stack-3">
          {heading}
          <Field label="Checklist style" htmlFor={`mode-${block.id}`}>
            <select
              id={`mode-${block.id}`}
              value={block.mode}
              onChange={(event) => onChange({ ...block, mode: event.target.value === "printed" ? "printed" : "dropdown" })}
            >
              <option value="dropdown">Dropdown on the page</option>
              <option value="printed">Printed open</option>
            </select>
          </Field>
          <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {block.items.map((item: ChecklistItem, index) => (
              <li key={item.id} className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  aria-label={`Item ${index + 1} included`}
                  onChange={(event) =>
                    onChange({
                      ...block,
                      items: block.items.map((entry, i) => (i === index ? { ...entry, checked: event.target.checked } : entry)),
                    })
                  }
                />
                <input
                  type="text"
                  value={item.label}
                  aria-label={`Inclusion ${index + 1}`}
                  placeholder="e.g. Flowers"
                  onChange={(event) =>
                    onChange({
                      ...block,
                      items: block.items.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry)),
                    })
                  }
                />
                <button
                  type="button"
                  className="ed-icon-btn ed-icon-btn--danger"
                  aria-label={`Remove inclusion ${index + 1}`}
                  onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== index) })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({ ...block, items: [...block.items, { id: `check-${Date.now().toString(36)}`, label: "", checked: true }] })
            }
            disabled={block.items.length >= 30}
          >
            Add inclusion
          </Button>
        </div>
      );
    case "steps":
      return (
        <div className="stack-3">
          {heading}
          {block.steps.map((step: StepItem, index) => (
            <div key={step.id} className="card" style={{ padding: "var(--space-3)" }}>
              <TextField
                label={`Step ${index + 1} title`}
                value={step.title}
                onChange={(value) =>
                  onChange({ ...block, steps: block.steps.map((entry, i) => (i === index ? { ...entry, title: value } : entry)) })
                }
              />
              <AreaField
                label={`Step ${index + 1} text`}
                value={step.text}
                rows={2}
                onChange={(value) =>
                  onChange({ ...block, steps: block.steps.map((entry, i) => (i === index ? { ...entry, text: value } : entry)) })
                }
              />
              <button
                type="button"
                className="ed-icon-btn ed-icon-btn--danger"
                aria-label={`Remove step ${index + 1}`}
                onClick={() => onChange({ ...block, steps: block.steps.filter((_, i) => i !== index) })}
              >
                ✕
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({ ...block, steps: [...block.steps, { id: `step-${Date.now().toString(36)}`, title: "", text: "" }] })
            }
            disabled={block.steps.length >= 10}
          >
            Add step
          </Button>
        </div>
      );
    case "gallery":
      return (
        <div className="stack-3">
          {heading}
          {block.images.map((image: ContentImage, index) => (
            <div key={image.id} className="card" style={{ padding: "var(--space-3)" }}>
              <div className="row row--wrap" style={{ gap: "var(--space-3)", alignItems: "flex-start" }}>
                {image.src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- library/uploaded photo
                  <img className="cat-image__thumb" src={image.src} alt="" />
                ) : (
                  <span className="cat-image__thumb cat-image__thumb--empty">No photo</span>
                )}
                <div className="stack-2" style={{ flex: "1 1 14rem" }}>
                  <Button variant="secondary" size="sm" onClick={() => onPickImage(image.id)}>
                    {image.src ? "Change photo" : "Choose photo"}
                  </Button>
                  <TextField
                    label={`Image ${index + 1} alt text`}
                    value={image.alt}
                    onChange={(value) =>
                      onChange({ ...block, images: block.images.map((entry, i) => (i === index ? { ...entry, alt: value } : entry)) })
                    }
                  />
                  <TextField
                    label="Caption (optional)"
                    value={image.caption ?? ""}
                    onChange={(value) =>
                      onChange({
                        ...block,
                        images: block.images.map((entry, i) => (i === index ? { ...entry, caption: value || null } : entry)),
                      })
                    }
                  />
                  <label className="row text-sm" style={{ gap: "var(--space-2)" }}>
                    <input
                      type="checkbox"
                      checked={image.sample}
                      onChange={(event) =>
                        onChange({
                          ...block,
                          images: block.images.map((entry, i) => (i === index ? { ...entry, sample: event.target.checked } : entry)),
                        })
                      }
                    />
                    Sample — illustration purposes only (caption required)
                  </label>
                </div>
                <button
                  type="button"
                  className="ed-icon-btn ed-icon-btn--danger"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => onChange({ ...block, images: block.images.filter((_, i) => i !== index) })}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                images: [...block.images, { id: `img-${Date.now().toString(36)}`, src: "", alt: "", caption: null, sample: false }],
              })
            }
            disabled={block.images.length >= 12}
          >
            Add image
          </Button>
        </div>
      );
    case "table":
      return (
        <div className="stack-3">
          {heading}
          <TextField
            label="Caption (optional)"
            value={block.caption ?? ""}
            onChange={(value) => onChange({ ...block, caption: value || null })}
          />
          <TextField
            label="Columns"
            value={block.columns.join(" | ")}
            onChange={(value) => onChange({ ...block, columns: value.split("|").map((cell) => cell.trim()) })}
            hint="Separate column headings with a pipe |."
          />
          <AreaField
            label="Rows"
            value={block.rows.map((row) => row.join(" | ")).join("\n")}
            onChange={(value) =>
              onChange({ ...block, rows: value.split("\n").map((line) => line.split("|").map((cell) => cell.trim())) })
            }
            rows={5}
            hint="One row per line; separate cells with a pipe |."
          />
        </div>
      );
    case "priceTable":
      return (
        <div className="stack-3">
          {heading}
          <Field label="Price source" htmlFor={`binding-${block.id}`}>
            <select
              id={`binding-${block.id}`}
              value={bindingValue(block.binding)}
              onChange={(event) => onChange({ ...block, binding: bindingFromValue(event.target.value) })}
            >
              <option value="quoteOnly">Ask the office (no published amount)</option>
              {CONTENT_RATE_REFS.map((ref) => (
                <option key={ref} value={`matrix:${ref}`}>
                  Rate table — {rateRefLabel(ref)}
                </option>
              ))}
              {skuOptions.map((option) => (
                <option key={option.sku} value={`sku:${option.sku}`}>
                  {option.name} · {option.displayPrice}
                </option>
              ))}
            </select>
          </Field>
          {block.binding.kind === "sku" ? (
            <p className="text-sm muted" style={{ margin: 0 }}>
              Prints <strong>{skuLabel(block.binding.sku)}</strong>, read live from the catalogue.
            </p>
          ) : null}
          {block.binding.kind === "matrix" ? (
            <p className="text-sm muted" style={{ margin: 0 }}>
              Prints the current <strong>{rateRefLabel(block.binding.ref)}</strong> table, read live from the pricing store.
            </p>
          ) : null}
          <TextField label="Note (optional)" value={block.note ?? ""} onChange={(value) => onChange({ ...block, note: value || null })} />
        </div>
      );
    case "priceList":
      return (
        <div className="stack-3">
          {heading}
          {block.rows.map((row: PriceListRow, index) => (
            <div key={row.id} className="field-grid field-grid--2">
              <Field label={`Row ${index + 1} — catalogue line`} htmlFor={`row-${row.id}`}>
                <select
                  id={`row-${row.id}`}
                  value={row.sku}
                  onChange={(event) =>
                    onChange({ ...block, rows: block.rows.map((entry, i) => (i === index ? { ...entry, sku: event.target.value } : entry)) })
                  }
                >
                  <option value="">Choose a catalogue line…</option>
                  {skuOptions.map((option) => (
                    <option key={option.sku} value={option.sku}>
                      {option.name} · {option.displayPrice}
                    </option>
                  ))}
                </select>
              </Field>
              <TextField
                label="Row label (optional)"
                value={row.label}
                onChange={(value) =>
                  onChange({ ...block, rows: block.rows.map((entry, i) => (i === index ? { ...entry, label: value } : entry)) })
                }
              />
              <div className="row" style={{ gap: "var(--space-2)", alignItems: "flex-end" }}>
                <button
                  type="button"
                  className="ed-icon-btn ed-icon-btn--danger"
                  aria-label={`Remove row ${index + 1}`}
                  onClick={() => onChange({ ...block, rows: block.rows.filter((_, i) => i !== index) })}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({ ...block, rows: [...block.rows, { id: `row-${Date.now().toString(36)}`, sku: "", label: "", unit: "" }] })
            }
          >
            Add row
          </Button>
          <TextField label="Note (optional)" value={block.note ?? ""} onChange={(value) => onChange({ ...block, note: value || null })} />
        </div>
      );
    case "note":
      return (
        <div className="stack-3">
          <TextField label="Heading (optional)" value={block.heading} onChange={(value) => onChange({ ...block, heading: value })} />
          <Field label="Style" htmlFor={`tone-${block.id}`}>
            <select
              id={`tone-${block.id}`}
              value={block.tone}
              onChange={(event) => onChange({ ...block, tone: event.target.value === "attention" ? "attention" : "info" })}
            >
              <option value="info">Information</option>
              <option value="attention">Attention</option>
            </select>
          </Field>
          <AreaField label="Note" value={block.text} rows={3} onChange={(value) => onChange({ ...block, text: value })} />
        </div>
      );
    case "links":
      return (
        <div className="stack-3">
          {heading}
          {block.items.map((item: LinkItem, index) => (
            <div key={item.id} className="field-grid field-grid--2">
              <TextField
                label={`Link ${index + 1} label`}
                value={item.label}
                onChange={(value) =>
                  onChange({ ...block, items: block.items.map((entry, i) => (i === index ? { ...entry, label: value } : entry)) })
                }
              />
              <TextField
                label="Destination"
                value={item.href}
                onChange={(value) =>
                  onChange({ ...block, items: block.items.map((entry, i) => (i === index ? { ...entry, href: value } : entry)) })
                }
                hint="Internal path, #anchor or https:// link."
              />
              <button
                type="button"
                className="ed-icon-btn ed-icon-btn--danger"
                aria-label={`Remove link ${index + 1}`}
                onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== index) })}
              >
                ✕
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { id: `link-${Date.now().toString(36)}`, label: "", href: "", note: null }],
              })
            }
            disabled={block.items.length >= 12}
          >
            Add link
          </Button>
        </div>
      );
  }
}

function bindingValue(binding: PriceBinding): string {
  if (binding.kind === "sku") return `sku:${binding.sku}`;
  if (binding.kind === "matrix") return `matrix:${binding.ref}`;
  return "quoteOnly";
}

function bindingFromValue(value: string): PriceBinding {
  if (value === "quoteOnly") return { kind: "quoteOnly" };
  if (value.startsWith("matrix:")) return { kind: "matrix", ref: value.slice("matrix:".length) };
  if (value.startsWith("sku:")) return { kind: "sku", sku: value.slice("sku:".length) };
  return { kind: "quoteOnly" };
}

function rateRefLabel(ref: string): string {
  if (ref === "plans.regular") return "Villa Memorial Plan — regular rates";
  if (ref === "plans.senior") return "Villa Memorial Plan — senior citizen rates";
  return ref;
}
