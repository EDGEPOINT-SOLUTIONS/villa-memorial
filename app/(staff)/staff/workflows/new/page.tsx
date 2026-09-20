import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "New workflow — Admin Portal" };

export default function Page() {
  return gatedSectionPage("New workflow", "Administration", ["tenancy:tenants:manage"], "the workflow/config engine is a deferred platform layer");
}
