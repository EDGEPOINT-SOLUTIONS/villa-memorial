"use client";

/**
 * Service-entry editor — the Services catalogue's entry editing surface
 * (content-catalogue Phase 3).
 *
 * One guide page is one CatalogueEntry of kind `service`: a title, a summary, one
 * hero photograph with its alt text and caption, and ordered content blocks from
 * the shared vocabulary (the SAME block form the page-document editor uses, so
 * the product keeps ONE editing grammar). A price block edits a REFERENCE, never
 * an amount; a sample photograph's caption is required.
 *
 * Honesty rules this UI cannot bypass (mirrors the page-document editor):
 *  - it saves through `validateCatalogueEntry` with the LIVE SKU list it was
 *    handed, so the server's own rule is shown before the request;
 *  - the hero photograph comes from the library, a device upload or a public URL
 *    through the shared MediaPicker — never a typed file path;
 *  - no field here accepts HTML.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/landing/editor-pickers";
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
  validateCatalogueEntry,
  type CatalogueEntry,
  type ContentBlock,
  type ContentBlockType,
  type ContentImage,
} from "@/lib/content-catalog";
import type { ServiceEntryDef } from "@/lib/service-content";

type SaveState = { tone: "ok" | "danger"; text: string } | null;

function blankGalleryImage(id: string): ContentImage {
  return { id, src: "", alt: "", caption: null, sample: false };
}

export function CatalogueEntryEditor({
  initial,
  def,
  skuOptions,
}: {
  initial: CatalogueEntry;
  def: ServiceEntryDef;
  skuOptions: SkuOption[];
}) {
  const router = useRouter();
  const [entry, setEntry] = useState<CatalogueEntry>(() => structuredClone(initial));
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [picker, setPicker] = useState<{ blockId: string; imageId: string } | null>(null);
  const [newBlockType, setNewBlockType] = useState<ContentBlockType>("paragraph");

  const skuSet = new Set(skuOptions.map((option) => option.sku));
  const rateRefs = new Set(CONTENT_RATE_REFS);

  const hero = entry.media.gallery[0] ?? null;

  function patchEntry(patch: Partial<CatalogueEntry>) {
    setEntry((current) => ({ ...current, ...patch }));
  }

  function replaceHero(patch: Partial<ContentImage>) {
    setEntry((current) => {
      const gallery = current.media.gallery.length > 0
        ? current.media.gallery
        : [blankGalleryImage("img-hero")];
      const [first, ...rest] = gallery;
      const next = { ...first, ...patch };
      return { ...current, media: { hero: next.src || null, gallery: [next, ...rest] } };
    });
  }

  function replaceBlock(next: ContentBlock) {
    patchEntry({ blocks: entry.blocks.map((block) => (block.id === next.id ? next : block)) });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setEntry((current) => {
      const next = [...current.blocks];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, blocks: next };
    });
  }

  async function save() {
    const payload: CatalogueEntry = {
      ...entry,
      media: { hero: hero?.src || null, gallery: entry.media.gallery },
    };
    const verdict = validateCatalogueEntry(payload, { skus: skuSet, rateRefs });
    if (!verdict.ok) {
      setSaveState({ tone: "danger", text: verdict.errors.join(" ") });
      return;
    }
    setPending(true);
    setSaveState(null);
    try {
      const res = await fetch("/api/content/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: entry.key, entry: verdict.value }),
      });
      const body: unknown = await res.json().catch(() => null);
      const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      if (!res.ok) {
        setSaveState({ tone: "danger", text: String(record.error ?? "The save failed. Please try again.") });
        return;
      }
      const saved = record.entry as CatalogueEntry | undefined;
      if (saved) setEntry(saved);
      setSaveState({ tone: "ok", text: "Saved — the page prints this entry on its next visit." });
      router.refresh();
    } catch {
      setSaveState({ tone: "danger", text: "The save could not reach the server. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const skuLabel = (sku: string) => {
    const option = skuOptions.find((line) => line.sku === sku);
    return option ? `${option.name} · ${option.displayPrice}` : sku;
  };

  return (
    <div className="stack-4">
      <div className="card">
        <div className="card__body stack-3">
          <div className="row row--space row--wrap">
            <div>
              <p className="eyebrow-label">Service entry · {entry.title || def.fallbackTitle}</p>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                Public page: <code>{def.route}</code>
                {entry.updated_at
                  ? ` · last saved ${new Date(entry.updated_at).toLocaleString()}`
                  : " · seed copy, not yet edited"}
              </p>
            </div>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <a href={def.route} target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
                View live page
              </a>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save entry"}
              </Button>
            </div>
          </div>
          {saveState ? (
            <p
              className="text-sm"
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

      <section className="card" aria-labelledby="entry-identity-title">
        <div className="card__body stack-3">
          <h2 id="entry-identity-title" className="text-lg">
            Identity
          </h2>
          <div className="field-grid field-grid--2">
            <TextField label="Title" value={entry.title} onChange={(value) => patchEntry({ title: value })} />
            <TextField
              label="Eyebrow"
              value={entry.group ?? ""}
              onChange={(value) => patchEntry({ group: value || null })}
              hint="The small line above the title on the guide page."
            />
          </div>
          <AreaField
            label="Summary"
            value={entry.summary}
            onChange={(value) => patchEntry({ summary: value })}
            rows={3}
            hint="The guide page's lead paragraph."
          />
        </div>
      </section>

      <section className="card" aria-labelledby="entry-media-title">
        <div className="card__body stack-3">
          <h2 id="entry-media-title" className="text-lg">
            Hero photograph
          </h2>
          <div className="row row--wrap" style={{ gap: "var(--space-3)", alignItems: "flex-start" }}>
            {hero?.src ? (
              // eslint-disable-next-line @next/next/no-img-element -- library/uploaded photo
              <img className="cat-image__thumb" src={hero.src} alt="" />
            ) : (
              <span className="cat-image__thumb cat-image__thumb--empty">No photo</span>
            )}
            <div className="stack-2" style={{ flex: "1 1 18rem" }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPicker({ blockId: "__hero__", imageId: "__hero__" })}
              >
                {hero?.src ? "Change photo" : "Choose photo"}
              </Button>
              <TextField
                label="Alt text"
                value={hero?.alt ?? ""}
                onChange={(value) => replaceHero({ alt: value })}
                hint="What the picture shows — required."
              />
              <TextField
                label="Caption (optional)"
                value={hero?.caption ?? ""}
                onChange={(value) => replaceHero({ caption: value || null })}
              />
              <label className="row text-sm" style={{ gap: "var(--space-2)" }}>
                <input
                  type="checkbox"
                  checked={hero?.sample ?? false}
                  onChange={(event) => replaceHero({ sample: event.target.checked })}
                />
                Sample — illustration purposes only (caption required)
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="entry-blocks-title">
        <div className="card__body stack-3">
          <div className="row row--space row--wrap">
            <div>
              <h2 id="entry-blocks-title" className="text-lg">
                Content blocks
              </h2>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                Add, reorder, edit and remove. A price block stores a live reference, never an amount.
              </p>
            </div>
            <div className="row" style={{ gap: "var(--space-2)" }}>
              <label className="visually-hidden" htmlFor="new-entry-block-type">
                Block type
              </label>
              <select
                id="new-entry-block-type"
                value={newBlockType}
                onChange={(event) => setNewBlockType(event.target.value as ContentBlockType)}
              >
                {CONTENT_BLOCK_TYPES.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => patchEntry({ blocks: [...entry.blocks, emptyBlock(newBlockType)] })}
                disabled={entry.blocks.length >= 40}
              >
                Add block
              </Button>
            </div>
          </div>

          {entry.blocks.length === 0 ? (
            <p className="text-sm text-muted">
              No blocks yet — the guide page prints its hero and action links until one is added.
            </p>
          ) : (
            <ul className="stack-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {entry.blocks.map((block, index) => (
                <li key={block.id} className="card" style={{ padding: "var(--space-4)" }}>
                  <div className="row row--space row--wrap" style={{ alignItems: "center" }}>
                    <strong className="text-sm">
                      {CONTENT_BLOCK_TYPES.find((type) => type.type === block.type)?.label ?? block.type}
                    </strong>
                    <MoveButtons
                      label={`${block.type} block`}
                      first={index === 0}
                      last={index === entry.blocks.length - 1}
                      onUp={() => moveBlock(index, -1)}
                      onDown={() => moveBlock(index, 1)}
                      onRemove={() => patchEntry({ blocks: entry.blocks.filter((_, i) => i !== index) })}
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

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={(src) => {
          const target = picker;
          setPicker(null);
          if (!target) return;
          if (target.blockId === "__hero__") {
            replaceHero({ src });
            return;
          }
          setEntry((current) => ({
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
