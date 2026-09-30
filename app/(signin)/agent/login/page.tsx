import { SignInCard } from "@/components/sign-in-card";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";
import { demoHintsEnabled } from "@/lib/sign-in";

export const metadata = { title: "Sign in — Villa Funeraria" };

// Per-request: the DEMO_QUICK_FILL quick-fill switch is server-only runtime config.
export const dynamic = "force-dynamic";

/** The agent door — the SAME sign-in page as every other door (captain, 2026-09-30). */
export default function AgentLoginPage() {
  return (
    <SignInCard
      door="agent"
      fallbackDestination="/agent/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      personas={
        demoHintsEnabled() ? [{ email: "agent@vm.demo", display_name: "Alex Agent" }] : []
      }
    />
  );
}
