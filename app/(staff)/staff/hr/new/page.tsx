import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "New employee — Admin Portal" };

export default function Page() {
  return gatedSectionPage("New employee", "Operations", ["hr:write"], "the hr service is not built yet (directory is fixture-backed); employee creation lands with it");
}
