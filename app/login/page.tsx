import { SignInCard } from "@/components/sign-in-card";
import { LoginEditorial, hasEditorialContent } from "@/components/content/login-editorial";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";
import { demoHintsEnabled } from "@/lib/sign-in";

export const metadata = { title: "Sign in — Villa Funeraria" };

// The demo quick-fill switch (DEMO_QUICK_FILL) is a server-only runtime env var,
// so the door must render per request instead of being prerendered at build time.
export const dynamic = "force-dynamic";

/**
 * The staff sign-in door. The sign-in card is unchanged; the page adds the
 * office's editorial panel — the greeting and the news, promotions, events and
 * invitations it publishes in Pages & content (the `login` page document).
 * Every word comes from that document; the panel is a server-rendered slot
 * handed to the client sign-in card. An unreadable or empty document leaves the
 * classic centred card rather than a hole, and the sign-in behaviour is unchanged.
 */
export default async function LoginPage() {
  let editorial = null;
  try {
    const document = await getPageDocument("login");
    if (document && hasEditorialContent(document)) {
      editorial = <LoginEditorial document={document} mediaBaseUrl={mediaPublicBaseUrl()} />;
    }
  } catch {
    // The panel is presentation only: an unreadable content store must never
    // break sign-in.
    editorial = null;
  }

  return (
    <SignInCard
      door="staff"
      fallbackDestination="/staff/dashboard"
      quickFillPassword={demoQuickFillPassword()}
      editorial={editorial}
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
