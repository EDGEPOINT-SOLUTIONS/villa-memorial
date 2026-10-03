import { redirect } from "next/navigation";

export const metadata = { title: "Sales pipeline — Admin Portal" };

/**
 * The Sales pipeline route, retired to the ONE pipeline (captain, 2026-10-03).
 *
 * The audit found two records for one story: this page read the recorded
 * `lead-records.json` file while the `Prospects` board read the durable agent
 * journal the convert action actually writes — so a worked enquiry appeared on
 * Prospects and never here. The captain's decision: "the Prospects board is the
 * pipeline; retire the duplicate read so one record shows in one place, and put
 * the pipeline in the left navigation."
 *
 * The route stays alive (old links still resolve) and lands on the one board.
 */
export default function PipelinePage(): never {
  redirect("/staff/prospects");
}
