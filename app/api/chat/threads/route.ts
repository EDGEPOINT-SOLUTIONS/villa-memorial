import { NextResponse } from "next/server";
import { chatErrorResponse, requireOfficeChat } from "@/app/api/chat/_guard";
import { listChatThreads } from "@/lib/api-client/chat-store";

/**
 * BFF: the Admin Inbox's thread list.
 *
 *   GET /api/chat/threads → { threads, unread }
 *
 * The office reads every conversation; the page is server-rendered from the same store,
 * and this route is what the Inbox badge / a refresh can call. Needs `cases:read`
 * (provisional, like the CRM seam). No rule lives here.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOfficeChat(["cases:read"]);
  if (!auth.ok) return auth.response;
  try {
    const threads = await listChatThreads();
    return NextResponse.json({
      threads,
      unread: threads.reduce((sum, thread) => sum + thread.unread_for_office, 0),
    });
  } catch (err) {
    return chatErrorResponse(err, "The conversation list could not be read.");
  }
}
