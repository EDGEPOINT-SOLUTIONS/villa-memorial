"use client";

/**
 * Platform sign-in card — the operator door's form (route-local, deliberately
 * NOT the shared SignInCard: that one serves the staff/family/agent doors and
 * posts to the product's own BFF, while a platform operator is a different
 * identity type and this build has no platform identity service to talk to).
 *
 * WHAT THE FORM DOES: it runs the ordinary entry gate (both fields present,
 * the email has an @) and then tells the truth — nothing was sent, because no
 * service answers. No request is made anywhere.
 */
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";

type SignInErrors = { email?: string; password?: string };

export function PlatformSignInCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SignInErrors>({});
  const [attempted, setAttempted] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: SignInErrors = {};
    if (!email.trim()) {
      next.email = "Enter the operator's email address.";
    } else if (!email.includes("@")) {
      next.email = "That does not look like an email address — include the @.";
    }
    if (!password) next.password = "Enter the password for the operator account.";
    setErrors(next);
    setAttempted(Object.keys(next).length === 0);
  }

  return (
    <Card header={<h2 id="operator-sign-in">Operator sign-in</h2>}>
      <form className="stack" onSubmit={onSubmit} noValidate aria-labelledby="operator-sign-in">
        <p className="platform-card-note">
          Platform operators only. Staff, families and agents use the product&rsquo;s own
          sign-in.
        </p>

        {attempted ? (
          <Alert tone="warning" title="Nothing was sent.">
            The platform identity service is not connected in this build, so no sign-in
            happened.
          </Alert>
        ) : null}

        <Field label="Operator email address" htmlFor="platform-email" error={errors.email}>
          <input
            id="platform-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
        </Field>
        <Field label="Password" htmlFor="platform-password" error={errors.password}>
          <input
            id="platform-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
        </Field>

        <Button type="submit" className="btn--block">
          Sign in
        </Button>

        <p className="platform-form-note">
          Design reference only: no platform identity service answers this form yet.
        </p>
      </form>
    </Card>
  );
}
