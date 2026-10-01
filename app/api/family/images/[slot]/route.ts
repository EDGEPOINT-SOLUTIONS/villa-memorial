import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { familySessionOrNull } from "@/lib/auth/family-session";
import { isFamilyImageSlot, readFamilyImage } from "@/lib/family-image-store";

/**
 * BFF: the guarded read of a family's own picture.
 *
 *   GET /api/family/images/avatar|portrait[?person=<loved_ones.id>]
 *
 * The ONLY way a family picture is served. The route requires a family session
 * and reads the picture belonging to THAT session's user; a missing picture, an
 * unknown slot and a stranger's request all answer the same 404, so the route
 * never confirms whose picture exists. The response is `private, no-store` — no
 * shared cache and no long-lived browser cache — and `nosniff`, so the bytes are
 * never treated as anything but the image they are.
 *
 * This is deliberately NOT `/api/media/[...path]` (public, one-year immutable
 * cache, staff-written) — see `lib/family-image-store.ts` for the reasoning.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () => new NextResponse("Not found", { status: 404 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const session = await familySessionOrNull();
  if (!session) return NOT_FOUND();

  const { slot } = await params;
  if (!isFamilyImageSlot(slot)) return NOT_FOUND();
  const personId =
    slot === "portrait" ? new URL(request.url).searchParams.get("person") ?? undefined : undefined;

  const stored = await readFamilyImage(session.userId, slot, personId);
  if (!stored) return NOT_FOUND();

  const stream = Readable.toWeb(
    createReadStream(stored.path),
  ) as unknown as ReadableStream<Uint8Array>;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "content-type": stored.mime,
      "content-length": String(stored.size),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
