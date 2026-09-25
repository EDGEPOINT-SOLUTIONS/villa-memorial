/**
 * Device image helper — client-only (P4 of data/villa-pdp-cms-plan/report.md
 * §3.3). The staff editors attach a photo from this device through
 * `components/landing/device-uploader.tsx`: the browser downscales it here
 * (max edge 1600px; PNG kept when the source had transparency, JPEG q0.86 for
 * plain photos; animated GIFs and SVG pass through untouched because a canvas
 * would flatten them), then uploads the prepared bytes to `POST /api/content/media`
 * and the document stores the short `/api/media/<id>.<ext>` path it returns —
 * never a base64 `data:` URL, so an unlimited gallery cannot inflate every read.
 */
export const DEVICE_UPLOAD_LIMIT_BYTES = 12 * 1024 * 1024; // 12 MB raw file cap
export const DEVICE_UPLOAD_MAX_EDGE = 1600; // longest side, in px, after downscale
const DEVICE_UPLOAD_JPEG_QUALITY = 0.86;

export const DEVICE_UPLOAD_MEDIA_ROUTE = "/api/content/media";

export type ProcessedDeviceImage = {
  /** The prepared bytes to upload (the original for GIF/SVG, a downscaled JPEG/PNG otherwise). */
  blob: Blob;
  /** A local object URL for the preview — the caller revokes it when done. */
  previewUrl: string;
  width: number;
  height: number;
  mime: string;
  /** The prepared byte count (for the picker hint). */
  bytes: number;
};

/** Human-readable file size (for hints/errors). */
export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The chosen file does not look like a readable image."));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This browser can't prepare the image."))),
      mime,
      quality,
    );
  });
}

/**
 * Reads + (when sensible) downscales a chosen device image into prepared bytes
 * plus a local preview URL. Throws a readable Error when the file cannot be used.
 */
export async function processDeviceImage(file: File): Promise<ProcessedDeviceImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`“${file.name}” is not an image file.`);
  }
  if (file.size > DEVICE_UPLOAD_LIMIT_BYTES) {
    throw new Error(
      `“${file.name}” is ${formatUploadBytes(file.size)} — please choose an image under ${formatUploadBytes(DEVICE_UPLOAD_LIMIT_BYTES)}.`,
    );
  }

  const raw = URL.createObjectURL(file);
  try {
    // Keep animated GIFs and vector SVG as-is (canvas would flatten/lose them).
    if (file.type === "image/gif" || file.type === "image/svg+xml") {
      const probe = await loadImage(raw);
      return {
        blob: file,
        previewUrl: raw,
        width: probe.naturalWidth,
        height: probe.naturalHeight,
        mime: file.type,
        bytes: file.size,
      };
    }

    const img = await loadImage(raw);
    const { naturalWidth: width, naturalHeight: height } = img;
    const longest = Math.max(width, height);
    if (longest <= DEVICE_UPLOAD_MAX_EDGE) {
      return { blob: file, previewUrl: raw, width, height, mime: file.type, bytes: file.size };
    }

    // Downscale so a published gallery stays light.
    const scale = DEVICE_UPLOAD_MAX_EDGE / longest;
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    const hasAlpha = file.type === "image/png" || file.type === "image/webp";
    const mime = hasAlpha ? "image/png" : "image/jpeg";

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't prepare the image.");
    if (!hasAlpha) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(img, 0, 0, outW, outH);
    const blob = await canvasToBlob(canvas, mime, hasAlpha ? undefined : DEVICE_UPLOAD_JPEG_QUALITY);
    URL.revokeObjectURL(raw);
    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      width: outW,
      height: outH,
      mime,
      bytes: blob.size,
    };
  } catch (err) {
    URL.revokeObjectURL(raw);
    throw err;
  }
}

/** Uploads prepared bytes and returns the stored `/api/media/<id>.<ext>` path. */
export async function uploadDeviceImage(blob: Blob, mime: string): Promise<{ url: string }> {
  let response: Response;
  try {
    response = await fetch(DEVICE_UPLOAD_MEDIA_ROUTE, {
      method: "POST",
      headers: { "content-type": mime || blob.type || "application/octet-stream" },
      body: blob,
    });
  } catch {
    throw new Error("The image could not be uploaded. Check your connection and try again.");
  }
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "The image could not be uploaded. Try again.");
  }
  return { url: payload.url };
}
