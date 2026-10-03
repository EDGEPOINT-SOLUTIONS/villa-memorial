import { describe, expect, it } from "vitest";
import customersFile from "@/lib/fixtures/crm/customers.json";
import inquiriesFile from "@/lib/fixtures/crm/inquiries.json";
import employeesFile from "@/lib/fixtures/hr/employees.json";
import familySnapshotFile from "@/lib/fixtures/family/snapshot.json";
import agentWorkspaceFile from "@/lib/fixtures/agent/workspace.json";
import commissionFile from "@/lib/fixtures/finance/commission.json";
import notificationsFile from "@/lib/fixtures/operations/notifications.json";
import inventoryFile from "@/lib/fixtures/commerce/inventory.json";
import accountingFile from "@/lib/fixtures/finance/accounting.json";
import memorialsFile from "@/lib/fixtures/memorials/memorials.json";
import { readShape } from "@/lib/contracts/validate";
import { PROPOSED_SHAPES, type ProposedShapeKey } from "@/lib/contracts/proposed-shapes";
import { capturedProspects } from "@/lib/agent/acquisition";

/**
 * The proposed contract packets, made executable (platform-contract pre-wire, P3).
 *
 * Nothing here is served: these shapes are the packets the platform dev is being
 * asked to freeze. The test reads today's RECORDED fixtures through the shared
 * validation layer against each proposed field list, so a fixture that drifts from
 * the proposed shape fails here (naming the field), and a future live `toX` reader
 * can import the same spec rather than re-derive it.
 *
 * Sources: `data/villa-platform-contracts-plan/report.md` §3 (C1 · C2 · C4 · C7 · C8 ·
 * C9 · C15 · C18 · C28). Every proposed field traces to an existing TypeScript type
 * or fixture — none is invented.
 */

function assertRows(rows: unknown[], key: ProposedShapeKey): void {
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(() => readShape(row, key, PROPOSED_SHAPES[key])).not.toThrow();
  }
}

describe("proposed contract shapes validate today's recorded fixtures", () => {
  it("C1 crm — customers (clean start: the customer master is empty)", () => {
    expect(customersFile.customers as unknown[]).toEqual([]);
  });

  it("C1 crm — enquiries (clean start: the enquiry seed is empty)", () => {
    expect(inquiriesFile.inquiries as unknown[]).toEqual([]);
  });

  it("C2 hr — employees", () => {
    assertRows(employeesFile.employees as unknown[], "hr.employee");
  });

  it("C8 family — the household snapshot envelope (the clean start has no loved ones)", () => {
    expect(() =>
      readShape(familySnapshotFile, "family.snapshot", PROPOSED_SHAPES["family.snapshot"]),
    ).not.toThrow();
    // The demo household is removed (captain, 2026-10-02): the envelope is valid
    // and its loved-one list is honestly empty.
    expect((familySnapshotFile as { loved_ones: unknown[] }).loved_ones).toEqual([]);
  });

  it("C9 agent — a captured prospect validates against the proposed shape", () => {
    // The clean workspace carries no recorded prospects; the shape the pipeline
    // folds from a field capture is the row that must satisfy the packet.
    const rows = capturedProspects([
      {
        id: "prospect-captured",
        name: "Nena Bautista",
        phone: "+63 917 000 0000",
        source: "walk_in",
        interest: "plan",
        want: "A pre-need plan",
        callback: "After 4 PM",
        note: "Met at the door.",
        captured_at: "2026-10-02T02:00:00Z",
        captured_by: "Alex Agent",
      },
    ]);
    assertRows(rows as unknown[], "agent.prospect");
    expect((agentWorkspaceFile as { prospects: unknown[] }).prospects).toEqual([]);
  });

  it("C15 commission — the recorded engine state", () => {
    expect(() =>
      readShape(commissionFile, "commission.engine", PROPOSED_SHAPES["commission.engine"]),
    ).not.toThrow();
  });

  it("C7 notifications — templates", () => {
    assertRows(notificationsFile.templates as unknown[], "notification.template");
  });

  it("C28 inventory — the clean start carries no stock items", () => {
    expect(inventoryFile.items as unknown[]).toEqual([]);
  });

  it("C4 accounting — the clean start carries no journal entries", () => {
    expect(accountingFile.entries as unknown[]).toEqual([]);
  });

  it("C18 memorials — the consent store seed (nothing published)", () => {
    expect(() =>
      readShape(memorialsFile, "memorials.envelope", PROPOSED_SHAPES["memorials.envelope"]),
    ).not.toThrow();
    expect((memorialsFile as { consents: unknown[] }).consents).toEqual([]);
  });
});
