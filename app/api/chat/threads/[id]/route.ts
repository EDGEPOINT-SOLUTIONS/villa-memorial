import { NextResponse } from "next/server";
import {
  chatErrorResponse,
  chatViewerOrNull,
  senderForViewer,
} from "@/app/api/chat/_guard";
import {
  getChatThread,
  markThreadDelivered,
  postChatMessage,
  type ChatOpenInput,
  type ChatUploadInput,
} from "@/lib/api-client/chat-store";
import {
  chatThreadIdFor,
  chatViewerCanAccess,
  type ChatThreadKind,
  type ChatViewer,
} from "@/lib/chat";

/**
 * BFF: one conversation.
 *
 *   GET  /api/chat/threads/:id → { thread }   (the office or the thread's own participant)
 *   POST /api/chat/threads/:id → 201 { thread }   multipart: `body` + `files[]`
 *
 * The GET records `delivered` for the OTHER side's messages — the app's own observation
 * that this side's screen read them, not a fabricated push. The POST is the send seam:
 * the store owns the message/attachment rules; this handler only reads the session,
 * checks the thread belongs to the caller, and parses the multipart body.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** The thread record to open when a participant is starting a brand-new conversation. */
function openFor(
  threadId: string,
  viewer: ChatViewer,
  actor: string,
): ChatOpenInput | null {
  if (viewer.role === "office") return null;
  const kind: ChatThreadKind = viewer.role;
  const participantId = viewer.role === "family" ? viewer.userId : viewer.agentId;
  if (chatThreadIdFor(kind, participantId) !== threadId) return null;
  return {
    kind,
    participant_id: participantId,
    participant_name: actor,
    subject: actor,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const caller = await chatViewerOrNull();
  if (!caller) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  try {
    let thread = await getChatThread(id);
    if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!chatViewerCanAccess(thread, caller.viewer)) {
      return NextResponse.json({ error: "that conversation is not yours" }, { status: 403 });
    }
    thread = (await markThreadDelivered(id, senderForViewer(caller.viewer))) ?? thread;
    return NextResponse.json({ thread });
  } catch (err) {
    return chatErrorResponse(err, "The conversation could not be read.");
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const caller = await chatViewerOrNull();
  if (!caller) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The message could not be read." }, { status: 400 });
  }

  const rawBody = form.get("body");
  const body = typeof rawBody === "string" ? rawBody : "";
  const files: ChatUploadInput[] = [];
  for (const entry of form.getAll("files")) {
    if (typeof entry === "string") continue;
    files.push({
      name: entry.name || "attachment",
      declaredMime: entry.type || null,
      bytes: Buffer.from(await entry.arrayBuffer()),
    });
  }

  try {
    const open = openFor(id, caller.viewer, caller.actor);
    const existing = await getChatThread(id);
    if (existing) {
      if (!chatViewerCanAccess(existing, caller.viewer)) {
        return NextResponse.json({ error: "that conversation is not yours" }, { status: 403 });
      }
    } else if (!open) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const thread = await postChatMessage({
      threadId: id,
      author: senderForViewer(caller.viewer),
      authorName: caller.actor,
      body,
      files,
      open: open ?? undefined,
    });
    return NextResponse.json({ thread }, { status: 201 });
  } catch (err) {
    return chatErrorResponse(err, "The message could not be sent.");
  }
}
