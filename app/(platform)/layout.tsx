import type { Metadata } from "next";
import Link from "next/link";
import {
  PLATFORM_SCREENS,
  PLATFORM_SURFACE_EYEBROW,
  PLATFORM_SURFACE_NOTE,
  PLATFORM_SURFACE_ROBOTS,
} from "@/lib/platform-admin";

/**
 * Platform operator surface — the chrome for every /platform route.
 *
 * THE MARKER IS WORDING, NOT DECORATION: the bar says what this area is and
 * who it is not for, in the surface's own two lines (lib/platform-admin.ts).
 * A family or office member who lands here reads why this is not their page
 * and where their own sign-in is (the footer link).
 *
 * THE CHROME IS THE PLATFORM'S OWN: `platform-*` classes only, never the
 * public anchored header, the staff app shell, the agent/family portal frame
 * or the sign-in card. No product menu links into this group (pinned by
 * tests/unit/platform-screens.test.tsx) and the head rule below closes it to
 * crawlers; app/robots.ts closes the prefix independently.
 */
export const metadata: Metadata = {
  title: {
    default: "Platform operator surface — Villa Memorial",
    template: "%s — Villa Memorial platform",
  },
  description:
    "The platform's operator surface: tenant management, platform sign-in and tenant sign-up. For platform operators only — not the funeral product.",
  robots: PLATFORM_SURFACE_ROBOTS,
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="platform-shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="platform-bar">
        <div className="platform-bar__inner">
          <div className="platform-bar__marker">
            <p className="platform-bar__eyebrow">{PLATFORM_SURFACE_EYEBROW}</p>
            <p className="platform-bar__note">{PLATFORM_SURFACE_NOTE}</p>
          </div>
          <nav className="platform-nav" aria-label="Platform screens">
            {PLATFORM_SCREENS.map((screen) => (
              <Link key={screen.href} className="platform-nav__link" href={screen.href}>
                {screen.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="platform-main" id="main">
        {children}
      </main>
      <footer className="platform-foot">
        <div className="platform-foot__inner">
          <p className="platform-foot__line">
            Looking for your own account? The funeral product&rsquo;s sign-in is here.
          </p>
          <Link className="platform-foot__link" href="/login">
            Open the product sign-in
          </Link>
        </div>
      </footer>
    </div>
  );
}
