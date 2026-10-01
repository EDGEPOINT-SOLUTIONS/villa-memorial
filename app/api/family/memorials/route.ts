import { NextResponse } from "next/server";
import { familySessionOrNull } from "@/lib/auth/family-session";
import { getFamilyHousehold } from "@/lib/api-client/family";
import { saveMemorialConsent } from "@/lib/api-client/memorial-store";
import { normalizeMemorialConsent } from "@/lib/memorials";

/**
 * BFF: the family's ONE memorial switch and its per-field choices.
 *
 *   POST /api/family/memorials
 *        body: { person_id, visible, show_photo, show_birth, show_death, show_lot }
 *        returns { consent, public_href }
 *
 * WHY IT EXISTS: the public memorial surface (`lib/api-client/memorials.ts`)
 * reads the consent store, so the family's choice must be written through the
 * server that owns it — never from browser state. The route requires a family
 * session, checks the person really belongs to the signed-in household (a
 * person id is not a capability), and writes through
 * `lib/api-client/memorial-store.ts`.
 *
 * No business rule lives here (web/AGENTS.md rule 1): the booleans are the
 * input, the saved record is the only output. `public_href` is the link the
 * family can open — present only when the switch is on.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  person_id?: unknown;
  visible?: unknown;
  show_photo?: unknown;
  show_birth?: unknown;
  show_death?: unknown;
  show_lot?: unknown;
};

export async function POST(request: Request) {
  const session = await familySessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "The choice could not be read." }, { status: 400 });
  }

  const personId = typeof body.person_id === "string" ? body.person_id.trim() : "";
  if (!personId) {
    return NextResponse.json({ error: "Choose a loved one." }, { status: 422 });
  }

  // The person must be one of THIS account's loved ones — an id alone is never
  // enough to write a memorial.
  let household;
  try {
    household = await getFamilyHousehold();
  } catch {
    return NextResponse.json(
      { error: "Your family record could not be read just now. Call the office." },
      { status: 500 },
    );
  }
  if (!household.people.some((person) => person.id === personId)) {
    return NextResponse.json({ error: "That loved one is not on this account." }, { status: 404 });
  }

  const consent = normalizeMemorialConsent({
    visible: body.visible,
    show_photo: body.show_photo,
    show_birth: body.show_birth,
    show_death: body.show_death,
    show_lot: body.show_lot,
  });

  try {
    const record = await saveMemorialConsent({
      personId,
      ownerUserId: session.userId,
      consent,
      actor: session.email,
    });
    return NextResponse.json(
      {
        consent: {
          visible: record.visible,
          show_photo: record.show_photo,
          show_birth: record.show_birth,
          show_death: record.show_death,
          show_lot: record.show_lot,
        },
        public_href: record.visible ? `/memorials/${encodeURIComponent(record.person_id)}` : null,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "We could not save that choice just now. Try again." },
      { status: 500 },
    );
  }
}
