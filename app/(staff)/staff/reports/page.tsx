import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Reports — Staff Portal" };

/** Villa's Reports page — the dashboard already aggregates live clients; richer
 * report screens arrive with reporting-analytics (unbuilt). Scope reused
 * provisionally from finance/ops until a reporting scope freezes. */
export default function ReportsPage() {
  return gatedSectionPage(
    "Reports",
    "Overview",
    ["accounting:read", "billing:read"],
    "The dashboard aggregates today's data; report builder/schedules await the reporting-analytics service (dev-authored).",
  );
}
