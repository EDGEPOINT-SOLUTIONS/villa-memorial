import type { Metadata } from "next";
import { EntranceHandoff } from "@/components/public/home-intro";
import { listLandingContent } from "@/lib/api-client/landing";
import { BRAND_NAME } from "@/lib/brand";

/**
 * `/entrance` — the home's cloud-sign greeting as its OWN blank page (office,
 * inbox 054): nothing on it but the animation (this route sits outside the
 * `(public)` group, so no header, footer or phone bar).
 *
 * The home stays the real, indexable page at `/`; this route carries noindex
 * so a search engine or a link preview never shows the greeting. The home gate
 * sends an unseen visitor here, the sign plays, and the visitor is handed to
 * `/` with the history entry REPLACED — Back from the home never returns to
 * the animation. It plays once per session; a returning visitor gets the home
 * directly.
 *
 * The welcome line is marquee copy from the home content document (`home.intro`)
 * and is edited in the home editor; this page only reads it.
 */
export const metadata: Metadata = {
  title: `Welcome — ${BRAND_NAME}`,
  description: undefined,
  robots: { index: false, follow: false },
};

// Reads the content store per request, like the home: an office edit to the
// two lines must be what the next arrival sees.
export const dynamic = "force-dynamic";

export default async function EntrancePage() {
  const { home } = await listLandingContent();
  return <EntranceHandoff welcome={home.intro.welcome} />;
}
