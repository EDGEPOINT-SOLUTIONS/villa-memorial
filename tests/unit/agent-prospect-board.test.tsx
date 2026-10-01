import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Prospect } from "@/lib/api-client/agent";
import { listAgentProspects } from "@/lib/api-client/agent";
import { recordStageMove } from "@/lib/api-client/agent-store";
import { PIPELINE_STAGES } from "@/lib/agent/agent-view";
import { boardColumns, canMoveTo, moveTargets } from "@/lib/agent/prospect-board";

/**
 * The prospect board — the placement mode beside the workbench list.
 *
 * The captain (2026-10-02) asked for a kanban mode "for easy placements of
 * stages per prospects". This guard renders the REAL page in board mode and
 * checks the facts that make the mode honest: one column per PRD stage (empty
 * stages included), every card in its recorded stage, a keyboard move control on
 * every non-terminal card, a wide-screen board that yields to the list on a
 * phone, and — the important one — the board reading the SAME journalled move the
 * lead record writes.
 */
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/agent/prospects",
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));
vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "agent@vm.demo", scopes: [] }),
}));

const { default: AgentProspectsPage } = await import("@/app/(agent)/agent/prospects/page");
const { ProspectMoveDialog } = await import("@/components/agent/prospect-board");

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-agent-board-"));
  process.env.AGENT_STORE_PATH = path.join(dir, "agent-pipeline.json");
});

