import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "Plan — Staff Portal" };

export default function PlanDetailPage() {
  return gatedSectionPage(
    "Plan",
    "Commerce",
    ["catalog:read"],
    "Plan detail/management awaits the catalog write API; the public plan page is live at /plans.",
  );
}
