/**
 * Fixture-mode auth client. Used ONLY when AUTH_BASE_URL is unset so the app
 * demos standalone. Mirrors the real client's interface exactly.
 *
 * Tokens are built as unsigned structural JWTs (header alg "none", signature
 * marker "fixture") from persona claim templates — enough for session plumbing,
 * rejected by any real verifier. Never enabled in production deployments.
 */
import personasFile from "@/lib/fixtures/auth/personas.json";
import { ApiError } from "@/lib/api-client/api-error";
import type { LoginResult } from "@/lib/api-client/identity-access";

type Persona = {
  email: string;
  display_name: string;
  user_id: string;
  scopes: string[];
};

const PERSONAS = personasFile.personas as Persona[];
const TENANT_ID = personasFile.tenant_id;
const DEMO_PASSWORD = personasFile.password;

function base64UrlEncode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fixtureToken(claims: Record<string, unknown>): string {
  const header = { alg: "none", kid: "fixture-key" };
  return `${base64UrlEncode(header)}.${base64UrlEncode(claims)}.fixture-not-signed`;
}

function findPersona(email: string): Persona | undefined {
  return PERSONAS.find((p) => p.email === email.toLowerCase());
}

function buildLoginResult(persona: Persona): LoginResult {
  const now = Math.floor(Date.now() / 1000);
  return {
    accessToken: fixtureToken({
      sub: persona.user_id,
      tenant_id: TENANT_ID,
      scopes: persona.scopes,
      iat: now,
      exp: now + 900,
    }),
    expiresIn: 900,
    refreshToken: `fixture-refresh-${persona.user_id}`,
    user: {
      id: persona.user_id,
      tenant_id: TENANT_ID,
      email: persona.email,
      display_name: persona.display_name,
    },
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const persona = findPersona(email);
  if (!persona || password !== DEMO_PASSWORD) {
    throw new ApiError("invalid credentials", 401);
  }
  return buildLoginResult(persona);
}

export async function refresh(refreshToken: string): Promise<LoginResult> {
  const prefix = "fixture-refresh-";
  if (!refreshToken.startsWith(prefix)) {
    throw new ApiError("refresh rejected", 401);
  }
  const persona = PERSONAS.find((p) => p.user_id === refreshToken.slice(prefix.length));
  if (!persona) {
    throw new ApiError("refresh rejected", 401);
  }
  return buildLoginResult(persona);
}

/** Persona list for demo quick-fill hints on the login screen. */
export function fixturePersonaHints(): Array<{ email: string; display_name: string }> {
  return PERSONAS.map(({ email, display_name }) => ({ email, display_name }));
}
