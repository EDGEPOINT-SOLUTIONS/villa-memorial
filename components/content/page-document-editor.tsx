"use client";

/**
 * Page-document editor — the shared editing surface of Pages & content.
 *
 * One editor for every page document (Phase 0+1 of
 * data/villa-content-catalog-plan/report.md): the hero (with the home's own
 * background colour + transparency control), the page's tabs, and — where the
 * document's page renders them — the ordered content blocks from the shared
 * vocabulary (paragraphs, bullets, checklists, steps, images, tables, price
 * tables/lists bound to real records, notes, links).
 *
 * Honesty rules this UI cannot bypass:
 *  - it saves through `validatePageDocument` with the LIVE SKU list it was
 *    handed, so the same rule the server runs is shown before the request;
 *  - a price block edits a REFERENCE (a catalogue SKU / a rate-table name),
 *    never an amount — the resolved amount is shown read-only beside it;
 *  - a sample image's caption is required (the server refuses it too);
 *  - no field here accepts HTML.
 *
 * Reuses the landing editor's own controls and classes (`Field`, the media
 * picker, `HeroBackgroundField`) so the product keeps ONE editing grammar.
 */
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/landing/editor-pickers";
import { HeroBackgroundField } from "@/components/landing/hero-background-field";
import {
  CONTENT_BLOCK_TYPES,
  CONTENT_RATE_REFS,
  emptyBlock,
  validatePageDocument,
  type ChecklistItem,
  type ContentBlock,
  type ContentBlockType,
  type ContentImage,
  type LinkItem,
  type PageDocument,
  type PageTab,
  type PriceBinding,
  type PriceListRow,
  type StepItem,
} from "@/lib/content-catalog";

export type SkuOption = {
  sku: string;
  name: string;
  displayPrice: string;
};

type SaveState = { tone: "ok" | "danger"; text: string } | null;

/* ------------------------------- small fields ------------------------------ */

