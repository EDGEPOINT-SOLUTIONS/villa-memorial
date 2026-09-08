import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Orders — Staff Portal" };

export default function OrdersPage() {
  return gatedSectionPage("Orders", "Commerce", ["orders:read"]);
}
