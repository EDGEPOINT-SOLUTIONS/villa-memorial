/**
 * Stub gateway — serves recorded fixture responses so `docker compose up`
 * demos the web app standalone with no backend stack attached.
 *
 * Path convention mirrors the real edge gateway (edge-gateway/nginx):
 *   POST /identity/api/v1/auth/login | /refresh
 *
 * Tokens are unsigned structural JWTs (see lib/api-client/fixture-auth.ts).
 * This process is for DEMO ONLY and must never face production traffic.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = process.env.FIXTURES_DIR
  ? path.resolve(process.env.FIXTURES_DIR)
  : path.resolve(__dirname, "../lib/fixtures");
const PORT = Number(process.env.STUB_PORT ?? 8080);

function b64url(value) {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function token(claims) {
  return `${b64url({ alg: "none", kid: "fixture-key" })}.${b64url(claims)}.fixture-not-signed`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

const personas = JSON.parse(
  await readFile(path.join(FIXTURES, "auth/personas.json"), "utf8"),
);

function findPersona(email) {
  return personas.personas.find((p) => p.email === String(email).toLowerCase());
}

function loginResult(persona) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: token({
      sub: persona.user_id,
      tenant_id: personas.tenant_id,
      scopes: persona.scopes,
      iat: now,
      exp: now + 900,
    }),
    expires_in: 900,
    refresh_token: `fixture-refresh-${persona.user_id}`,
    user: {
      id: persona.user_id,
      tenant_id: personas.tenant_id,
      email: persona.email,
      display_name: persona.display_name,
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader("content-type", "application/json");

  if (req.method === "POST" && url.pathname === "/identity/api/v1/auth/login") {
    const body = await readBody(req);
    const persona = findPersona(body.email ?? "");
    if (!persona || body.password !== personas.password) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "invalid credentials" }));
      return;
    }
    res.end(JSON.stringify(loginResult(persona)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/identity/api/v1/auth/refresh") {
    const body = await readBody(req);
    const prefix = "fixture-refresh-";
    const raw = typeof body.refresh_token === "string" ? body.refresh_token : "";
    const persona = personas.personas.find((p) => p.user_id === raw.slice(prefix.length));
    if (!raw.startsWith(prefix) || !persona) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "refresh rejected" }));
      return;
    }
    res.end(JSON.stringify(loginResult(persona)));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  console.log(`stub-gateway listening on :${PORT} (fixtures only — never production)`);
});
