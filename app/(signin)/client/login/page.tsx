import { SignInCard } from "@/components/sign-in-card";
import { FAMILY_HELP } from "@/lib/family/contact";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";

export const metadata = { title: "Family sign-in — Villa Memorial" };

// Per-request: the DEMO_QUICK_FILL quick-fill switch is server-only runtime config.
export const dynamic = "force-dynamic";

/**
 * Family sign-in — the approved redesign (docs/08-delivery/family-portal-design,
 * page 01). The shared sign-in card stays one design for every door; the client
 * layout's `.fv-signin-scope` turns it sky-blue and larger-type for the family,
 * and the card grows the office number for a reader who does not get in.
 */
export default function FamilyLoginPage() {
  return (
    <SignInCard
      door="family"
      fallbackDestination="/client/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      personas={[{ email: "customer@vm.demo", display_name: "Cory Customer" }]}
      helpNote={
        <>
          Need help? Call <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a> — someone answers{" "}
          {FAMILY_HELP.hours.replace("daily", "every day")}.
        </>
      }
    />
  );
}
