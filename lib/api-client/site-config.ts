/**
 * Site configuration — the app's SERVER-SIDE configuration store.
 *
 * The first and currently only field is the Google Maps API key the public
 * home's section 7 embed uses. It lives here rather than in the landing content
 * document for one reason: the landing document is served to the editor's
 * browser and is page content, while this is server configuration. The public
 * home reads it inside a SERVER component (`app/(public)/page.tsx` →
 * `homeMapEmbed`), which builds the iframe src before the page is serialised, so
 * the key is never inlined into public JavaScript and never rides the landing
 * document's read or save.
 *
 * RESOLUTION ORDER
 *   1. `GOOGLE_MAPS_API_KEY` — a deployment-level secret wins (an operator who
 *      sets the environment should not be silently overridden by a demo save);
 *   2. the durable store below (the standard fixture store: recorded seed +
 *      append-only journal, `SITE_CONFIG_PATH` or `.data/site-config.json`);
 *   3. none → the keyless classic embed the approved plan uses.
 *
 * NO FROZEN CONTRACT names a site-configuration endpoint, so this is an
 * app-authored seam (the same status as the landing content and pricing stores).
 * Live mode does not change the read — the key is configuration, not a service
 * resource — and the editor says which mode is live.
 *
 * SERVER ONLY: this module imports `node:fs` through the journal; nothing here
 * may reach a client component. The editor talks to `/api/site-config`.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import configFile from "@/lib/fixtures/landing/site-config.json";

export type SiteConfig = {
  googleMapsApiKey: string | null;
  updated_at: string | null;
};

/** How the live embed key resolves right now. */
export type GoogleMapsKeyState = {
  /** The key the embed will use, or null when there is none. */
  key: string | null;
  source: "environment" | "store" | "none";
  /** "key" = the official Embed API; "classic" = the keyless embed. */
  mode: "key" | "classic";
};

type Seed = { googleMapsApiKey?: unknown };

const MAX_KEY_LENGTH = 512;

function readKey(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    throw new ApiError("the Google Maps API key must be a string or empty", 422);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_KEY_LENGTH) {
    throw new ApiError(`a Google Maps API key cannot be longer than ${MAX_KEY_LENGTH} characters`, 422);
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new ApiError("the Google Maps API key contains control characters", 422);
  }
  if (/\s/.test(trimmed)) {
    throw new ApiError("the Google Maps API key cannot contain spaces", 422);
  }
  return trimmed;
}

function seedConfig(): SiteConfig {
  const seed = configFile as Seed;
  return { googleMapsApiKey: readKey(seed.googleMapsApiKey), updated_at: null };
}

export function siteConfigStorePath(): string {
  return journalPath("SITE_CONFIG_PATH", "site-config.json");
}

const withConfigLock = createJournalLock();

type ConfigEvent = { kind: "site_config_saved"; at: string; actor: string; config: SiteConfig };

function toConfigEvent(raw: unknown): ConfigEvent {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed site-config store: event", 500);
  }
  const r = raw as Record<string, unknown>;
  if (r.kind !== "site_config_saved" || typeof r.at !== "string" || typeof r.actor !== "string") {
    throw new ApiError(`malformed site-config store: ${String(r.kind)}`, 500);
  }
  const config = (typeof r.config === "object" && r.config !== null ? r.config : {}) as Record<string, unknown>;
  return {
    kind: "site_config_saved",
    at: r.at,
    actor: r.actor,
    config: { googleMapsApiKey: readKey(config.googleMapsApiKey), updated_at: typeof config.updated_at === "string" ? config.updated_at : null },
  };
}

/** The stored configuration (the last save, or the recorded seed). */
export async function loadSiteConfig(): Promise<SiteConfig> {
  const events = (await readJournalEvents(siteConfigStorePath(), "site-config")).map(toConfigEvent);
  const latest = events.at(-1);
  return latest ? { ...latest.config } : seedConfig();
}

/** The deployment-level key, when the operator set one. */
export function googleMapsKeyFromEnv(): string | null {
  const raw = process.env.GOOGLE_MAPS_API_KEY;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The key the embed will use, with the mode and where it came from. */
export async function resolveGoogleMapsKey(): Promise<GoogleMapsKeyState> {
  const env = googleMapsKeyFromEnv();
  if (env) return { key: env, source: "environment", mode: "key" };
  const stored = (await loadSiteConfig()).googleMapsApiKey;
  if (stored) return { key: stored, source: "store", mode: "key" };
  return { key: null, source: "none", mode: "classic" };
}

/**
 * Persists the key (empty clears it). Validated before storing — a key with
 * whitespace or a control character is a 422 with a plain sentence, never a
 * written-then-broken config.
 */
export async function saveSiteConfig(raw: unknown, actor: string): Promise<SiteConfig> {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const key = readKey(record.googleMapsApiKey);
  const saved: SiteConfig = {
    googleMapsApiKey: key,
    updated_at: new Date().toISOString(),
  };
  return withConfigLock(async () => {
    const store = siteConfigStorePath();
    const events = await readJournalEvents(store, "site-config");
    await writeJournalEvents(store, "site-config", [
      ...events,
      { kind: "site_config_saved", at: saved.updated_at ?? new Date().toISOString(), actor, config: saved } satisfies ConfigEvent,
    ]);
    return { ...saved };
  });
}
