import { SignInCard } from "@/components/sign-in-card";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";
import { heroOr } from "@/lib/page-hero";
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
 *
 * The welcome heading and its one supporting line are a page document (admin
 * plan wave 1), so the office edits them in Pages & content → Login; the card
 * falls back to the shipped copy when the document is unreadable.
 */
export default async function LoginPage() {
  const loginPage = await getPageDocument("login").catch(() => null);
  const hero = heroOr(loginPage, {
    eyebrow: "Sign in",
    headline: "Welcome back",
    lead: "Sign in to your portal.",
  });

  return (
    <SignInCard
      door="staff"
      fallbackDestination="/staff/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      heading={hero.headline}
      lead={hero.lead}
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
