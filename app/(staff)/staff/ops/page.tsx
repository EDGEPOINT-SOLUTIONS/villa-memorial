import { redirect } from "next/navigation";

export const metadata = { title: "Cases board — Admin Portal" };

/**
 * The Operations board is FOLDED INTO CASES (captain, 2026-10-02 follow-up):
 * "these functions the same as Cases page right? This should be so simple."
 *
 * It had no job the case list did not: both read the same case records and offered
 * the same two writes. Rather than keep a second page that could drift, `/staff/ops`
 * now sends the reader to the Cases board view, which is the SAME surface as the
 * list (`/staff/cases`), one click apart. The board rendering and its two writes live
 * in `../cases/page.tsx` and `components/ops-board-view.tsx`; this route keeps every
 * old link alive instead of 404ing.
 */
export default function OpsPage() {
  redirect("/staff/cases?view=board");
}
