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
  it("C1 crm — customers", () => {
    assertRows(customersFile.customers as unknown[], "crm.customer");
  });

  it("C1 crm — enquiries", () => {
    assertRows(inquiriesFile.inquiries as unknown[], "crm.inquiry");
  });

  it("C2 hr — employees", () => {
    assertRows(employeesFile.employees as unknown[], "hr.employee");
  });

  it("C8 family — the snapshot envelope", () => {
    expect(() =>
      readShape(familySnapshotFile, "family.snapshot", PROPOSED_SHAPES["family.snapshot"]),
    ).not.toThrow();
  });

  it("C9 agent — prospects", () => {
    assertRows(agentWorkspaceFile.prospects as unknown[], "agent.prospect");
  });

  it("C15 commission — the recorded engine state", () => {
    expect(() =>
      readShape(commissionFile, "commission.engine", PROPOSED_SHAPES["commission.engine"]),
    ).not.toThrow();
  });

  it("C7 notifications — templates", () => {
    assertRows(notificationsFile.templates as unknown[], "notification.template");
  });

  it("C28 inventory — stock items", () => {
    assertRows(inventoryFile.items as unknown[], "inventory.item");
  });

  it("C4 accounting — journal entries", () => {
    assertRows(accountingFile.entries as unknown[], "accounting.entry");
  });

  it("C18 memorials — the recorded store envelope (nothing published)", () => {
    expect(() =>
      readShape(memorialsFile, "memorials.envelope", PROPOSED_SHAPES["memorials.envelope"]),
    ).not.toThrow();
    expect((memorialsFile as { memorials: unknown[] }).memorials).toEqual([]);
  });
});
