import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "New catalog item — Staff Portal" };

export default function Page() {
  return gatedSectionPage("New catalog item", "Commerce", ["catalog:write"], "catalog creation needs the dev-authored catalog write API — reads are live today");
}
