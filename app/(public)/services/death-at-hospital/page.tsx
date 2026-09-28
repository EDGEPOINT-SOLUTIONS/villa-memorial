import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ServiceGuidePage } from "@/components/villa/service-guide-page";
import { loadServiceGuideView } from "@/lib/api-client/content-entries";

// Reads the service entry per request — a staff edit is what the NEXT visitor
// sees, never a build-time snapshot (same rule as /services).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const view = await loadServiceGuideView("death-at-hospital");
  return pageMetadata({
    title: `${view?.title ?? "Death at hospital"} — Villa Funeraria`,
    description:
      view?.summary ??
      "When a death happens at the hospital, one call covers the coordination, the documents and the transport — day or night, with a coordinator beside you.",
    path: "/services/death-at-hospital",
  });
}

export default async function Page() {
  return ServiceGuidePage({ entryKey: "death-at-hospital" });
}
