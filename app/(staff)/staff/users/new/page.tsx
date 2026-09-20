import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "Invite user — Admin Portal" };

export default function Page() {
  return gatedSectionPage("Invite user", "Administration", ["identity:users:manage"], "user provisioning API is dev-authored (identity-access handles auth today)");
}
