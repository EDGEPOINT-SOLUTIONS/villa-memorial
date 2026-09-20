/**
 * The ONE registry of live-mode switches (platform-contract pre-wire).
 *
 * Every service the web tier can read live is selected by exactly one server-side
 * env var. Before this module each client captured its own `process.env.X` (or
 * returned a hard-coded `false`) independently, so a URL could be documented in
 * `.env.example` and read by nothing (`REPORTING_BASE_URL`), and a service with no
 * live branch was indistinguishable from one whose branch simply was not switched
 * on. This module makes both facts explicit and testable.
 *
 * `state` is the honest switch position:
 *   - "wired"   — a real live branch exists (reads/writes the service).
 *   - "refuses" — the env var selects live mode and the module answers a named 503
 *                 because no contract is frozen (the app's shape for a service that
 *                 does not exist — never a 501 a service would never return).
 *   - "none"    — no env switch is active yet. `liveModeEnabled()` returns false
 *                 even when the env var is set, because setting a URL cannot make an
 *                 endpoint that does not exist. The var is declared so the day the
 *                 branch is written the flip is one registry row, not a new switch.
 *
 * The readers deliberately keep their own tolerant `toX` adapters (AGENTS.md: never
 * cast a `fetch` result straight to a domain type); this registry only decides
 * whether the live path is selected. SERVER-SIDE ONLY — `process.env` values other
 * than `NEXT_PUBLIC_*` never reach browser JS.
 */

export type LiveModeState = "wired" | "refuses" | "none";

export type LiveModeService = {
  /** Stable key the client modules call `liveModeEnabled()` with. */
  key: string;
  /** The server-side env var that selects live mode. */
  env: string;
  state: LiveModeState;
  /** The named constant a "refuses" service answers with (its value lives in the module). */
  refusal?: string;
  /** Where the gate/branch lives, for readers of this registry. */
  module: string;
};

export const LIVE_MODE_SERVICES: readonly LiveModeService[] = [
  // Wired: a real live branch behind a frozen contract.
  { key: "auth", env: "AUTH_BASE_URL", state: "wired", module: "lib/api-client/identity-access.ts" },
  {
    key: "commerce",
    env: "COMMERCE_BASE_URL",
    state: "wired",
    module: "lib/api-client/commerce.ts · pricing.ts · membership-applications.ts",
  },
  { key: "property", env: "PROPERTY_BASE_URL", state: "wired", module: "lib/api-client/property.ts" },
  {
    key: "operations",
    env: "OPERATIONS_BASE_URL",
    state: "wired",
    module: "lib/api-client/operations.ts",
  },
  { key: "billing", env: "BILLING_BASE_URL", state: "wired", module: "lib/api-client/finance.ts" },
  {
    key: "documents",
    env: "DOCUMENTS_BASE_URL",
    state: "wired",
    module: "lib/api-client/documents.ts",
  },
  {
    key: "scheduling",
    env: "SCHEDULING_BASE_URL",
    state: "wired",
    module: "lib/api-client/scheduling.ts · chapel-admin.ts · dispatch.ts",
  },
  { key: "audit", env: "AUDIT_BASE_URL", state: "wired", module: "lib/api-client/audit.ts" },

  // Refuses: the env var selects live mode and every read answers a named 503.
  {
    key: "crm",
    env: "CRM_BASE_URL",
    state: "refuses",
    refusal: "CRM_NOT_WIRED",
    module: "lib/api-client/crm.ts",
  },
  {
    key: "hr",
    env: "HR_BASE_URL",
    state: "refuses",
    refusal: "HR_NOT_WIRED",
    module: "lib/api-client/hr.ts",
  },

  // None: no live branch yet. The switch is declared; it cannot turn itself on.
  { key: "reporting", env: "REPORTING_BASE_URL", state: "none", module: "lib/api-client/reporting.ts" },
  { key: "accounting", env: "ACCOUNTING_BASE_URL", state: "none", module: "lib/api-client/accounting.ts" },
  { key: "family", env: "FAMILY_BASE_URL", state: "none", module: "lib/api-client/family.ts" },
  { key: "agent", env: "AGENT_BASE_URL", state: "none", module: "lib/api-client/agent.ts" },
  { key: "commission", env: "COMMISSION_BASE_URL", state: "none", module: "lib/api-client/commission.ts" },
  { key: "memorials", env: "MEMORIALS_BASE_URL", state: "none", module: "lib/api-client/memorials.ts" },
  {
    key: "notifications",
    env: "NOTIFICATIONS_BASE_URL",
    state: "none",
    module: "lib/api-client/notifications.ts",
  },
  { key: "inventory", env: "INVENTORY_BASE_URL", state: "none", module: "lib/api-client/inventory.ts" },
];

/** One registry row by key, or undefined for an unknown key. */
export function liveModeService(key: string): LiveModeService | undefined {
  return LIVE_MODE_SERVICES.find((service) => service.key === key);
}

/**
 * Whether live mode is selected for a service. A "none" service is ALWAYS false,
 * even with its env var set — there is no live branch to enter. An unknown key is
 * false. A blank/whitespace env var does not select live mode.
 */
export function liveModeEnabled(key: string): boolean {
  const service = liveModeService(key);
  if (!service) return false;
  if (service.state === "none") return false;
  return (process.env[service.env] ?? "").trim().length > 0;
}

/** The named refusal a "refuses" service answers with, or null. */
export function liveModeRefusal(key: string): string | null {
  return liveModeService(key)?.refusal ?? null;
}

/** Every env var the registry declares (test/`env.example` coverage). */
export function liveModeEnvVars(): string[] {
  return LIVE_MODE_SERVICES.map((service) => service.env);
}
