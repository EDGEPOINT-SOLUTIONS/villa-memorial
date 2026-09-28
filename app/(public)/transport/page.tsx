import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ServiceGuidePage } from "@/components/villa/service-guide-page";
import { loadServiceGuideView } from "@/lib/api-client/content-entries";

// Reads the service entry per request — a staff edit is what the NEXT visitor
// sees, never a build-time snapshot (same rule as /services).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const view = await loadServiceGuideView("transport");
  return pageMetadata({
    title: `${view?.title ?? "Transport"} — Villa Funeraria`,
    description:
      view?.summary ??
      "Dignified transport coordinated by our team — retrieval and delivery within the first 25 km of every Villa Memorial Plan.",
    path: "/transport",
  });
}

export default async function Page() {
  return ServiceGuidePage({ entryKey: "transport" });
}
