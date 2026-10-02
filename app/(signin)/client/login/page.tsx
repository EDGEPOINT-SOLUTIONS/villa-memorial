import { SignInCard } from "@/components/sign-in-card";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";
import { demoHintsEnabled } from "@/lib/sign-in";

export const metadata = { title: "Sign in — Villa Funeraria" };

// Per-request: the DEMO_QUICK_FILL quick-fill switch is server-only runtime config.
export const dynamic = "force-dynamic";

/**
 * The family door — the SAME sign-in page as every other door (captain,
 * 2026-09-30): one card, one set of words, one editorial panel. Only the theme
 * scope differs (`(signin)` turns the card sky-blue for the family), and the
 * account's scopes decide which portal the sign-in lands in.
 *
 * A gated plan/lot inquiry arrives here with `?next=` (the `/client/ask` page it
 * was asking about). The card reads that query string and the login route returns
 * the family to it after a valid sign-in — the round trip never loses what the
 * family was asking about. The route validates the path, so a crafted link can
 * never turn the door into an open redirect.
 */
export default function FamilyLoginPage() {
  return (
    <SignInCard
      door="family"
      fallbackDestination="/client/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      personas={
        demoHintsEnabled() ? [{ email: "customer@vm.demo", display_name: "Cory Customer" }] : []
      }
    />
  );
}
