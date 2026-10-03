import { afterEach, describe, expect, it, vi} from "vitest";
import {
  LIVE_MODE_SERVICES,
  liveModeEnabled,
  liveModeEnvVars,
  liveModeRefusal,
  liveModeService,
} from "@/lib/live-mode";
import { crmLiveModeEnabled, CRM_NOT_WIRED } from "@/lib/api-client/crm";
import { hrLiveModeEnabled, HR_NOT_WIRED } from "@/lib/api-client/hr";
import { familyLiveModeEnabled, getFamilySnapshot } from "@/lib/api-client/family";
import { inventoryLiveModeEnabled, loadInventory } from "@/lib/api-client/inventory";
import { accountingLiveModeEnabled, loadAccountingLedger } from "@/lib/api-client/accounting";
import { reportingLiveModeEnabled } from "@/lib/api-client/reporting";
import { notificationsLiveModeEnabled } from "@/lib/api-client/notifications";

/**
 * The one live-mode registry (platform-contract pre-wire, P1/P7) and the honest
 * switch semantics (P4).
 *
 * A "none" service must stay on fixtures even with its env var set — setting a URL
 * cannot make an endpoint that does not exist, and a surface that flips to a
 * nonexistent live branch would be a lie. A "refuses" service (crm/hr) selects live
 * mode and answers a NAMED 503 instead. Every env var the plan proposes is declared
 * here so `.env.example` and the code cannot drift again.
 */

const DECLARED = [
  "CRM_BASE_URL",
  "HR_BASE_URL",
  "REPORTING_BASE_URL",
  "ACCOUNTING_BASE_URL",
  "FAMILY_BASE_URL",
  "AGENT_BASE_URL",
  "COMMISSION_BASE_URL",
  "MEMORIALS_BASE_URL",
  "NOTIFICATIONS_BASE_URL",
  "INVENTORY_BASE_URL",
];

const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("the live-mode registry", () => {
  it("declares every env switch the plan proposes", () => {
    const envs = liveModeEnvVars();
    for (const env of DECLARED) expect(envs).toContain(env);
  });

  it("has unique keys and env vars, and a refusal only where the state is 'refuses'", () => {
    expect(new Set(LIVE_MODE_SERVICES.map((s) => s.key)).size).toBe(LIVE_MODE_SERVICES.length);
    expect(new Set(liveModeEnvVars()).size).toBe(LIVE_MODE_SERVICES.length);
    for (const service of LIVE_MODE_SERVICES) {
      expect(["wired", "refuses", "none"]).toContain(service.state);
      if (service.state === "refuses") expect(service.refusal).toBeTruthy();
      else expect(service.refusal).toBeUndefined();
    }
  });

  it("returns false for an unknown key", () => {
    expect(liveModeEnabled("nope")).toBe(false);
    expect(liveModeService("nope")).toBeUndefined();
    expect(liveModeRefusal("nope")).toBeNull();
  });
});

describe("a 'none' service never enters live mode", () => {
  it("stays false with FAMILY_BASE_URL / INVENTORY_BASE_URL / ACCOUNTING_BASE_URL set, and still reads fixtures", async () => {
    process.env.FAMILY_BASE_URL = "https://gateway.example.com";
    process.env.INVENTORY_BASE_URL = "https://gateway.example.com";
    process.env.ACCOUNTING_BASE_URL = "https://gateway.example.com";

    expect(liveModeEnabled("family")).toBe(false);
    expect(liveModeEnabled("inventory")).toBe(false);
    expect(liveModeEnabled("accounting")).toBe(false);
    expect(familyLiveModeEnabled()).toBe(false);
    expect(inventoryLiveModeEnabled()).toBe(false);
    expect(accountingLiveModeEnabled()).toBe(false);
    expect(reportingLiveModeEnabled()).toBe(false);
    expect(notificationsLiveModeEnabled()).toBe(false);

    const snapshot = await getFamilySnapshot();
    expect(snapshot!.family.display_name.length).toBeGreaterThan(0);
    const stock = await loadInventory();
    // Clean start (captain, 2026-10-02): the recorded demo stock is removed, so
    // inventory fixture mode serves an empty list rather than a demo one.
    expect(stock.items).toEqual([]);
    const books = await loadAccountingLedger();
    // The chart of accounts is reference data and stays; journal entries start empty.
    expect(books.accounts.length).toBeGreaterThan(0);
    expect(books.entries).toEqual([]);
  });

  it("selects live mode for a 'refuses' service and names the refusal", () => {
    process.env.CRM_BASE_URL = "https://gateway.example.com";
    process.env.HR_BASE_URL = "https://gateway.example.com";

    expect(liveModeEnabled("crm")).toBe(true);
    expect(liveModeEnabled("hr")).toBe(true);
    expect(crmLiveModeEnabled()).toBe(true);
    expect(hrLiveModeEnabled()).toBe(true);
    expect(liveModeRefusal("crm")).toBe("CRM_NOT_WIRED");
    expect(liveModeRefusal("hr")).toBe("HR_NOT_WIRED");
    expect(CRM_NOT_WIRED.length).toBeGreaterThan(0);
    expect(HR_NOT_WIRED.length).toBeGreaterThan(0);
  });

  it("treats a blank env var as unset", () => {
    process.env.CRM_BASE_URL = "   ";
    expect(liveModeEnabled("crm")).toBe(false);
    expect(crmLiveModeEnabled()).toBe(false);
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded records through a test-only copy, so the
// pages keep their content-bearing contract tests without restoring demo data.
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/case.json", async () => ({
  default: (await import("../fixtures/family-case-demo.json")).default,
}));
