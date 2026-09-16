import { SignInCard } from "@/components/sign-in-card";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";

export const metadata = { title: "Family sign-in — Villa Memorial" };

// Per-request: the DEMO_QUICK_FILL quick-fill switch is server-only runtime config.
export const dynamic = "force-dynamic";

export default function FamilyLoginPage() {
  return (
    <SignInCard
      door="family"
      fallbackDestination="/client/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      personas={[{ email: "customer@vm.demo", display_name: "Cory Customer" }]}
    />
  );
}
