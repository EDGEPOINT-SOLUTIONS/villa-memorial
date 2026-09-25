import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import {
  mediaContentType,
  mediaFilePath,
  statStoredMedia,
  storedMediaStream,
} from "@/lib/media-upload";

/**
 * BFF: the media read route (P4 of data/villa-pdp-cms-plan/report.md §3.3).
 *
 *   GET /api/media/<id>.<ext> — streams the file the upload route stored under
 *                               `MEDIA_UPLOAD_DIR`, with long cache headers.
 *
 * The path is one flat file name; anything with a separator or `..` is a 404
 * before it reaches the disk (lib/media-upload.ts `mediaFilePath`). A missing
 * file is also a 404 — the referenced-bytes guard is what stops a document from
 * ever naming one.
 */
export const runtime = "nodejs";

const IMMUTABLE_ONE_YEAR = "public, max-age=31536000, immutable";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const name = segments.join("/");
  // A stored file name is one flat segment; a nested path is never ours.
  if (!mediaFilePath(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const stat = await statStoredMedia(name);
  if (!stat) {
    return new NextResponse("Not found", { status: 404 });
  }
  const contentType = mediaContentType(name) ?? "application/octet-stream";

  const stream = Readable.toWeb(
    storedMediaStream(stat.path),
  ) as unknown as ReadableStream<Uint8Array>;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-length": String(stat.size),
      "cache-control": IMMUTABLE_ONE_YEAR,
      "x-content-type-options": "nosniff",
    },
  });
}
