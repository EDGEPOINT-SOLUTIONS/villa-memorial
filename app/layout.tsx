import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo";
import "./globals.css";

/**
 * Root metadata: the site origin (metadataBase) plus the fallback title and
 * description for any route that does not set its own. Public routes add
 * canonical/OpenGraph through `pageMetadata()` (lib/seo.ts); staff, family and
 * agent pages are session surfaces and deliberately carry no public SEO tags.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: `${SITE_NAME} — Memorial & funeral services, Isabela City, Basilan`,
  description: SITE_DESCRIPTION,
  icons: { icon: "/media/logo-sanctuario.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
