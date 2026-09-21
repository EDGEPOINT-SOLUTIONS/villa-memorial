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
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/landing/editor-pickers";
import { HeroBackgroundField } from "@/components/landing/hero-background-field";
import {
  AreaField,
  BlockForm,
  MoveButtons,
  TextField,
  type SkuOption,
} from "@/components/content/content-editor-fields";
import {
  CONTENT_BLOCK_TYPES,
  CONTENT_RATE_REFS,
  emptyBlock,
  validatePageDocument,
  type ContentBlock,
  type ContentBlockType,
  type PageDocument,
  type PageTab,
} from "@/lib/content-catalog";

export type { SkuOption } from "@/components/content/content-editor-fields";

type SaveState = { tone: "ok" | "danger"; text: string } | null;

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
              hint="Optional — with no eyebrow, headline or lead the page renders a pure hero photo."
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
              if (block.id !== target.blockId) return block;
              if (block.type === "gallery") {
                return {
                  ...block,
                  images: block.images.map((image) => (image.id === target.imageId ? { ...image, src } : image)),
                };
              }
              if (block.type === "checklist") {
                // The optional tier image: keep any alt/caption/sample the staff
                // already wrote, only swap the picture.
                const prior = block.image;
                return {
                  ...block,
                  image: {
                    id: prior?.id ?? `img-${Date.now().toString(36)}`,
                    src,
                    alt: prior?.alt ?? "",
                    caption: prior?.caption ?? null,
                    sample: prior?.sample ?? false,
                  },
                };
              }
              return block;
            }),
          }));
        }}
      />
    </div>
  );
}
