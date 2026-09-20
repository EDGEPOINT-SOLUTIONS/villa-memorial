import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ServiceGuidePage } from "@/components/villa/service-guide-page";
import { loadServiceGuideView } from "@/lib/api-client/content-entries";

// Reads the service entry per request — a staff edit is what the NEXT visitor
// sees, never a build-time snapshot (same rule as /services).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const view = await loadServiceGuideView("death-at-home");
  return pageMetadata({
    title: `${view?.title ?? "Death at home"} — Villa Memorial`,
    description:
      view?.summary ??
      "When a death happens at home, one call starts everything: our 24/7 line, the retrieval and the first steps, taken with you and at your pace.",
    path: "/services/death-at-home",
  });
}

export default async function Page() {
  return ServiceGuidePage({ entryKey: "death-at-home" });
}
