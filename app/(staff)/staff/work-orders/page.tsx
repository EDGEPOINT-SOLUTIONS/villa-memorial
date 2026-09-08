import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Work orders — Staff Portal" };

export default function workordersPage() {
  return gatedSectionPage(
    "Work orders",
    "Operations",
    ["property"],
    "read:Lot-maintenance work orders are a deferred property workflow; property-gis covers lots, reservations and sales today.",
  );
}