afterEach(async () => {
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function prospect(over: Partial<Prospect> & { id: string; stage: string }): Prospect {
  return {
    name: over.id,
    phone: "",
    email: "",
    source: "walk_in",
    interest: "plan",
    want: "",
    owner: "Alex Agent",
    possible_value_cents: 0,
    first_contact_at: "2026-01-01T00:00:00.000Z",
    last_contact_at: "2026-01-01T00:00:00.000Z",
    stage_history: [],
    next_action: "",
    urgency: "new",
    best_time: "",
    notes: "",
    ...over,
  };
}

function renderPage(search: Record<string, string> = { view: "board" }): Promise<string> {
  return AgentProspectsPage({ searchParams: Promise.resolve(search) }).then((element) =>
    renderToStaticMarkup(element),
  );
}

/** The slice of the board markup for one stage column, by its accessible label. */
function columnSlice(html: string, label: string): string {
  const marker = `aria-label="${label}"`;
  const start = html.indexOf(marker);
  if (start === -1) return "";
  const next = html.indexOf("<section class=\"pb-column\"", start + marker.length);
  return html.slice(start, next === -1 ? undefined : next);
}

describe("the board model reads the one stage vocabulary", () => {
  it("builds one column per PRD stage, in order, empty stages included", () => {
    const people = [
      prospect({ id: "a", stage: "new" }),
      prospect({ id: "b", stage: "contacted" }),
      prospect({ id: "c", stage: "contacted" }),
      prospect({ id: "d", stage: "sold" }),
    ];
    const columns = boardColumns(people);
    expect(columns.map((c) => c.stage)).toEqual([...PIPELINE_STAGES]);
    expect(columns.find((c) => c.stage === "contacted")!.count).toBe(2);
    // No stage is hidden, even when nobody stands in it.
    expect(columns.find((c) => c.stage === "presentation")!.prospects).toEqual([]);
    expect(columns.filter((c) => c.count === 0)).toHaveLength(4);
  });

  it("only a later stage is a legal move; the targets are forward-only", () => {
    expect(canMoveTo("new", "contacted")).toBe(true);
    expect(canMoveTo("new", "sold")).toBe(true);
    expect(canMoveTo("qualified", "contacted")).toBe(false);
    expect(canMoveTo("qualified", "qualified")).toBe(false);
    expect(canMoveTo("not-a-stage", "sold")).toBe(false);

    expect(moveTargets("new").map((t) => t.stage)).toEqual([
      "contacted",
      "qualified",
      "presentation",
      "proposal",
      "reserved",
      "sold",
    ]);
    expect(moveTargets("sold")).toEqual([]);
  });
});

describe("the board mode renders the pipeline", () => {
  it("shows one column per stage, including the empty ones, and no list table on top", async () => {
    const html = await renderPage();
    expect(html.split('class="pb-column"').length - 1).toBe(PIPELINE_STAGES.length);
    expect(html).toContain('aria-label="New (');
    expect(html).toContain('aria-label="Meeting planned (0)"');
    expect(html).toContain('aria-label="Reserved (0)"');
    expect(html).toContain('aria-label="Sold (0)"');
    expect(html).toContain("pb-board");
    // The wide board and the phone list both render; CSS decides which shows.
    expect(html).toContain("pb-wide");
    expect(html).toContain("pb-narrow");
    expect(html).toContain("The board is a wide-screen view.");
  });

  it("places every recorded card in its stage column", async () => {
    const html = await renderPage();
    expect(columnSlice(html, "New (2)")).toContain("Lorna Castro");
    expect(columnSlice(html, "New (2)")).toContain("Boyet Salazar");
    expect(columnSlice(html, "Contacted (2)")).toContain("Paolo Mendoza");
    expect(columnSlice(html, "Qualified (2)")).toContain("Cecilia Ramos");
    expect(columnSlice(html, "Ready to close (1)")).toContain("Rosa Lim");
  });

  it("carries the lead facts the list shows on every card", async () => {
    const html = await renderPage();
    expect(html).toContain("Lawn lot for her parents");
    expect(html).toContain("₱128,000.00");
    expect(html).toContain("Call about a park visit this Friday");
    // The keyboard move control, with a distinct accessible name per person.
    expect(html).toContain('aria-label="Move Lorna Castro to another stage"');
    expect(html).toContain(">Move<");
  });

  it("respects the page's filters in board mode too", async () => {
    const html = await renderPage({ view: "board", filter: "lot" });
    expect(html).toContain("Maricel Tan");
    expect(html).not.toContain("Cecilia Ramos");
    expect(html).toContain("pb-board");
  });

  it("does not offer a move on a Sold card — the pipeline has no next step", async () => {
    await recordStageMove({
      prospectId: "prospect-lorna",
      stage: "sold",
      by: "Alex Agent",
      note: "Signed.",
      now: new Date("2026-10-02T01:00:00Z"),
    });
    const html = await renderPage();
    const sold = columnSlice(html, "Sold (1)");
    expect(sold).toContain("Lorna Castro");
    expect(sold).not.toContain("Move Lorna Castro to another stage");
  });
});

describe("the board reads the same journalled move the record writes", () => {
  it("moves the card to the new column after a recorded stage move", async () => {
    const before = await renderPage();
    expect(columnSlice(before, "New (2)")).toContain("Lorna Castro");

    await recordStageMove({
      prospectId: "prospect-lorna",
      stage: "contacted",
      by: "Alex Agent",
      note: "Reached her on the phone.",
      now: new Date("2026-10-02T01:00:00Z"),
    });

    const after = await renderPage();
    expect(columnSlice(after, "New (1)")).not.toContain("Lorna Castro");
    expect(columnSlice(after, "Contacted (3)")).toContain("Lorna Castro");

    // The list mode reads the same fold, so the two modes cannot disagree.
    const list = await renderPage({ view: "list" });
    expect(list).toContain("Lorna Castro");
    expect(list).toContain('aria-label="Your prospects"');
  });
});

describe("the accessible move control", () => {
  it("offers the forward stages, a note field and a cancel in a labelled dialog", async () => {
    const people = await listAgentProspects();
    const lorna = people.find((p) => p.id === "prospect-lorna")!;
    const html = renderToStaticMarkup(
      <ProspectMoveDialog prospect={lorna} stage="contacted" onClose={() => undefined} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Move Lorna Castro");
    // Every forward stage is offered, and the card's own stage is not.
    expect(html).toContain("Contacted");
    expect(html).toContain("Qualified");
    expect(html).toContain("Sold");
    expect(html).not.toContain('value="new"');
    // The note the record promises every move, and the two actions.
    expect(html).toContain("What happened");
    expect(html).toContain("Kept with your name and the time.");
    expect(html).toContain(">Cancel<");
    expect(html).toContain("Move to Contacted");
  });
});
