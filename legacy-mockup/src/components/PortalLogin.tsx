// Reusable demo portal login (agent / family). Cosmetic-only credentials.

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, Input, Alert } from "./ui";

export function PortalLogin({
  portal,
  title,
  email,
  password,
  destination,
}: {
  portal: "Agent" | "Family";
  title: string;
  email: string;
  password: string;
  destination: string;
}) {
  const navigate = useNavigate();
  const [inEmail, setInEmail] = useState("");
  const [inPassword, setInPassword] = useState("");
  const [error, setError] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inEmail.trim().toLowerCase() === email && inPassword === password) {
      navigate(destination);
    } else {
      setError(true);
    }
  }

  return (
    <div className="portal-login-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-card__brand">
          <div className="auth-card__brand-mark">{portal} Portal</div>
          <div className="auth-card__brand-sub">{title}</div>
        </div>

        {error ? (
          <Alert tone="danger">That email or password isn't recognized.</Alert>
        ) : null}

        <div className="stack" style={{ marginTop: error ? "var(--space-4)" : 0 }}>
          <Field label="Email address" htmlFor={`${portal}-email`}>
            <Input
              id={`${portal}-email`}
              type="email"
              value={inEmail}
              onChange={(e) => {
                setInEmail(e.target.value);
                setError(false);
              }}
            />
          </Field>
          <Field label="Password" htmlFor={`${portal}-password`}>
            <Input
              id={`${portal}-password`}
              type="password"
              value={inPassword}
              onChange={(e) => {
                setInPassword(e.target.value);
                setError(false);
              }}
            />
          </Field>
          <Button type="submit" block>
            Sign in
          </Button>
        </div>

        <div className="auth-card__footer">
          Demo — {email} / {password}
        </div>
      </form>
    </div>
  );
}
