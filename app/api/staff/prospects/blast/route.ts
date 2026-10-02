import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { listAgentProspects } from "@/lib/api-client/agent";
import { recordProspectBlast } from "@/lib/api-client/agent-store";
import { readProspectBlast } from "@/lib/crm/prospect-actions";
import { errorResponse, firstError, readJsonBody, requireStaffScope } from "../../_guard";

/**
 * BFF: POST /api/staff/prospects/blast — the office's one-message email blast.
 *
 * HONEST ABOUT THE TRANSPORT. The platform's notification service (P4) has no
 * contract and the app has no outward mail path, so the server cannot send mail.
 * What it CAN do honestly is record the blast — subject, body, recipients, author
 * and time — on the durable demo journal, which is the office's outbox, and hand
 * the message to the browser, which opens the office's own mail client (the
 * `mailto:` the screen builds). Nothing here claims delivery: the recorded state
 * is `queued`, and the screen says the notification service is not connected.
 *
 * The rules (a subject, a body, at least one selected prospect that exists and has
 * an address) live in the pure `lib/crm/prospect-actions.ts`; this file reads the
 * body, asks for a verdict and persists through the store.
 */
export async function POST(request: Request) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  try {
    const prospects = await listAgentProspects();
    const verdict = readProspectBlast(
      { subject: record.subject, message: record.message, prospectIds: record.prospectIds },
      prospects,
    );
    if (!verdict.ok) {
      return NextResponse.json(
        { error: firstError(verdict.errors, "The email could not be sent."), fieldErrors: verdict.errors },
        { status: 422 },
      );
    }

    const blast = await recordProspectBlast({
      blast: {
        id: `blast-${randomUUID()}`,
        subject: verdict.subject,
        message: verdict.message,
        channel: "email",
        prospect_ids: verdict.prospect_ids,
        recipients: verdict.recipients,
        by: auth.actor,
      },
    });
    return NextResponse.json({ blast }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "the email could not be sent");
  }
}
