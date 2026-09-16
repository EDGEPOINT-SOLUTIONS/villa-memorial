/**
 * Typed data access for the FAMILY portal (customer/family surfaces).
 *
 * ⚠ PROVISIONAL SHAPE — flagged loudly per web/AGENTS.md: there is NO frozen family/
 * customer API contract yet (the family-facing endpoints are dev-authored). This client
 * therefore reads a recorded FAMILY SNAPSHOT fixture only, and NEVER claims a live mode.
 * The snapshot mirrors what the customer persona could legitimately see once the family
 * API lands (their plan, balance, their documents). Nothing here is wired to a live URL
 * and no cross-service shape is invented beyond display-level strings.
 *
 * When the family contract freezes, this file gains a live branch behind a FAMILY_BASE_URL
 * env var and the snapshot's provenance comment is replaced by the contract reference.
 */
import snapshotFile from "@/lib/fixtures/family/snapshot.json";

export type FamilySnapshot = {
  tenant_id: string;
  family: { display_name: string; email: string; primary_contact: string };
  loved_one: { name: string; life_dates: string };
  plan_summary: { plan_name: string; status: string; term: string; next_due: string };
  balance: { total: string; paid: string; remaining: string };
  /**
   * Integer minor units for the same amounts as `balance` (display strings are
   * never parsed — repo money rule). Absent on older recordings; views must fall
   * back to the display strings without a progress figure when it is missing.
   */
  balance_cents?: { total: number; paid: number; remaining: number };
  recent_documents: Array<{ title: string; status: string }>;
};

export function familyLiveModeEnabled(): boolean {
  return false; // no family API contract yet — fixture only until the dev freeze
}

export async function getFamilySnapshot(): Promise<FamilySnapshot> {
  // Tolerant reader in the same style as the staff clients: defensive against shape
  // drift, since this fixture is provisional by definition.
  const raw = snapshotFile as unknown;
  if (typeof raw !== "object" || raw === null || !("family" in (raw as object))) {
    throw new Error("family snapshot fixture is malformed");
  }
  return raw as FamilySnapshot;
}
