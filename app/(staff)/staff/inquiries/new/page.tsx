import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "New inquiry — Admin Portal" };

export default function Page() {
  return gatedSectionPage("New inquiry", "Relationships", ["cases:read"], "inquiry capture persists to crm-families, which is not built yet — the list is fixture-backed today");
}
