import type { Metadata } from "next";
import { PublicShell } from "@/components/ui/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND_NAME } from "@/lib/brand";
import { listLandingContent } from "@/lib/api-client/landing";
import "../globals.css";

// Fallback metadata for any public page that does not set its own (the two
// client-rendered transaction pages import their own noindex layout).
// Deliberately NO canonical URL: no page should inherit a canonical it does not
// own — every content page supplies its own through pageMetadata().
export const metadata: Metadata = {
  title: `${BRAND_NAME} — Memorial & funeral services, Isabela City, Basilan`,
  description:
    "Funeral services, memorial plans and garden lots at Villa Memorial Park — the first memorial park in Basilan, Isabela City.",
};

// Chrome brand (wordmark + uploaded logo mark), the 24/7 line and the footer
// come from the same LandingPage content document the home renders — re-read
// per request so an admin logo edit never leaves interior pages stale (same
// rationale as app/page.tsx, which is force-dynamic for exactly this reason).
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const content = await listLandingContent();
  return (
    <PublicShell content={content}>
      {/* LocalBusiness + WebSite structured data on every public page, read from
          the same content document the chrome uses (lib/seo.ts). */}
      <JsonLd content={content} />
      {children}
    </PublicShell>
  );
}
