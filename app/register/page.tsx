import type { Metadata } from "next";
import { RegisterCard } from "./register-card";

export const metadata: Metadata = {
  title: "Create your account — Villa Memorial",
};

/**
 * Public self-service registration. The form is fully wired UX-side, but the
 * account-provisioning endpoint is NOT frozen yet (identity-access user
 * creation requires staff scopes today). Submission therefore completes with
 * an honest demo success state — see PR notes ("Blocked on dev").
 */
export default function RegisterPage() {
  return (
    <main className="auth-shell" id="main">
      <RegisterCard />
    </main>
  );
}
