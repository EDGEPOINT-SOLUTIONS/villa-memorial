import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { PlannedAnswer } from "@/components/family/family-ui";

export const metadata = { title: "Ask for a visit — Villa Memorial" };

/**
 * Appointments — the approved redesign (docs/08-delivery/family-portal-design).
 * Scheduling has no family-facing contract yet, so this is the honest designed
 * state: one answer (call and we will agree a time), the rows that will live
 * here, and one calm note. Never a booking a human has not confirmed.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <PlannedAnswer
      kicker="Ask for a visit"
      headline="We can come to you, or you can come to us. Call and we will set a time."
      sub="A time is only real when a person from our office confirms it, and that is not connected to this page yet. So call us — we will agree a time and write it down."
      plannedTitle="What will be here"
      planned={[
        {
          label: "A time that is confirmed",
          detail: "What is agreed, where to go, and how to move it",
        },
        {
          label: "Ask for a visit",
          detail: "Who is coming, what you would like to talk about, and anything we should bring",
        },
        {
          label: "Past appointments",
          detail: "What was discussed, so you keep the thread",
        },
        {
          label: "Or just call",
          detail: "The office line answers every day, 7 in the morning to 9 at night",
        },
      ]}
      note="Family appointments are not switched on yet. Until they are, a phone call is the fastest way, and we write every request into our own log."
    />
  );
}
