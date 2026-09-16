"use client";

/**
 * Sign-in card — ONE premium sign-in for every portal door (staff / family /
 * agent). Layout is identical across doors; only the eyebrow, blurb and demo
 * persona chips differ.
 *
 * The server decides the destination from the account's scopes
 * (payload.redirectTo), so signing in with any account type from any door
 * lands you in the right portal. Door switcher below keeps all surfaces
 * connected; "back to public site" is one click.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PortalSwitch } from "@/components/portal-switch";
import { SIGN_IN_BLURBS, type SignInDoor } from "@/lib/sign-in";

// LOCAL-DEV-ONLY fallback: NEXT_PUBLIC_* is inlined into public JS at build time,
// so deployed builds never set this. Deployments enable one-click fill through the
// server-side DEMO_QUICK_FILL flag, resolved per request and passed in as the
// `quickFillPassword` prop (see lib/demo-quick-fill.ts) — never inlined here.
const INLINED_DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";
const HINTS_ENABLED = process.env.NEXT_PUBLIC_DEMO_HINTS !== "0";

type PersonaHint = { email: string; display_name: string };

export function SignInCard({
  door,
  personas,
  fallbackDestination,
  quickFillPassword = null,
}: {
  door: SignInDoor;
  personas: PersonaHint[];
  fallbackDestination: string;
  /** Server-resolved per request; null keeps the buttons email-only. */
  quickFillPassword?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { title, blurb } = SIGN_IN_BLURBS[door];
  const fillPassword = quickFillPassword ?? (INLINED_DEMO_PASSWORD || null);

  function quickFill(hint: PersonaHint) {
    setEmail(hint.email);
    if (fillPassword) setPassword(fillPassword);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let message = "Sign-in is unavailable right now. Please try again.";
        if (res.status === 401) {
          message = "Invalid email or password. Try a demo persona below.";
        }
        setError(message);
        setSubmitting(false);
        return;
      }
      const payload = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
      router.replace(payload?.redirectTo ?? fallbackDestination);
    } catch {
      setError("Sign-in is unavailable right now. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="signin-shell">
      <div className="signin-card">
        <div className="signin-card__head">
          <p className="signin-card__eyebrow">{SIGN_IN_BLURBS[door].eyebrow}</p>
          <h1 className="signin-card__title">{title}</h1>
          <p className="signin-card__blurb">{blurb}</p>
        </div>

        {error ? (
          <div style={{ marginBottom: "var(--space-4)" }}>
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate>
          <Field label="Email address" htmlFor={`${door}-email`}>
            <input
              id={`${door}-email`}
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={submitting}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor={`${door}-password`}>
            <input
              id={`${door}-password`}
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              disabled={submitting}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={submitting} className="btn--block">
            {submitting ? "Signing in…" : `Sign in to the ${door} portal`}
          </Button>
        </form>

        {HINTS_ENABLED ? (
          <div className="signin-card__hints">
            <p className="text-sm text-muted">
              {fillPassword ? "Demo account:" : "Demo account (fill email):"}
            </p>
            <div className="row row--wrap">
              {personas.map((p) => (
                <Button
                  key={p.email}
                  variant="secondary"
                  size="sm"
                  onClick={() => quickFill(p)}
                >
                  {p.display_name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-sm text-muted signin-card__route-note">
          Signing in with a different account type opens that account&rsquo;s portal.
        </p>

        <div className="signin-card__foot">
          <PortalSwitch current={door} />
        </div>
      </div>
    </div>
  );
}
