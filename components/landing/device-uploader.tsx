"use client";

/**
 * DeviceUploader — the "Upload from this device" source in the editor's image
 * picker (MediaPicker). Staff choose a local image file (click the zone or drop
 * a file onto it); it is read + downscaled client-side (lib/device-upload) and
 * previewed here, then uploaded to `POST /api/content/media` and the picker
 * receives the stored `/api/media/<id>.<ext>` path — the document never embeds a
 * base64 data URL (P4 of data/villa-pdp-cms-plan/report.md §3.3).
 */
import { useEffect, useRef, useState } from "react";
import { Check, FileImage, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEVICE_UPLOAD_LIMIT_BYTES,
  formatUploadBytes,
  processDeviceImage,
  uploadDeviceImage,
  type ProcessedDeviceImage,
} from "@/lib/device-upload";

type Phase =
  | { step: "idle" }
  | { step: "reading"; name: string }
  | { step: "preview"; name: string; image: ProcessedDeviceImage }
  | { step: "uploading"; name: string; image: ProcessedDeviceImage }
  | { step: "error"; message: string };

export function DeviceUploader({ onPick }: { onPick: (src: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [picked, setPicked] = useState(false);

  function releasePreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }

  useEffect(() => releasePreview, []);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setPicked(false);
    releasePreview();
    setPhase({ step: "reading", name: file.name });
    try {
      const image = await processDeviceImage(file);
      previewUrlRef.current = image.previewUrl;
      setPhase({ step: "preview", name: file.name, image });
    } catch (err) {
      setPhase({
        step: "error",
        message: err instanceof Error ? err.message : "That image could not be prepared.",
      });
    }
  }

  async function commit() {
    if (phase.step !== "preview") return;
    const current = phase;
    setPhase({ step: "uploading", name: current.name, image: current.image });
    try {
      const { url } = await uploadDeviceImage(current.image.blob, current.image.mime);
      setPicked(true);
      onPick(url);
    } catch (err) {
      setPhase({
        step: "error",
        message: err instanceof Error ? err.message : "The image could not be uploaded.",
      });
    }
  }

  function reset() {
    releasePreview();
    setPhase({ step: "idle" });
    setPicked(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewImage = phase.step === "preview" || phase.step === "uploading" ? phase.image : null;
  const previewName = phase.step === "preview" || phase.step === "uploading" ? phase.name : "";

  return (
    <div className="ed-upload">
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Choose an image from this device"
      />

      {previewImage ? (
        <div className="ed-upload__preview">
          <div className="ed-upload__preview-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- staff's own uploaded preview */}
            <img src={previewImage.previewUrl} alt={`Preview of ${previewName || "image"}`} />
          </div>
          <div className="ed-upload__preview-meta">
            <p className="ed-upload__file">
              <FileImage size={15} aria-hidden="true" />
              <span>
                <strong>{previewName}</strong>
                <br />
                <span className="ed-upload__file-sub">
                  {previewImage.width} × {previewImage.height}px
                  {previewImage.mime === "image/png" ? " · PNG keeps transparency" : ""}
                  {" · "}
                  {formatUploadBytes(previewImage.bytes)} prepared
                </span>
              </span>
            </p>
            <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
              {phase.step === "uploading" ? (
                <span className="ed-upload__done" role="status">
                  <Loader2 size={15} aria-hidden="true" /> Uploading…
                </span>
              ) : picked ? (
                <span className="ed-upload__done">
                  <Check size={15} aria-hidden="true" /> Added
                </span>
              ) : (
                <Button variant="accent" size="sm" onClick={commit}>
                  <Check size={14} aria-hidden="true" /> Use this image
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={reset} disabled={phase.step === "uploading"}>
                <RefreshCw size={14} aria-hidden="true" /> Choose another
              </Button>
            </div>
          </div>
        </div>
      ) : phase.step === "reading" ? (
        <div className="ed-upload__busy" role="status">
          <Loader2 size={22} aria-hidden="true" />
          <span>
            Preparing <strong>{phase.name}</strong>…
          </span>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className={`ed-upload__zone${dragging ? " ed-upload__zone--over" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud size={26} aria-hidden="true" />
            <span className="ed-upload__zone-title">Drop an image here, or browse</span>
            <span className="ed-upload__zone-sub">
              PNG · JPEG · WebP · GIF · SVG — up to {formatUploadBytes(DEVICE_UPLOAD_LIMIT_BYTES)}
            </span>
            <span className="btn btn--primary btn--sm">Choose from device</span>
          </button>
          {phase.step === "error" ? (
            <p className="ed-upload__error" role="alert">
              {phase.message}
            </p>
          ) : (
            <p className="ed-hint" style={{ marginTop: "var(--space-2)" }}>
              Photos over 1600px are resized automatically, then uploaded to the office&apos;s media
              store. The page keeps a short link to the picture — never the whole file.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default DeviceUploader;
