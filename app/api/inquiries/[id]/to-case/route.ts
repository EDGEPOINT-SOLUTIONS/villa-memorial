import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { crmLiveModeEnabled } from "@/lib/api-client/crm";
import { listFixtureInquiries } from "@/lib/api-client/inquiry-store";
import { createCase, listCases, type CaseIntakeInput } from "@/lib/api-client/operations";
import { requireCasesScope } from "@/app/api/cases/_guard";

/**
 * BFF: POST /api/inquiries/:id/to-case — the inquiry that is done becomes a case.
 *
 * WHY IT IS HERE. The captain's follow-up: an inquiry that has run its course offers
 * one decision, "Send to case", and the case then carries the person AND the inquiry
 * together — one record, no re-typing. This route builds the case's intake from the
 * enquiry's own recorded fields (name, phone, email, the request's words) and stamps
 * the case with `inquiry_reference`, which is the single link both screens read.
 *
 * It is IDEMPOTENT: an enquiry already carried into a case returns that case instead
 * of opening a second one. The call is a write, so it gates on `cases:write` (UX only;
 * funeral-cases re-checks on the token).
 *
 * Live mode refuses rather than quietly writing to a local journal: crm-families is
 * unbuilt, so no contract names an enquiry read here and the fixture is the only
 * source. The screen names that gap; it never fabricates a live case.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireCasesScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  if (crmLiveModeEnabled()) {
    return NextResponse.json({ error: "CRM_NOT_WIRED" }, { status: 503 });
  }

  const { id } = await params;
  try {
    const inquiry = (await listFixtureInquiries()).find(
      (row) => row.id === id || row.reference === id,
    );
    if (!inquiry) {
      return NextResponse.json({ error: "inquiry not found" }, { status: 404 });
    }

    // A case is an arrangement with a person, so it needs a number the office can
    // call (captain, 2026-10-03). This is the ONLY hard contact requirement: a
    // plan/lot enquiry may become a prospect without one, and the office adds it
    // on the enquiry before opening the case.
    if (!inquiry.person.phone.trim()) {
      return NextResponse.json(
        { error: "Add a contact number for this enquiry before opening a case." },
        { status: 422 },
      );
    }

    // One record, no duplicate entry: a second send returns the case already carrying
    // this enquiry rather than opening a twin.
    const existing = (await listCases()).find(
      (kase) => kase.inquiry_reference === inquiry.reference,
    );
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const intake: CaseIntakeInput = {
      deceased_name: "Pending intake",
      assigned_coordinator: inquiry.assigned_to,
      client_name: inquiry.person.full_name,
      client_contact: inquiry.person.phone || null,
      client_email: inquiry.person.email || null,
      inquiry_reference: inquiry.reference,
    };
    const kase = await createCase(intake);
    return NextResponse.json(kase, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "could not open the case" }, { status: 502 });
  }
}
