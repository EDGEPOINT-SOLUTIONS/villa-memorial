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
 *
 * Public-minimal identity pass (lane 4): the page renders on the SAME
 * `signin-shell` / `signin-card` grammar as the three sign-in doors, so the
 * identity surface is one design and cannot drift door to door.
 */
export default function RegisterPage() {
  return (
    <main className="signin-shell signin-shell--premium" id="main">
      <RegisterCard />
    </main>
  );
}
