import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Sales pipeline — Staff Portal" };

export default function pipelinePage() {
  return gatedSectionPage(
    "Sales pipeline",
    "Relationships",
    ["cases:read"],
    "Leads and pipeline run on crm-families, which is unbuilt — same provisional scope reuse as Customers/Inquiries until that contract freezes.",
  );
}
