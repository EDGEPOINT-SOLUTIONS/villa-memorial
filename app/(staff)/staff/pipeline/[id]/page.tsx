import { redirect } from "next/navigation";

export const metadata = { title: "Sales pipeline — Admin Portal" };

/**
 * The retired per-lead record (captain, 2026-10-03). It read the same duplicate
 * `lead-records.json` file the pipeline page did; the one pipeline is the
 * Prospects board, where the record opens in its detail panel. The route stays
 * alive and lands there so no old link 404s.
 */
export default function LeadRecordPage(): never {
  redirect("/staff/prospects");
}
