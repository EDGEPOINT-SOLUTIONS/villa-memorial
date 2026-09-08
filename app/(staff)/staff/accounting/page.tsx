import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Accounting — Staff Portal" };

export default function AccountingPage() {
  return gatedSectionPage(
    "Accounting",
    "Finance",
    ["accounting:read"],
    "The accounting service exists and the posting-rule contract is frozen, but the staff-facing accounting API (ledger/trial balance screens) is dev-authored. Read-only screens will land after that freeze.",
  );
}
