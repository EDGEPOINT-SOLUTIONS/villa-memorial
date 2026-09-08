import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "New customer — Staff Portal" };

export default function Page() {
  return gatedSectionPage("New customer", "Relationships", ["cases:read"], "customer records write to crm-families, which is not built yet — same provisional scope reuse as the Customers list");
}
