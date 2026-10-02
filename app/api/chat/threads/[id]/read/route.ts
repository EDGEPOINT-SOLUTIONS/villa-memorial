import { NextResponse } from "next/server";
import {
  chatErrorResponse,
  chatViewerOrNull,
  senderForViewer,
} from "@/app/api/chat/_guard";
import { getChatThread, markThreadRead } from "@/lib/api-client/chat-store";
import { chatViewerCanAccess } from "@/lib/chat";

/**
 * BFF: mark one conversation read.
 *
 *   POST /api/chat/threads/:id/read → { thread }
 *
 * The office or the thread's own participant. Records `read` for the OTHER side's
 * messages — the app's own observation that this screen is open, never a push. It is a
 * separate route from the GET because a poll must not silently mark things read; the
 * conversation client calls it on mount and when the tab regains focus.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const caller = await chatViewerOrNull();
  if (!caller) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  try {
    const thread = await getChatThread(id);
    if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!chatViewerCanAccess(thread, caller.viewer)) {
      return NextResponse.json({ error: "that conversation is not yours" }, { status: 403 });
    }
    const updated =
      (await markThreadRead(id, senderForViewer(caller.viewer))) ?? thread;
    return NextResponse.json({ thread: updated });
  } catch (err) {
    return chatErrorResponse(err, "The conversation could not be marked read.");
  }
}
