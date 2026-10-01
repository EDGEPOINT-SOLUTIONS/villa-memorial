"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { processDeviceImage } from "@/lib/device-upload";

/**
 * FamilyImageUploader — the one attach path for a family's own picture.
 *
 * The chosen file is downscaled in the browser (the shared `lib/device-upload.ts`
 * helper, max edge 1600), then posted to the family-scoped route
 * (`/api/family/images?slot=…`). The picture is private: it is never written to
 * the public media store and is read back only through the guarded, no-store
 * route. The account picture (`avatar`) and the Remembering portrait (`portrait`)
 * share this control.
 *
 * Every failure is the route's own readable sentence (wrong type, too large,
 * save failed), shown in an alert — never a silent no-op. On success the server
 * components refresh so the new picture paints.
 *
 * `personId` addresses a PORTRAIT to one loved one (the household may look after
 * two); the account-level avatar ignores it.
 */
export function FamilyImageUploader({
  slot,
  hasImage,
  label,
  hint,
  personId,
}: {
  slot: "avatar" | "portrait";
  hasImage: boolean;
  /** The visible words on the attach control. */
  label: string;
  /** One quiet line under the control. */
  hint?: string;
  /** The loved one a portrait belongs to. */
  personId?: string;
}) {
  const url = (() => {
    const params = new URLSearchParams({ slot });
    if (personId) params.set("person", personId);
    return `/api/family/images?${params.toString()}`;
  })();
  const router = useRouter();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const processed = await processDeviceImage(file);
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": processed.mime || processed.blob.type || "application/octet-stream" },
        body: processed.blob,
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "The picture could not be saved. Try again.");
      }
      URL.revokeObjectURL(processed.previewUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The picture could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error("The picture could not be removed. Try again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The picture could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dash-upload">
      {error ? (
        <p className="alert alert--danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dash-upload__actions">
        <label className="btn btn--secondary btn--sm">
          <ImagePlus size={15} aria-hidden="true" />
          {busy ? "Saving…" : label}
          <input
            ref={input}
            type="file"
            className="visually-hidden"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            disabled={busy}
            onChange={onFile}
          />
        </label>
        {hasImage ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={remove}
            disabled={busy}
          >
            <Trash2 size={15} aria-hidden="true" /> Remove
          </button>
        ) : null}
      </div>
      {hint ? <p className="dash-upload__hint">{hint}</p> : null}
    </div>
  );
}
