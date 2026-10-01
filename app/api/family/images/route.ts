import { NextResponse } from "next/server";
import { familySessionOrNull } from "@/lib/auth/family-session";
import { MEDIA_UPLOAD_MAX_BYTES, mediaExtensionFor } from "@/lib/media-upload";
import {
  FAMILY_IMAGE_SLOT_LABEL,
  familyImageUrl,
  isFamilyImageSlot,
  removeFamilyImage,
  writeFamilyImage,
} from "@/lib/family-image-store";

/**
 * BFF: the family's own picture upload — private, family-scoped.
 *
 *   POST /api/family/images?slot=avatar|portrait[&person=<loved_ones.id>]
 *        body: the already-downscaled image BYTES, content-type = the image type.
 *        returns { url, updated_at }
 *   DELETE /api/family/images?slot=avatar|portrait[&person=<loved_ones.id>]
 *        — remove the family's picture.
 *
 * `person` addresses a PORTRAIT to one loved one (the household may look after
 * two); it is ignored for the account-level avatar.
 *
 * WHY IT EXISTS: the editor's upload route is staff-scoped and its read route is
 * public, so it can never carry a family's private picture. This route requires a
 * family session, validates the same types and the same size ceiling the editor's
 * route does, and writes through `lib/family-image-store.ts`; the bytes are read
 * back only by the guarded `GET /api/family/images/[slot]`. No business rule lives
 * here (web/AGENTS.md rule 1): the bytes are the input, the stored version is the
 * only output.
 *
 * The client downscales first (lib/device-upload.ts), so a phone photo does not
 * arrive at 12 MB; the size ceiling still bounds a hand-crafted request.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await familySessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const slot = url.searchParams.get("slot") ?? "";
  if (!isFamilyImageSlot(slot)) {
    return NextResponse.json({ error: "unknown picture slot" }, { status: 400 });
  }
  const personId = slot === "portrait" ? url.searchParams.get("person") ?? undefined : undefined;

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
    const { updated_at } = await writeFamilyImage(session.userId, slot, bytes, mime, personId);
    return NextResponse.json(
      { url: familyImageUrl(slot, updated_at, personId), updated_at },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: `We could not save your ${FAMILY_IMAGE_SLOT_LABEL[slot]} just now. Try again.` },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await familySessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const url = new URL(request.url);
  const slot = url.searchParams.get("slot") ?? "";
  if (!isFamilyImageSlot(slot)) {
    return NextResponse.json({ error: "unknown picture slot" }, { status: 400 });
  }
  const personId = slot === "portrait" ? url.searchParams.get("person") ?? undefined : undefined;
  const removed = await removeFamilyImage(session.userId, slot, personId);
  return NextResponse.json({ removed }, { status: 200 });
}
