/**
 * Typed client for identity-access auth endpoints (server-side only).
 *
 * Shapes come from the REAL service implementation + frozen contracts:
 * - POST /api/v1/auth/login   {email,password} → {access_token, expires_in,
 *                              refresh_token, user:{id,tenant_id,email,display_name}}
 *   (ref: platform/services/identity-access .../api/v1/auth_controller.rb)
 * - POST /api/v1/auth/refresh {refresh_token} → same envelope minus `user`
 * - GET  /identity/.well-known/jwks.json (public keys; not used by fixtures mode)
 *
 * NOTE (recorded in PR): identity-access `contracts/api/v1.yaml` is still the
 * template placeholder (generic `/things`), so a GENERATED client is not yet
 * possible for auth. This hand-typed client mirrors the frozen jwt-claims-v1
 * contract + live controller exactly; switch to codegen when the spec lands.
 *
 * Errors use the platform-wide uniform error shape: {"error": "<message>"}.
 */
import { ApiError } from "@/lib/api-client/api-error";

export { ApiError };

const BASE_URL = process.env.AUTH_BASE_URL ?? "";

export function authLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

async function postJson(path: string, body: unknown): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    // Network/gateway failure — surface as 502 with uniform error shape.
    throw new ApiError("upstream unavailable", 502);
  }

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error: unknown }).error)
        : "request failed";
    throw new ApiError(message, res.status);
  }
  if (typeof payload !== "object" || payload === null) {
    throw new ApiError("unexpected upstream response", 502);
  }
  return payload as Record<string, unknown>;
}

export type LoginResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: {
    id: string;
    tenant_id: string;
    email: string;
    display_name: string;
  };
};

function readString(payload: Record<string, unknown>, key: string): string {
  const v = payload[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new ApiError("unexpected upstream response", 502);
  }
  return v;
}

function readUser(payload: Record<string, unknown>): LoginResult["user"] {
  const raw = payload.user;
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("unexpected upstream response", 502);
  }
  const u = raw as Record<string, unknown>;
  for (const k of ["id", "tenant_id", "email", "display_name"] as const) {
    if (typeof u[k] !== "string") {
      throw new ApiError("unexpected upstream response", 502);
    }
  }
  return {
    id: String(u.id),
    tenant_id: String(u.tenant_id),
    email: String(u.email),
    display_name: String(u.display_name),
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const payload = await postJson("/identity/api/v1/auth/login", { email, password });
  return {
    accessToken: readString(payload, "access_token"),
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 900,
    refreshToken: readString(payload, "refresh_token"),
    user: readUser(payload),
  };
}

export async function refresh(refreshToken: string): Promise<LoginResult> {
  const payload = await postJson("/identity/api/v1/auth/refresh", {
    refresh_token: refreshToken,
  });
  return {
    accessToken: readString(payload, "access_token"),
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 900,
    refreshToken: readString(payload, "refresh_token"),
    // Refresh endpoint returns no `user`; reuse nothing — caller keeps prior user view.
    user: { id: "", tenant_id: "", email: "", display_name: "" },
  };
}
