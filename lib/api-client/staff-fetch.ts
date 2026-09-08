/**
 * Server-side fetch helper for AUTHENTICATED staff surfaces.
 *
 * Why this exists: the Module D/H clients promised that flipping live mode on would not
 * touch screen code. Screens call `listLots()` with no arguments, so the bearer token has
 * to come from somewhere other than the call site — here, the httpOnly session cookie the
 * BFF already manages.
 *
 * Rules (web/AGENTS.md rule 3): this module is SERVER-ONLY. The token is read from the
 * cookie jar and forwarded to the gateway; it never reaches browser JS.
 */
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth/session";
import { ApiError } from "@/lib/api-client/api-error";

/** Reads the access token from the session cookie. Null when signed out. */
async function accessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

/**
 * GET a JSON resource from a service through the edge gateway, authenticated as the
 * current staff session. Maps upstream failures onto the same ApiError the fixture
 * clients throw, so screens handle both modes identically.
 */
export async function getAuthedJson(baseUrl: string, path: string): Promise<unknown> {
  const token = await accessToken();
  if (!token) {
    throw new ApiError("not signed in", 401);
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("upstream unavailable", 502);
  }

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error: unknown }).error)
        : res.status === 404
          ? "not_found"
          : "request failed";
    throw new ApiError(message, res.status);
  }
  return payload;
}

/** Narrows an upstream `{ items: [...] }` envelope, tolerating extra fields. */
export function itemsOf(payload: unknown): unknown[] {
  if (typeof payload === "object" && payload !== null && "items" in payload) {
    const items = (payload as { items: unknown }).items;
    if (Array.isArray(items)) return items;
  }
  throw new ApiError("malformed upstream response", 502);
}

/**
 * POST a JSON body to a service through the edge gateway as the current staff session.
 * Same error mapping as `getAuthedJson` — the service stays the authority on whether a
 * transition is legal (it answers 422 with a message the screen shows verbatim).
 */
/**
 * PATCH a JSON resource as the current staff session. Same error mapping as
 * `postAuthedJson` — it is the same request with a different verb, so it shares the body
 * rather than drifting from it.
 */
export async function patchAuthedJson(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  return sendAuthedJson("PATCH", baseUrl, path, body);
}

export async function postAuthedJson(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  return sendAuthedJson("POST", baseUrl, path, body);
}

async function sendAuthedJson(
  method: "POST" | "PATCH",
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  const token = await accessToken();
  if (!token) {
    throw new ApiError("not signed in", 401);
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("upstream unavailable", 502);
  }

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error: unknown }).error)
        : res.status === 404
          ? "not_found"
          : "request failed";
    throw new ApiError(message, res.status);
  }
  return payload;
}

/**
 * GET a NON-JSON resource (a rendered document) through the gateway as the current staff
 * session. Returns the body and its content type; the caller decides what to do with it.
 * Errors still map onto ApiError so screens and routes handle them uniformly.
 */
export async function getAuthedText(
  baseUrl: string,
  path: string,
): Promise<{ body: string; contentType: string }> {
  const token = await accessToken();
  if (!token) {
    throw new ApiError("not signed in", 401);
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("upstream unavailable", 502);
  }

  const body = await res.text().catch(() => "");
  if (!res.ok) {
    throw new ApiError(res.status === 404 ? "not_found" : "request failed", res.status);
  }
  return { body, contentType: res.headers.get("content-type") ?? "text/plain" };
}