function TextField({
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

function AreaField({
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

function MoveButtons({
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

/* --------------------------------- editor ---------------------------------- */

export function PageDocumentEditor({
  initial,
  skuOptions,
  blocksEnabled,
  pageRoute,
}: {
  initial: PageDocument;
  skuOptions: SkuOption[];
  blocksEnabled: boolean;
  pageRoute: string;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<PageDocument>(() => structuredClone(initial));
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [picker, setPicker] = useState<{ blockId: string; imageId: string } | null>(null);
  const [newBlockType, setNewBlockType] = useState<ContentBlockType>("paragraph");

  const skuSet = new Set(skuOptions.map((option) => option.sku));
  const rateRefs = new Set(CONTENT_RATE_REFS);

  function patchDocument(patch: Partial<PageDocument>) {
    setDoc((current) => ({ ...current, ...patch }));
  }

  function replaceBlock(next: ContentBlock) {
    setDoc((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === next.id ? next : block)),
    }));
  }

  function addBlock() {
    setDoc((current) => ({ ...current, blocks: [...current.blocks, emptyBlock(newBlockType)] }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setDoc((current) => {
      const next = [...current.blocks];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, blocks: next };
    });
  }

  function removeBlock(id: string) {
    setDoc((current) => ({ ...current, blocks: current.blocks.filter((block) => block.id !== id) }));
  }

  function addTab() {
    patchDocument({
      tabs: [...doc.tabs, { id: `tab-${doc.tabs.length + 1}-${Date.now().toString(36)}`, label: "", href: "", note: null }],
    });
  }

  function patchTab(index: number, patch: Partial<PageTab>) {
    patchDocument({ tabs: doc.tabs.map((tab, i) => (i === index ? { ...tab, ...patch } : tab)) });
  }

  async function save() {
    const verdict = validatePageDocument(doc, { skus: skuSet, rateRefs });
    if (!verdict.ok) {
      setSaveState({ tone: "danger", text: verdict.errors.join(" ") });
      return;
    }
    setPending(true);
    setSaveState(null);
    try {
      const res = await fetch("/api/content/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: doc.key, document: verdict.value }),
      });
      const payload: unknown = await res.json().catch(() => null);
      const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
      if (!res.ok) {
        setSaveState({ tone: "danger", text: String(record.error ?? "The save failed. Please try again.") });
        return;
      }
      const saved = record.document as PageDocument | undefined;
      if (saved) setDoc(saved);
      setSaveState({ tone: "ok", text: "Saved — the page prints this document on its next visit." });
      router.refresh();
    } catch {
      setSaveState({ tone: "danger", text: "The save could not reach the server. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const skuLabel = (sku: string) => {
    const option = skuOptions.find((entry) => entry.sku === sku);
    return option ? `${option.name} · ${option.displayPrice}` : sku;
  };

  return (
    <div className="stack-4">
      <div className="card">
        <div className="card__body stack-3">
          <div className="row row--space row--wrap">
            <div>
              <p className="eyebrow-label">Page document · {doc.title}</p>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                Public page: <code>{pageRoute}</code>
                {doc.updated_at ? ` · last saved ${new Date(doc.updated_at).toLocaleString()}` : " · seed copy, not yet edited"}
              </p>
            </div>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <a href={pageRoute} target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
                View live page
              </a>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save page"}
              </Button>
            </div>
          </div>
          {saveState ? (
            <p
              className={saveState.tone === "ok" ? "text-sm" : "text-sm"}
              style={{
                margin: 0,
                color: saveState.tone === "ok" ? "var(--color-status-success-ink)" : "var(--color-status-danger-ink)",
              }}
              role={saveState.tone === "danger" ? "alert" : undefined}
            >
              {saveState.text}
            </p>
          ) : null}
        </div>
      </div>

      <section className="card" aria-labelledby="page-hero-title">
        <div className="card__body stack-3">
          <h2 id="page-hero-title" className="text-lg">
            Hero
          </h2>
          <div className="field-grid field-grid--2">
            <TextField
              label="Eyebrow"
              value={doc.hero.eyebrow}
              onChange={(value) => patchDocument({ hero: { ...doc.hero, eyebrow: value } })}
              hint="The small line above the headline."
            />
            <TextField
              label="Headline"
              value={doc.hero.headline}
              onChange={(value) => patchDocument({ hero: { ...doc.hero, headline: value } })}
            />
          </div>
          <AreaField
            label="Lead"
            value={doc.hero.lead}
            onChange={(value) => patchDocument({ hero: { ...doc.hero, lead: value } })}
            rows={2}
            hint="One or two sentences a family reads first."
          />
          <div className="field-grid field-grid--2">
            <Field
              label="Hero photo (optional)"
              htmlFor="page-hero-image"
              hint="From the park's media library, a device upload or a public URL."
            >
              <div className="cat-image">
                {doc.hero.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- library/uploaded photo
                  <img className="cat-image__thumb" src={doc.hero.image} alt="" />
                ) : (
                  <span className="cat-image__thumb cat-image__thumb--empty">No photo</span>
                )}
                <div className="cat-image__meta">
                  <input
                    id="page-hero-image"
                    type="text"
                    value={doc.hero.image ?? ""}
                    onChange={(event) => patchDocument({ hero: { ...doc.hero, image: event.target.value || null } })}
                    placeholder="/media/…  or  https://…"
                  />
                  <div className="row">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPicker({ blockId: "__hero__", imageId: "__hero__" })}
                    >
                      Choose photo
                    </Button>
                    {doc.hero.image ? (
                      <Button variant="ghost" size="sm" onClick={() => patchDocument({ hero: { ...doc.hero, image: null } })}>
                        Remove photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Field>
          </div>
          <HeroBackgroundField
            hero={doc.hero}
            onChange={(patch) => patchDocument({ hero: { ...doc.hero, ...patch } })}
          />
        </div>
      </section>

      {doc.key === "park" ? (
        <section className="card" aria-labelledby="page-tabs-title">
          <div className="card__body stack-3">
            <div className="row row--space row--wrap">
              <div>
                <h2 id="page-tabs-title" className="text-lg">
                  Page tabs
                </h2>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  The Lots listing is a tab of this page; the park view is the other.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={addTab} disabled={doc.tabs.length >= 6}>
                Add tab
              </Button>
            </div>
            <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {doc.tabs.map((tab, index) => (
                <li key={tab.id} className="card" style={{ padding: "var(--space-3)" }}>
                  <div className="field-grid field-grid--2">
                    <TextField label="Tab label" value={tab.label} onChange={(value) => patchTab(index, { label: value })} />
                    <TextField label="Destination" value={tab.href} onChange={(value) => patchTab(index, { href: value })} hint="e.g. /map?tab=lots" />
                  </div>
                  <MoveButtons
                    label={tab.label || "tab"}
                    first={index === 0}
                    last={index === doc.tabs.length - 1}
                    onUp={() => {
                      const next = [...doc.tabs];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      patchDocument({ tabs: next });
                    }}
                    onDown={() => {
                      const next = [...doc.tabs];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      patchDocument({ tabs: next });
                    }}
                    onRemove={() => patchDocument({ tabs: doc.tabs.filter((_, i) => i !== index) })}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {blocksEnabled ? (
        <section className="card" aria-labelledby="page-blocks-title">
          <div className="card__body stack-3">
            <div className="row row--space row--wrap">
              <div>
                <h2 id="page-blocks-title" className="text-lg">
                  Content blocks
                </h2>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Add, reorder, edit and remove. A price block stores a live reference, never an amount.
                </p>
              </div>
              <div className="row" style={{ gap: "var(--space-2)" }}>
                <label className="visually-hidden" htmlFor="new-block-type">
                  Block type
                </label>
                <select
                  id="new-block-type"
                  value={newBlockType}
                  onChange={(event) => setNewBlockType(event.target.value as ContentBlockType)}
                >
                  {CONTENT_BLOCK_TYPES.map((entry) => (
                    <option key={entry.type} value={entry.type}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={addBlock} disabled={doc.blocks.length >= 40}>
                  Add block
                </Button>
              </div>
            </div>

            {doc.blocks.length === 0 ? (
              <p className="text-sm text-muted">No blocks yet — the page prints its own layout until one is added.</p>
            ) : (
              <ul className="stack-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {doc.blocks.map((block, index) => (
                  <li key={block.id} className="card" style={{ padding: "var(--space-4)" }}>
                    <div className="row row--space row--wrap" style={{ alignItems: "center" }}>
                      <strong className="text-sm">
                        {CONTENT_BLOCK_TYPES.find((entry) => entry.type === block.type)?.label ?? block.type}
                      </strong>
                      <MoveButtons
                        label={`${block.type} block`}
                        first={index === 0}
                        last={index === doc.blocks.length - 1}
                        onUp={() => moveBlock(index, -1)}
                        onDown={() => moveBlock(index, 1)}
                        onRemove={() => removeBlock(block.id)}
                      />
                    </div>
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <BlockForm
                        block={block}
                        skuOptions={skuOptions}
                        skuLabel={skuLabel}
                        onChange={replaceBlock}
                        onPickImage={(imageId) => setPicker({ blockId: block.id, imageId })}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={(src) => {
          const target = picker;
          setPicker(null);
          if (!target) return;
          if (target.blockId === "__hero__") {
            patchDocument({ hero: { ...doc.hero, image: src } });
            return;
          }
          setDoc((current) => ({
            ...current,
            blocks: current.blocks.map((block) => {
              if (block.id !== target.blockId || block.type !== "gallery") return block;
              return {
                ...block,
                images: block.images.map((image) => (image.id === target.imageId ? { ...image, src } : image)),
              };
            }),
          }));
        }}
      />
    </div>
  );
}

/* ------------------------------- block forms ------------------------------- */

function BlockForm({
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
