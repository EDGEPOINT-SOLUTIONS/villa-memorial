"use client";

/**
 * Gallery editor — the entry-level PDP photographs (report §7 section 2).
 *
 * An ordered, uncapped list of `ContentImage`s: drag to reorder (or the keyboard
 * ↑/↓ buttons), remove, and add from the media library, a device upload or a
 * public URL through the shared `MediaPicker` (the parent owns the single picker
 * modal). Alt text is required, a sample needs its caption, and the first image is
 * the page's lead photograph.
 *
 * The rule-derived catalogue photograph is offered as a suggestion when the
 * gallery is empty, so a fresh editor is never blank — but nothing is added
 * until staff choose it, and a withdrawn/held photograph is never suggested.
 */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoveButtons, TextField } from "@/components/content/content-editor-fields";
import { CONTENT_ALT_MAX, CONTENT_CAPTION_MAX, type ContentImage } from "@/lib/content-catalog";

function newId(): string {
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** A fresh blank image the picker will fill in. */
export function blankGalleryImage(): ContentImage {
  return { id: newId(), src: "", alt: "", caption: null, sample: false };
}

export function GalleryEditor({
  images,
  onChange,
  onPickImage,
  suggested,
}: {
  images: ContentImage[];
  onChange: (next: ContentImage[]) => void;
  onPickImage: (imageId: string) => void;
  suggested?: ContentImage | null;
}) {
  const dragIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  function patchImage(id: string, patch: Partial<ContentImage>) {
    onChange(images.map((image) => (image.id === id ? { ...image, ...patch } : image)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function dropOn(index: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    setDragging(null);
    if (from === null || from === index) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    onChange(next);
  }

  function addPhoto() {
    const image = blankGalleryImage();
    onChange([...images, image]);
    // The picker opens on the new blank row; its `onPick` fills this id in.
    onPickImage(image.id);
  }

  return (
    <div className="stack-3">
      <p className="text-sm text-muted" style={{ margin: 0 }}>
        The first photograph leads the product page and the rest sit in its thumbnail rail. Alt text is
        required; a sample needs its caption.
      </p>

      {images.length === 0 ? (
        <div className="stack-2">
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            No photographs yet.
          </p>
          {suggested?.src ? (
            <div className="gallery-editor__suggested">
              {/* eslint-disable-next-line @next/next/no-img-element -- library/rule-derived photo */}
              <img className="cat-image__thumb" src={suggested.src} alt="" />
              <div className="stack-2" style={{ flex: "1 1 14rem" }}>
                <p className="text-sm" style={{ margin: 0 }}>
                  The catalogue record&rsquo;s own photograph for this model, with the honesty chip already set.
                  Use it to start the gallery, or add your own.
                </p>
                <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
                  <Button variant="secondary" size="sm" onClick={() => onChange([{ ...suggested, id: newId() }])}>
                    Use this photograph
                  </Button>
                  <Button variant="secondary" size="sm" onClick={addPhoto}>
                    Add another photo
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Button variant="secondary" size="sm" onClick={addPhoto}>
                Add photo
              </Button>
            </div>
          )}
        </div>
      ) : (
        <ul className="gallery-editor" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {images.map((image, index) => (
            <li
              key={image.id}
              className={`gallery-editor__item${dragging === index ? " gallery-editor__item--dragging" : ""}`}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
                setDragging(index);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(index)}
              onDragEnd={() => {
                dragIndex.current = null;
                setDragging(null);
              }}
            >
              <div className="gallery-editor__media">
                {image.src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- library/uploaded photo
                  <img className="cat-image__thumb" src={image.src} alt="" />
                ) : (
                  <span className="cat-image__thumb cat-image__thumb--empty">No photo</span>
                )}
                <span className="gallery-editor__order" aria-hidden="true">
                  {index === 0 ? "Lead" : index + 1}
                </span>
              </div>

              <div className="stack-2 gallery-editor__fields">
                <Button variant="secondary" size="sm" onClick={() => onPickImage(image.id)}>
                  {image.src ? "Change photo" : "Choose photo"}
                </Button>
                <TextField
                  label={`Photograph ${index + 1} alt text`}
                  value={image.alt}
                  onChange={(value) => patchImage(image.id, { alt: value })}
                  hint="What the picture shows — required."
                />
                <TextField
                  label="Caption (optional)"
                  value={image.caption ?? ""}
                  onChange={(value) => patchImage(image.id, { caption: value || null })}
                />
                <label className="row text-sm" style={{ gap: "var(--space-2)" }}>
                  <input
                    type="checkbox"
                    checked={image.sample}
                    onChange={(event) => patchImage(image.id, { sample: event.target.checked })}
                  />
                  Sample — illustration purposes only (caption required)
                </label>
              </div>

              <MoveButtons
                label={`photograph ${index + 1}`}
                first={index === 0}
                last={index === images.length - 1}
                onUp={() => move(index, -1)}
                onDown={() => move(index, 1)}
                onRemove={() => onChange(images.filter((candidate) => candidate.id !== image.id))}
              />
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 ? (
        <div>
          <Button variant="secondary" size="sm" onClick={addPhoto}>
            Add photo
          </Button>
        </div>
      ) : null}

      <p className="text-sm text-muted" style={{ margin: 0 }}>
        Alt text stays under {CONTENT_ALT_MAX} characters and a caption under {CONTENT_CAPTION_MAX}; the save
        rule refuses anything longer.
      </p>
    </div>
  );
}
