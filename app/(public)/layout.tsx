import type { Metadata } from "next";
import { PublicShell } from "@/components/ui/public-shell";
import { listLandingContent } from "@/lib/api-client/landing";
import "../globals.css";

export const metadata: Metadata = {
  title: "Villa Memorial",
};

// Chrome brand (wordmark + uploaded logo mark), the 24/7 line and the footer
// come from the same LandingPage content document the home renders — re-read
// per request so an admin logo edit never leaves interior pages stale (same
// rationale as app/page.tsx, which is force-dynamic for exactly this reason).
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const content = await listLandingContent();
  return <PublicShell content={content}>{children}</PublicShell>;
}
