import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getMemorialConsent } from "@/lib/api-client/memorial-store";
import { readFamilyImage } from "@/lib/family-image-store";

/**
 * The PUBLIC portrait of a published memorial.
 *
 *   GET /api/memorials/<person id>/photo[?v=<version>]
 *
 * A family portrait lives in the private family store and is normally served
 * only to the session that owns it. When the family switches a memorial on AND
 * allows the photograph, that ONE picture is published here — nothing else moves,
 * and the moment the family turns the photograph (or the memorial) off this route
 * answers 404 again.
 *
 * The version comes from the store's `updated_at` and the response is
 * `no-store`, so a direct hit never outlives the family's decision. A missing
 * picture, an unknown id and a private/hidden memorial all answer the same 404.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () => new NextResponse("Not found", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let personId = id;
  try {
    personId = decodeURIComponent(id).trim();
  } catch {
    return NOT_FOUND();
  }
  if (!personId) return NOT_FOUND();

  const consent = await getMemorialConsent(personId).catch(() => null);
  if (!consent || !consent.visible || !consent.show_photo || !consent.owner_user_id) {
    return NOT_FOUND();
  }

  const stored = await readFamilyImage(consent.owner_user_id, "portrait", personId).catch(
    () => null,
  );
  if (!stored) return NOT_FOUND();

  const stream = Readable.toWeb(
    createReadStream(stored.path),
  ) as unknown as ReadableStream<Uint8Array>;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "content-type": stored.mime,
      "content-length": String(stored.size),
      "cache-control": "public, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
    },
  });
}
