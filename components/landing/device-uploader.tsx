"use client";

/**
 * DeviceUploader — the "Upload from this device" source in the editor's image
 * picker (MediaPicker). Staff choose a local image file (click the zone or
 * drop a file onto it); it is read + downscaled client-side (lib/device-upload)
 * into a data URL and previewed here before it is committed to the document.
 * No backend involved — the picked source is stored through the exact same
 * fixture-store save path as every other editor edit.
 */
import { useRef, useState } from "react";
import { Check, FileImage, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEVICE_UPLOAD_LIMIT_BYTES,
  formatUploadBytes,
  processDeviceImage,
  type ProcessedDeviceImage,
} from "@/lib/device-upload";

type Phase =
  | { step: "idle" }
  | { step: "reading"; name: string }
  | { step: "preview"; name: string; image: ProcessedDeviceImage }
  | { step: "error"; message: string };

export function DeviceUploader({ onPick }: { onPick: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [picked, setPicked] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setPicked(false);
    setPhase({ step: "reading", name: file.name });
    try {
      const image = await processDeviceImage(file);
      setPhase({ step: "preview", name: file.name, image });
    } catch (err) {
      setPhase({
        step: "error",
        message: err instanceof Error ? err.message : "That image could not be prepared.",
      });
    }
  }

  function reset() {
    setPhase({ step: "idle" });
    setPicked(false);
    if (inputRef.current) inputRef.current.value = "";
  }

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

      {phase.step === "preview" && phase.image ? (
        <div className="ed-upload__preview">
          <div className="ed-upload__preview-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- staff's own uploaded preview */}
            <img src={phase.image.dataUrl} alt={`Preview of ${phase.name}`} />
          </div>
          <div className="ed-upload__preview-meta">
            <p className="ed-upload__file">
              <FileImage size={15} aria-hidden="true" />
              <span>
                <strong>{phase.name}</strong>
                <br />
                <span className="ed-upload__file-sub">
                  {phase.image.width} × {phase.image.height}px
                  {phase.image.mime === "image/png" ? " · PNG keeps transparency" : ""}
                  {" · "}
                  {Math.round(phase.image.dataUrl.length * 0.75 / 1024)} KB prepared
                </span>
              </span>
            </p>
            <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
              {picked ? (
                <span className="ed-upload__done">
                  <Check size={15} aria-hidden="true" /> Added
                </span>
              ) : (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    setPicked(true);
                    onPick(phase.image!.dataUrl);
                  }}
                >
                  <Check size={14} aria-hidden="true" /> Use this image
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={reset}>
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
              Photos over 1600px are resized automatically. The image is stored in the same
              fixture store as every other edit on this page — no backend needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default DeviceUploader;
