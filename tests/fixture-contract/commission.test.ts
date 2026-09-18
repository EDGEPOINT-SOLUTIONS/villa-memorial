import { describe, expect, it } from "vitest";
import commissionFile from "@/lib/fixtures/finance/commission.json";
import workspaceFile from "@/lib/fixtures/agent/workspace.json";
import { commissionLiveModeEnabled, readCommissionEngine } from "@/lib/api-client/commission";
import {
  COMMISSION_BASES,
  COMMISSION_CAPABILITIES,
  COMMISSION_REVERSAL,
  COMMISSION_STATES,
} from "@/lib/commission";

/**
 * The staff Commission fixture (captain checklist F-12) is PROVISIONAL — no
 * commission contract exists and the engine is deferred platform scope
 * (finance-billing.md §Commissions). These assertions pin the one rule that
 * must never drift: no rate, percentage, target or statement amount may appear
 * until the client fixes commission rules (`open-questions.md` — "Commission
 * rules and rates"), and the staff engine and the agent statement must describe
 * the same rules.
 */
const fixture = commissionFile as {
  comment: string[];
  configured: boolean;
  placeholder_note: string;
  statement_period: { label: string | null; detail: string };
  target: { amount_cents: number | null; detail: string };
};

const workspace = workspaceFile as unknown as {
  commission: {
    configured: boolean;
    bases: Array<{ key: string; label: string; detail: string }>;
    statement: Array<{ state: string; amount_cents: number | null }>;
    target: { amount_cents: number | null };
  };
};

/** Every leaf of the fixture with its key path, so no amount can hide. */
function leaves(value: unknown, path = ""): Array<[string, unknown]> {
  if (Array.isArray(value)) {
    return value.flatMap((entry, i) => leaves(entry, `${path}[${i}]`));
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      leaves(entry, path ? `${path}.${key}` : key),
    );
  }
  return [[path, value]];
}

describe("staff commission fixture (F-12)", () => {
  it("is fixture-only — no commission contract exists to claim live mode", () => {
    expect(commissionLiveModeEnabled()).toBe(false);
  });

  it("records the engine as unconfigured and nothing issued", () => {
    expect(fixture.configured).toBe(false);
    expect(fixture.statement_period.label).toBeNull();
    expect(fixture.target.amount_cents).toBeNull();
    expect(workspace.commission.configured).toBe(false);
    expect(workspace.commission.target.amount_cents).toBeNull();
  });

  it("contains NO number at all — a rate, target or amount cannot hide in the file", () => {
    const numeric = leaves(fixture)
      .filter(([, value]) => typeof value === "number")
      .map(([path]) => path);
    expect(numeric, "the fixture must carry no numeric figure").toEqual([]);
  });

  it("carries no non-null rate-like key anywhere", () => {
    const suspicious = leaves(fixture)
      .filter(([, value]) => value !== null)
      .map(([path]) => path)
      .filter((path) => /(^|\.)(rate|rates|percent|percentage|amount|payout|commission)(_|$|\.)/i.test(path));
    expect(suspicious, "no rate/amount may be recorded until the client answers").toEqual([]);
  });

  it("names the client question that keeps every figure blank", () => {
    const text = fixture.comment.join("\n");
    expect(text).toContain("open-questions.md");
    expect(text).toContain("Commission rules and rates");
    expect(text).toContain("never add a rate");
    expect(fixture.placeholder_note).toMatch(/pending from Villa/i);
  });

  it("shares ONE base vocabulary with the agent workspace fixture", () => {
    expect(workspace.commission.bases).toEqual(COMMISSION_BASES);
    expect(COMMISSION_BASES).toHaveLength(7);
  });

  it("keeps the agent statement inside the same state vocabulary, amounts null", () => {
    const keys = new Set([...COMMISSION_STATES.map((s) => s.key), COMMISSION_REVERSAL.key]);
    for (const line of workspace.commission.statement) {
      expect(keys.has(line.state)).toBe(true);
      expect(line.amount_cents).toBeNull();
    }
    for (const state of COMMISSION_STATES) {
      expect(state.label.trim()).not.toHaveLength(0);
      expect(state.detail.trim()).not.toHaveLength(0);
    }
  });

  it("covers the engine capabilities the PRD names (finance-billing.md §Commissions)", () => {
    for (const key of [
      "registration",
      "territory",
      "performance",
      "referral",
      "attribution",
      "rates",
      "approval",
      "statements",
      "payouts",
      "reversals",
      "ranking",
    ]) {
      expect(
        COMMISSION_CAPABILITIES.some((capability) => capability.key === key),
        `capability ${key} is missing`,
      ).toBe(true);
    }
  });

  it("rejects a malformed engine seed instead of surfacing half-shaped state", () => {
    expect(() => readCommissionEngine(null)).toThrow(/malformed commission fixture/);
    expect(() =>
      readCommissionEngine({ configured: false, placeholder_note: "x" }),
    ).toThrow(/malformed commission fixture/);
    // The documented null target is a recorded state, not a figure: the reader
    // keeps it, the fixture-contract assertions keep it null.
    const state = readCommissionEngine({
      configured: false,
      placeholder_note: "pending",
      statement_period: { label: null, detail: "not set" },
      target: { amount_cents: null, detail: "not set" },
    });
    expect(state.target.amount_cents).toBeNull();
    expect(state.configured).toBe(false);
  });
});
