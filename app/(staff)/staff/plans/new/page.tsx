import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "New plan — Staff Portal" };

export default function Page() {
  return gatedSectionPage("New plan", "Commerce", ["catalog:write"], "plan/package creation needs the catalog write API (dev-authored)");
}
