"use client";

/**
 * Sign-in card — ONE premium sign-in for every portal door (admin / family /
 * agent). Layout is identical across doors; only the eyebrow, blurb and demo
 * persona chips differ.
 *
 * The server decides the destination from the account's scopes
 * (payload.redirectTo), so signing in with any account type from any door
 * lands you in the right portal. Door switcher below keeps all surfaces
 * connected; "back to public site" is one click.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { LOGO_SANCTUARIO } from "@/lib/media";
import { SIGN_IN_DOORS, SIGN_IN_TITLE, demoHintsEnabled, type SignInDoor } from "@/lib/sign-in";

// LOCAL-DEV-ONLY fallback: NEXT_PUBLIC_* is inlined into public JS at build time,
// so deployed builds never set this. Deployments enable one-click fill through the
// server-side DEMO_QUICK_FILL flag, resolved per request and passed in as the
// `quickFillPassword` prop (see lib/demo-quick-fill.ts) — never inlined here.
const INLINED_DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";
const HINTS_ENABLED = demoHintsEnabled();

type PersonaHint = { email: string; display_name: string };

export function SignInCard({
  door,
  personas,
  fallbackDestination,
  nextPath,
  quickFillPassword = null,
  heading,
  lead,
}: {
  door: SignInDoor;
  personas: PersonaHint[];
  fallbackDestination: string;
  /**
   * The same-portal path to return to after signing in (a gated inquiry's gate
   * page, for example). When omitted, the card reads `?next=` from the address
   * bar — the sign-in route validates it, so a crafted value is ignored.
   */
  nextPath?: string;
  /** Server-resolved per request; null keeps the buttons email-only. */
  quickFillPassword?: string | null;
  /** The page document's welcome heading, or the shipped default. */
  heading?: string;
  /** The page document's one supporting line. */
  lead?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const title = heading?.trim() || SIGN_IN_TITLE;
  const fillPassword = quickFillPassword ?? (INLINED_DEMO_PASSWORD || null);

  function quickFill(hint: PersonaHint) {
    setEmail(hint.email);
    if (fillPassword) setPassword(fillPassword);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // A gated inquiry's return path rides in the query string (`?next=`).
    // Read here, validated by the login route — never trusted as a URL.
    let returnTo = nextPath;
    if (!returnTo && typeof window !== "undefined") {
      returnTo = new URLSearchParams(window.location.search).get("next") ?? undefined;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, ...(returnTo ? { next: returnTo } : {}) }),
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
    <main className="signin-shell signin-shell--premium signin-shell--split" id="main">
      <div className="signin-card">
        <div className="signin-card__head">
          <h1 className="signin-card__title">{title}</h1>
          {lead ? <p className="signin-card__blurb">{lead}</p> : null}
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
            {submitting ? "Signing in…" : "Sign in"}
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

        <div className="signin-card__foot">
          {/* The three account doors (captain, 2026-09-30): the same page serves
              every role, so the roles are named here instead of in a headline. */}
          <nav className="signin-doors" aria-label="Account doors">
            {SIGN_IN_DOORS.map((entry) => (
              <Link
                key={entry.key}
                href={entry.href}
                aria-current={entry.key === door ? "page" : undefined}
                className={
                  entry.key === door ? "signin-doors__link signin-doors__link--current" : "signin-doors__link"
                }
              >
                {entry.label}
              </Link>
            ))}
          </nav>
          <p className="signin-card__back">
            <Link href="/">Back to Public site</Link>
          </p>
        </div>
      </div>

      {/* The left column is the mark with its one-line promise — the Facebook
          arrangement (captain, 2026-09-30): brand first, the form beside it. */}
      <div className="signin-brand">
        {/* eslint-disable-next-line @next/next/no-img-element -- the office's own mark */}
        <img className="signin-brand__mark" src={LOGO_SANCTUARIO} alt="" width={512} height={512} />
        <p className="signin-brand__wordmark">Villa Funeraria</p>
        <p className="signin-brand__tagline">Honoring every life with dignity and light.</p>
      </div>
    </main>
  );
}
