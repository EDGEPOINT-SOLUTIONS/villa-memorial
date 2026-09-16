import { SignInCard } from "@/components/sign-in-card";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";

export const metadata = { title: "Sign in — Villa Memorial" };

// The demo quick-fill switch (DEMO_QUICK_FILL) is a server-only runtime env var,
// so the door must render per request instead of being prerendered at build time.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <SignInCard
      door="staff"
      fallbackDestination="/staff/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      personas={[
        { email: "admin@vm.demo", display_name: "Ada Admin" },
        { email: "staff@vm.demo", display_name: "Sam Staff" },
      ]}
    />
  );
}
