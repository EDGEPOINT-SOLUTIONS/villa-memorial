import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Inventory — Staff Portal" };

export default function inventoryPage() {
  return gatedSectionPage(
    "Inventory",
    "Commerce",
    ["catalog:write"],
    "read:Stock levels and catalog write endpoints are dev-authored (catalog-pricing serves reads today); this screen lands with the catalog-management contract.",
  );
}
