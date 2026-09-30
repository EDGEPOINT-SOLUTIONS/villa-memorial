import { SignInCard } from "@/components/sign-in-card";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";
import { demoHintsEnabled } from "@/lib/sign-in";

export const metadata = { title: "Sign in — Villa Funeraria" };

// The demo quick-fill switch (DEMO_QUICK_FILL) is a server-only runtime env var,
// so the door must render per request instead of being prerendered at build time.
export const dynamic = "force-dynamic";

/**
 * The sign-in page — ONE page for every door (captain, 2026-09-30): the admin
 * door, and the family and agent doors render the same card. The split puts the
 * form on the left and the Villa Memorial mark on the right; the foot names the
 * three doors and points back to the public site, and the account's own scopes
 * decide which portal a sign-in lands in.
 */
export default function LoginPage() {
  return (
    <SignInCard
      door="staff"
      fallbackDestination="/staff/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      personas={
        demoHintsEnabled()
          ? [
              { email: "admin@vm.demo", display_name: "Ada Admin" },
              { email: "staff@vm.demo", display_name: "Sam Staff" },
            ]
          : []
      }
    />
  );
}
