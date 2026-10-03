import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAgentProspect } from "@/lib/api-client/agent";
import { listOfficeAgentNames } from "@/lib/api-client/agent-roster";
import { recordProspectAssignment, recordProspectCapture, recordStageMove } from "@/lib/api-client/agent-store";
import {
  getFixtureInquiry,
  recordInquiryContact,
  recordInquiryStatus,
} from "@/lib/api-client/inquiry-store";
import { readProspectAssignment, readProspectIntake } from "@/lib/crm/prospect-actions";
import { readInquiryStatusMove } from "@/lib/inquiry-intake";
import { errorResponse, firstError, readJsonBody, requireStaffScope } from "../../_guard";

/**
 * BFF: POST /api/staff/inquiries/:id — the office's two moves on one enquiry.
 *
 *   · `{ action: "status", status }` advances the enquiry along the office's own
 *     New → Contacted → Converted line; and
 *   · `{ action: "convert", need, agent?, note? }` turns it into a prospect in ONE
 *     step: a prospect is recorded on the shared demo journal (so it reaches the
 *     agent pipeline), the enquiry becomes Converted, and an optional assignee
 *     gets the durable notice.
 *
 * Both are demo-local — no crm-families contract exists — and both read the same
 * stores the boards read, so the enquiry board and the Prospects screen cannot
 * disagree. The rules live in the pure `lib/crm/prospect-actions.ts` and
 * `lib/inquiry-intake.ts`.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const inquiry = await getFixtureInquiry(id);
  if (!inquiry) {
    return NextResponse.json({ error: "no such enquiry" }, { status: 404 });
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  try {
    if (record.action === "status") {
      const verdict = readInquiryStatusMove({ currentStatus: inquiry.status, status: record.status });
      if (!verdict.ok) {
        return NextResponse.json(
          { error: firstError(verdict.errors, "The enquiry status could not be moved."), fieldErrors: verdict.errors },
          { status: 422 },
        );
      }
      const updated = await recordInquiryStatus({
        inquiryId: id,
        status: verdict.status,
        by: auth.actor,
      });
      return NextResponse.json({ inquiry: updated }, { status: 201 });
    }

    if (record.action === "contact") {
      // The office adds or corrects the number the family left (2026-10-03): the
      // plan/lot gate is optional, so a record may reach the office with no phone.
      const phone = typeof record.phone === "string" ? record.phone.trim() : "";
      if (!phone) {
        return NextResponse.json({ error: "Enter the contact number." }, { status: 422 });
      }
      if (phone.length > 40) {
        return NextResponse.json({ error: "That contact number is too long." }, { status: 422 });
      }
      const updated = await recordInquiryContact({
        inquiryId: id,
        phone,
        by: auth.actor,
      });
      return NextResponse.json({ inquiry: updated }, { status: 201 });
    }

    if (record.action === "convert") {
      if (inquiry.status === "converted") {
        return NextResponse.json({ error: "that enquiry is already a prospect" }, { status: 422 });
      }
      const verdict = readProspectIntake({
        name: inquiry.person.full_name,
        phone: inquiry.person.phone,
        email: inquiry.person.email,
        source: inquiry.source,
        need: record.need ?? "unsure",
        want: inquiry.topic,
        note: inquiry.message,
      });
      if (!verdict.ok) {
        return NextResponse.json(
          { error: firstError(verdict.errors, "The enquiry could not become a prospect."), fieldErrors: verdict.errors },
          { status: 422 },
        );
      }

      const capture = await recordProspectCapture({
        capture: { id: `prospect-${randomUUID()}`, ...verdict.value, captured_by: auth.actor },
      });
      // An enquiry already worked (Contacted/Qualified) becomes a Contacted
      // prospect; one still New stays New.
      if (inquiry.status === "contacted" || inquiry.status === "qualified") {
        await recordStageMove({
          prospectId: capture.id,
          stage: "contacted",
          by: auth.actor,
          note: `Converted from enquiry ${inquiry.reference}.`,
        });
      }

      if (typeof record.agent === "string" && record.agent.trim().length > 0) {
        const assigned = readProspectAssignment({
          agent: record.agent,
          note: typeof record.note === "string" ? record.note : "",
          agents: await listOfficeAgentNames(),
        });
        if (!assigned.ok) {
          return NextResponse.json(
            { error: firstError(assigned.errors, "The prospect was created but could not be assigned."), fieldErrors: assigned.errors },
            { status: 422 },
          );
        }
        await recordProspectAssignment({
          prospectId: capture.id,
          agent: assigned.agent,
          by: auth.actor,
          note: assigned.note,
        });
      }

      const updated = await recordInquiryStatus({
        inquiryId: id,
        status: "converted",
        by: auth.actor,
      });
      const created = await getAgentProspect(capture.id);
      return NextResponse.json({ inquiry: updated, prospect: created?.prospect ?? null }, { status: 201 });
    }

    return NextResponse.json({ error: 'action must be "status" or "convert"' }, { status: 422 });
  } catch (err) {
    return errorResponse(err, "the enquiry could not be saved");
  }
}
