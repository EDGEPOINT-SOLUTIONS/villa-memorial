import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Field, Input, Alert } from "../components/ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (login(email, password)) {
      navigate("/dashboard");
    } else {
      setError(true);
    }
  }

  return (
    <div className="auth-shell">
      <a className="skip-link" href="#signin-form">
        Skip to form
      </a>
      <form className="auth-card" id="signin-form" onSubmit={onSubmit}>
        <div className="auth-card__brand">
          <div className="auth-card__brand-mark">In-Memoriam</div>
          <div className="auth-card__brand-sub">Operating platform · demo build</div>
        </div>

        {error ? (
          <Alert tone="danger">That email or password isn't recognized.</Alert>
        ) : null}

        <div className="stack" style={{ marginTop: error ? "var(--space-4)" : 0 }}>
          <Field label="Email address" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              placeholder="you@company.ph"
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" block>
            Sign in
          </Button>
        </div>

        <div className="auth-card__footer">
          Demo credentials — <strong>admin@gmail.com</strong> / <strong>admin123</strong>
        </div>
      </form>
    </div>
  );
}
