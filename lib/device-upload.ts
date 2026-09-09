/**
 * Device image upload helper — client-only. The staff Landing Page editor has
 * NO backend upload service (front-end CMS seam, zero backend by design), so a
 * "real device upload" stores the chosen image as a data URL inside the same
 * content document the editor already persists through the BFF save route —
 * the fixture store the public home renders from. Nothing leaves the browser
 * until Publish, exactly like every other edit on that screen.
 *
 * Large photos are downscaled on a canvas before they become data URLs so a
 * publish payload never balloons (max edge 1600px; PNG kept when the source
 * had transparency, JPEG for plain photos). Animated GIFs and SVG pass through
 * untouched (canvas would flatten them).
 */
export const DEVICE_UPLOAD_LIMIT_BYTES = 12 * 1024 * 1024; // 12 MB raw file cap
export const DEVICE_UPLOAD_MAX_EDGE = 1600; // longest side, in px, after downscale
const DEVICE_UPLOAD_JPEG_QUALITY = 0.86;

export type ProcessedDeviceImage = {
  /** Ready-to-store image source (data URL). */
  dataUrl: string;
  width: number;
  height: number;
  mime: string;
};

/** Human-readable file size (for hints/errors). */
export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The chosen file does not look like a readable image."));
    img.src = src;
  });
}

/**
 * Reads + (when sensible) downscales a chosen device image into a data URL.
 * Throws a readable Error when the file cannot be used.
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

  const raw = await readAsDataUrl(file);

  // Keep animated GIFs and vector SVG as-is (canvas would flatten/lose them).
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    const probe = await loadImage(raw);
    return { dataUrl: raw, width: probe.naturalWidth, height: probe.naturalHeight, mime: file.type };
  }

  const img = await loadImage(raw);
  const { naturalWidth: width, naturalHeight: height } = img;
  const longest = Math.max(width, height);
  if (longest <= DEVICE_UPLOAD_MAX_EDGE) {
    return { dataUrl: raw, width, height, mime: file.type };
  }

  // Downscale so published documents stay light.
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
  const dataUrl = canvas.toDataURL(mime, hasAlpha ? undefined : DEVICE_UPLOAD_JPEG_QUALITY);
  return { dataUrl, width: outW, height: outH, mime };
}
