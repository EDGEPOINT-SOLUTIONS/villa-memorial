import { describe, expect, it, vi } from "vitest";
import workflowsFile from "@/lib/fixtures/operations/workflows.json";
import {
  WORKFLOW_KEYS,
  loadWorkflowsView,
  readWorkflowDefinitions,
} from "@/lib/api-client/workflows";
import { ApiError } from "@/lib/api-client/api-error";
import { TRANSFER_STATES, TRANSFER_STATE_LABEL } from "@/lib/lot-lifecycle";
import { CASE_STAGES, STAGE_LABEL } from "@/lib/operations/case-board";
import { SCOPE_VOCABULARY } from "@/lib/rbac/scope-vocabulary";

/**
 * Workflows fixture ↔ the modules it describes.
 *
 * The workflow engine does not exist, so the definitions are app-authored; what
 * makes them a recording rather than a diagram is that each step list is pinned
 * to the module that enforces it — `case-events-v1`'s stage order for the
 * service contract, the office's own four transfer states — and every in-flight
 * row is composed live from the recorded fixtures. This suite fails on drift in
 * either half.
 */

const propertyLive = vi.hoisted(() => ({ current: false }));
vi.mock("@/lib/api-client/property", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/property")>();
  return {
    ...actual,
    propertyLiveModeEnabled: () => propertyLive.current,
  };
});

const ALL_SCOPES = SCOPE_VOCABULARY.map((entry) => entry.scope);

async function viewWith(scopes: string[]) {
  return loadWorkflowsView(scopes);
}

describe("the recorded definitions", () => {
  it("names exactly the four processes the screen renders", () => {
    const definitions = readWorkflowDefinitions(workflowsFile);
    expect(definitions.map((definition) => definition.key)).toEqual([...WORKFLOW_KEYS]);
    for (const definition of definitions) {
      expect(definition.steps.length, `${definition.key} has no steps`).toBeGreaterThan(0);
      expect(new Set(definition.steps.map((step) => step.key)).size).toBe(definition.steps.length);
      expect(definition.summary.trim().length).toBeGreaterThan(0);
      expect(definition.source.trim().length).toBeGreaterThan(0);
    }
  });

  it("pins the service-contract steps to case-events-v1's frozen stage order", () => {
    const definition = readWorkflowDefinitions(workflowsFile).find(
      (entry) => entry.key === "service_contract",
    )!;
    expect(definition.steps.map((step) => step.key)).toEqual([...CASE_STAGES]);
    expect(definition.steps.map((step) => step.label)).toEqual(
      CASE_STAGES.map((stage) => STAGE_LABEL[stage]),
    );
  });

  it("pins the transfer steps to the office's own four states", () => {
    const definition = readWorkflowDefinitions(workflowsFile).find(
      (entry) => entry.key === "lot_transfer",
    )!;
    expect(definition.steps.map((step) => step.key)).toEqual([...TRANSFER_STATES]);
    expect(definition.steps.map((step) => step.label)).toEqual(
      TRANSFER_STATES.map((state) => TRANSFER_STATE_LABEL[state]),
    );
  });

  it("records the purchase-application and chapel steps in their shipped order", () => {
    const definitions = readWorkflowDefinitions(workflowsFile);
    const application = definitions.find((entry) => entry.key === "purchase_application")!;
    expect(application.steps.map((step) => step.key)).toEqual([
      "captured",
      "review",
      "reserved",
      "sold",
    ]);
    const chapel = definitions.find((entry) => entry.key === "chapel_booking")!;
    expect(chapel.steps.map((step) => step.key)).toEqual(["requested", "held", "confirmed"]);
  });

  it("refuses an unknown workflow key (the reader is the gate)", () => {
    expect(() =>
      readWorkflowDefinitions({
        workflows: [
          { key: "made_up", name: "Made up", summary: "x", source: "x", steps: [{ key: "a", label: "A" }] },
        ],
      }),
    ).toThrowError(ApiError);
  });
});

