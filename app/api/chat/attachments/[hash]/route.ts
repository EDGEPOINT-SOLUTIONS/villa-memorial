import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { chatViewerOrNull } from "@/app/api/chat/_guard";
import { findChatAttachment } from "@/lib/api-client/chat-store";
import {
  chatAttachmentStream,
  isChatAttachmentId,
  statChatAttachment,
} from "@/lib/chat-attachment-store";

/**
 * BFF: serve one chat attachment.
 *
 *   GET /api/chat/attachments/:sha256 — the bytes, only to a viewer who can open a thread
 *   that references them.
 *
 * The address is content, not capability: a guessed hash is still refused unless a thread
 * the caller may read carries it (`findChatAttachment`). The content type comes from the
 * message's own metadata row; images render inline, everything else downloads.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params;
  if (!isChatAttachmentId(hash)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const caller = await chatViewerOrNull();
  if (!caller) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const attachment = await findChatAttachment(hash, caller.viewer);
  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }
  const stat = await statChatAttachment(hash);
  if (!stat) {
    return new NextResponse("Not found", { status: 404 });
  }

  const stream = Readable.toWeb(
    chatAttachmentStream(stat.path),
  ) as unknown as ReadableStream<Uint8Array>;
  const disposition = attachment.mime.startsWith("image/") ? "inline" : "attachment";
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "content-type": attachment.mime,
      "content-length": String(stat.size),
      "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "cache-control": "private, max-age=60",
      "x-content-type-options": "nosniff",
    },
  });
}
