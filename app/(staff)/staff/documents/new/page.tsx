import { gatedSectionPage } from "../../gated-section";

export const metadata = { title: "New document — Staff Portal" };

/** Document GENERATION already works contextually (e.g. official receipts on
 * payment, purchase agreements from a lot). A standalone composer page arrives
 * with template authoring (dev-authored). */
export default function DocumentNewPage() {
  return gatedSectionPage(
    "New document",
    "Operations",
    ["documents:write"],
    "Generation is available contextually today (receipts on payment, agreements from lots); a standalone document composer arrives with template authoring.",
  );
}
