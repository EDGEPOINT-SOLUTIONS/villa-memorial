import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Pricing rules — Staff Portal" };

export default function pricingPage() {
  return gatedSectionPage(
    "Pricing rules",
    "Commerce",
    ["catalog:write"],
    "read:Price-rule configuration is a dev-authored catalog contract; the frozen surface today is catalog reads and order pricing.",
  );
}
