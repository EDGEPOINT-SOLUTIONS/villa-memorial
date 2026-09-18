import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  PlatformRequirementList,
  PlatformServiceNote,
} from "@/components/platform/platform-ui";
import { PLATFORM_AUTH_REQUIREMENTS, PLATFORM_SURFACE_ROBOTS } from "@/lib/platform-admin";
import { PlatformSignInCard } from "./platform-sign-in-card";

export const metadata: Metadata = {
  title: "Platform sign-in",
  description:
    "The platform team's own door: what a platform-operator identity requires, and why it is not the funeral product's sign-in.",
  robots: PLATFORM_SURFACE_ROBOTS,
};

// The card is a client component and the requirement list may gain a live
// branch when a platform identity service freezes; render per request so no
// build-time snapshot is ever stale.
export const dynamic = "force-dynamic";

/**
 * Platform sign-in — the operator door (PRD screen inventory "Platform Login",
 * classification `docs/02-architecture/platform-administration.md`).
 *
 * DISTINCT FROM THE PRODUCT'S OWN SIGN-IN BY DESIGN. The shared SignInCard
 * serves the staff/family/agent doors; this page does not reuse it, because
 * the platform's door answers a different question: platform admins are a
 * separate identity type outside every tenant, they inherit no tenant RBAC,
 * and the first one is seeded — never self-service.
 *
 * HONEST STATE: no platform identity service exists in this build, so the form
 * validates the entry and then says plainly that nothing was sent. The
 * requirements list names what the platform must provide; the side card opens
 * the operator screens directly for review (there is no session to pass).
 */
export default function PlatformSignInPage() {
  return (
    <div className="platform-page">
      <header className="platform-hero">
        <p className="platform-hero__eyebrow">Platform access</p>
        <h1>Platform sign-in</h1>
        <p className="platform-hero__lead">
          The platform team&rsquo;s own door — not the funeral product.
        </p>
      </header>

      <div className="platform-grid">
        <div className="platform-stack">
          <PlatformSignInCard />
          <PlatformRequirementList
            id="platform-auth-requirements"
            heading="What the platform must provide"
            items={PLATFORM_AUTH_REQUIREMENTS}
          />
        </div>

        <aside className="platform-stack">
          <PlatformServiceNote />
          <Card header={<h2 id="behind-the-door">Behind this door</h2>}>
            <p className="platform-card-note">
              No platform session exists in this build, so the operator screens open directly
              for review.
            </p>
            <ul className="platform-links">
              <li>
                <Link href="/platform/tenants">Tenant management</Link>
                <span>Every funeral business on the platform and its state.</span>
              </li>
              <li>
                <Link href="/platform/sign-up">Tenant sign-up</Link>
                <span>Onboarding a new funeral business onto the platform.</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
