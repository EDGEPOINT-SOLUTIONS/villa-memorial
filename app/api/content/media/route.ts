import { NextResponse } from "next/server";
import { requireCatalogScope } from "@/app/api/catalog/_guard";
import {
  MEDIA_UPLOAD_MAX_BYTES,
  mediaExtensionFor,
  storeUploadedMedia,
} from "@/lib/media-upload";

/**
 * BFF: the editor's image upload (P4 of data/villa-pdp-cms-plan/report.md §3.3).
 *
 *   POST /api/content/media — body: the already-downscaled image BYTES with the
 *                             image's content type. Returns { url: "/api/media/<id>.<ext>" }.
 *
 * The scope is the existing content-save seam (`catalog:write`, reused
 * provisionally — no new scope is invented, matching app/api/content/*). The
 * browser has already downscaled the picture (lib/device-upload.ts: max edge
 * 1600, JPEG q0.86 / PNG alpha), so this route only validates the type and size
 * and writes the bytes under `MEDIA_UPLOAD_DIR` (server-only lib/media-upload.ts).
 * No business rule lives in the handler (web/AGENTS.md rule 1): the bytes are the
 * input, the returned path is the only output, and the document store's own
 * referenced-bytes guard is what proves a saved reference exists.
 */
export async function POST(request: Request) {
  const auth = await requireCatalogScope(["catalog:write"]);
  if (!auth.ok) return auth.response;

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MEDIA_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is too large to upload. Choose a smaller file." },
      { status: 413 },
    );
  }

  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!mediaExtensionFor(mime)) {
    return NextResponse.json(
      { error: "Upload an image (PNG, JPEG, WebP, GIF or SVG)." },
      { status: 415 },
    );
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await request.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "The upload could not be read." }, { status: 400 });
  }
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "The upload was empty." }, { status: 422 });
  }
  if (bytes.byteLength > MEDIA_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is too large to upload. Choose a smaller file." },
      { status: 413 },
    );
  }

  try {
    const { url } = await storeUploadedMedia(bytes, mime);
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The image could not be saved." }, { status: 500 });
  }
}
