import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Store & content — Staff Portal" };

export default function StorePage() {
  return gatedSectionPage(
    "Store & content",
    "Administration",
    ["catalog:write"],
    "The tenant's storefront catalogue + marketing content editor is a CMS-shaped surface; catalog:write is gated here provisionally until the content contract freezes. Reads already show on the public storefront.",
  );
}