describe("the composed in-flight records", () => {
  it("places every record at a step the workflow actually declares", async () => {
    const view = await viewWith(ALL_SCOPES);
    for (const entry of view.workflows) {
      const stepKeys = new Set(entry.workflow.steps.map((step) => step.key));
      for (const record of entry.records) {
        expect(
          stepKeys.has(record.step_key),
          `${entry.workflow.key} ${record.label} sits at unknown step "${record.step_key}"`,
        ).toBe(true);
        expect(record.step_label).not.toBe(record.step_key);
      }
    }
  });

  it("shows the recorded cases at their contract stages with their coordinator", async () => {
    const view = await viewWith(ALL_SCOPES);
    const service = view.workflows.find((entry) => entry.workflow.key === "service_contract")!;
    expect(service.state).toBe("read");
    expect(service.records.map((record) => record.label)).toEqual([
      "CASE-2026-0001",
      "CASE-2026-0002",
      "CASE-2026-0003",
      "CASE-2026-0004",
      "CASE-2026-0005",
      "CASE-2026-0006",
      "CASE-2026-0007",
    ]);
    const first = service.records[0];
    expect(first.step_key).toBe("viewing");
    expect(first.step_label).toBe("Viewing");
    expect(first.next_step_label).toBe("Ceremony");
    expect(first.owner).toBe("Elena Villanueva");
    expect(first.href).toBe("/staff/cases/00000000-0000-4000-8000-000000000C01");
    // The contract's "Unassigned" default stays as recorded, never renamed.
    expect(service.records.find((record) => record.label === "CASE-2026-0006")!.owner).toBe(
      "Unassigned",
    );
  });

  it("reads the applications at the step the lot status shows", async () => {
    const view = await viewWith(ALL_SCOPES);
    const applications = view.workflows.find(
      (entry) => entry.workflow.key === "purchase_application",
    )!;
    expect(applications.state).toBe("read");
    const reserved = applications.records.find((record) => record.label.startsWith("A-002"))!;
    expect(reserved.label).toBe("A-002 · Marites Santos");
    expect(reserved.step_label).toBe("Lot reserved");
    expect(reserved.next_step_label).toBe("Lot sold");
    expect(reserved.owner).toBe("Elena Villanueva");
    const sold = applications.records.find((record) => record.label.startsWith("A-003"))!;
    expect(sold.step_label).toBe("Lot sold");
    expect(sold.next_step_label).toBeNull();
  });

  it("reads the recorded transfers at their clerk's state, with no invented owner", async () => {
    const view = await viewWith(ALL_SCOPES);
    const transfers = view.workflows.find((entry) => entry.workflow.key === "lot_transfer")!;
    expect(transfers.records).toHaveLength(2);
    const transfer = transfers.records.find((record) => record.label.startsWith("A-002"))!;
    expect(transfer.label).toBe("A-002 · Marites Santos → Alyanna Santos");
    expect(transfer.step_label).toBe("Submitted");
    expect(transfer.next_step_label).toBe("Verified");
    expect(transfer.owner).toBeNull();
    const verified = transfers.records.find((record) => record.label.startsWith("A-003"))!;
    expect(verified.step_label).toBe("Verified");
    expect(verified.next_step_label).toBe("Approved");
  });

  it("shows only the chapel bookings, and names the case coordinator on the held one", async () => {
    const view = await viewWith(ALL_SCOPES);
    const chapel = view.workflows.find((entry) => entry.workflow.key === "chapel_booking")!;
    expect(chapel.records.map((record) => record.label)).toEqual([
      "Chapel A · Wake — Day 1",
      "Chapel B · Memorial service",
    ]);
    expect(chapel.records[0].step_label).toBe("Confirmed");
    expect(chapel.records[0].owner).toBe("Elena Villanueva");
    expect(chapel.records[1].owner).toBeNull();
    expect(chapel.records[0].href).toMatch(/^\/staff\/schedule\?date=\d{4}-\d{2}-\d{2}$/);
  });

  it("omits record links for a reader without the module's read scope", async () => {
    const view = await viewWith(["tenancy:tenants:manage"]);
    for (const entry of view.workflows) {
      for (const record of entry.records) {
        expect(record.href, `${entry.workflow.key} ${record.label}`).toBeNull();
      }
    }
    // Reading the records themselves does not need the link scope.
    expect(view.inFlight).toBeGreaterThan(0);
  });

  it("marks only the property-backed process unavailable in live mode", async () => {
    propertyLive.current = true;
    try {
      const view = await viewWith(ALL_SCOPES);
      const states = Object.fromEntries(
        view.workflows.map((entry) => [entry.workflow.key, entry.state]),
      );
      expect(states).toEqual({
        service_contract: "read",
        purchase_application: "unavailable",
        lot_transfer: "read",
        chapel_booking: "read",
      });
    } finally {
      propertyLive.current = false;
    }
  });
});
