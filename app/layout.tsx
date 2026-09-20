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
      <head>
        {/* The product's own typeface (styles/fonts.css) — preload the latin
            subset used above the fold so the voice paints on the first pass;
            latin-ext (the peso sign among it) streams behind. */}
        <link
          rel="preload"
          href="/fonts/inter/inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
