import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import {
  PlatformRequirementList,
  PlatformSequence,
  PlatformServiceNote,
} from "@/components/platform/platform-ui";
import {
  PLATFORM_SURFACE_ROBOTS,
  TENANT_ONBOARDING_STEPS,
  TENANT_SIGN_UP_REQUIREMENTS,
} from "@/lib/platform-admin";
import { SignUpFlow } from "./sign-up-flow";

export const metadata: Metadata = {
  title: "Tenant sign-up",
  description:
    "What onboarding a new funeral business would need: the business, its subdomain and its first administrator — a designed flow that creates nothing.",
  robots: PLATFORM_SURFACE_ROBOTS,
};

// The flow is a client component and the requirement lists name the platform's
// unbuilt work; render per request so nothing here is a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * Tenant sign-up (PRD screen inventory "Tenant Sign-Up", classification
 * `docs/02-architecture/platform-administration.md`).
 *
 * A DESIGNED FLOW ON RECORDED DATA; IT CREATES NOTHING. The two steps capture
 * what the classification says provisioning needs — the business and its
 * subdomain, then the first administrator (created with the owner role in the
 * same transaction) — and the review submits nowhere, because no provisioning
 * endpoint exists. The screen then names what the platform must provide and the
 * onboarding sequence that follows provisioning (Configure → Import → Train →
 * Go live), which the business's owner runs, not the platform.
 */
export default function PlatformSignUpPage() {
  return (
    <div className="platform-page">
      <header className="platform-hero">
        <p className="platform-hero__eyebrow">Tenant sign-up</p>
        <h1>Tenant sign-up</h1>
        <p className="platform-hero__lead">
          Onboarding a new funeral business onto the platform.
        </p>
      </header>

      <div className="platform-grid">
        <div className="platform-stack">
          <p className="platform-card-note">
            A designed flow on recorded data — it creates nothing.
          </p>
          <SignUpFlow />
          <PlatformSequence
            id="tenant-onboarding"
            heading="What follows provisioning"
            items={TENANT_ONBOARDING_STEPS}
          />
        </div>

        <aside className="platform-stack">
          <PlatformServiceNote />
          <PlatformRequirementList
            id="tenant-sign-up-requirements"
            heading="What the platform must provide"
            items={TENANT_SIGN_UP_REQUIREMENTS}
          />
          <Card header={<h2 id="sign-up-creates">What sign-up creates</h2>}>
            <ul className="platform-reqs" aria-labelledby="sign-up-creates">
              <li>
                <strong>Tenant</strong>
                <span>One business with its own name and subdomain.</span>
              </li>
              <li>
                <strong>First administrator</strong>
                <span>One account with the owner role — the rank above admin.</span>
              </li>
            </ul>
            <p className="platform-card-note">
              Owners alone configure the account; admin accounts run operations.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
