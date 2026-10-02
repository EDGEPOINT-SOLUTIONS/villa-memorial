/**
 * The office's AGENTS — the roster the Prospects screen assigns from.
 *
 * ⚠ PROVISIONAL — identity-access publishes no user list and no role-assignment
 * endpoint (see `lib/api-client/access-control.ts`), so there is no contract that
 * names "the office's agents". This reader composes the roster from the two
 * recorded sources the app already owns:
 *
 *   · every recorded account that can sign into the AGENT portal
 *     (`lib/fixtures/auth/access-control.json`, the agent role's holders) — these
 *     carry a durable notice into their portal when assigned; and
 *   · every recorded HR employee in a sales role
 *     (`lib/fixtures/hr/employees.json`), the office's own sales staff.
 *
 * It adds no contract field and invents no person: a name only reaches the
 * dropdown because a recorded record carries it. When identity-access freezes a
 * user-list contract, this module gains the live branch and the screen does not
 * change. The contract ask is recorded in `docs/08-delivery/open-items.md`.
 */
import { loadAccessControlRoster } from "@/lib/api-client/access-control";
import { listEmployees } from "@/lib/api-client/hr";

export type OfficeAgent = {
  /** The display name — the value a prospect's `owner` carries. */
  name: string;
  email: string;
  /** The recorded role, in the record's own words. */
  role_label: string;
  /** True when the agent has an agent-portal sign-in the assignment notice reaches. */
  has_portal: boolean;
};

/** HR roles that are the office's sales staff (a recorded role substring). */
const SALES_ROLE_HINTS = ["sales", "lot"];

/**
 * The office's agents, portal accounts first, then recorded sales staff, each
 * person once. An HR read that cannot run (a live HR base URL with no contract)
 * degrades to the portal accounts rather than taking the whole screen down — the
 * notice target is always a portal agent, and the screen says so.
 */
export async function listOfficeAgents(): Promise<OfficeAgent[]> {
  const { accounts } = await loadAccessControlRoster();
  const agents: OfficeAgent[] = [];
  const seen = new Set<string>();

  for (const account of accounts) {
    if (account.role.key !== "agent") continue;
    agents.push({
      name: account.name,
      email: account.email,
      role_label: account.role.label,
      has_portal: true,
    });
    seen.add(account.name.toLowerCase());
  }

  let employees: Awaited<ReturnType<typeof listEmployees>> = [];
  try {
    employees = await listEmployees();
  } catch {
    // No HR contract in live mode: the roster keeps the portal agents it has.
    employees = [];
  }
  for (const employee of employees) {
    if (employee.employment_status === "separated") continue;
    const role = employee.role.toLowerCase();
    if (!SALES_ROLE_HINTS.some((hint) => role.includes(hint))) continue;
    const name = `${employee.first_name} ${employee.last_name}`.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    agents.push({
      name,
      email: employee.email,
      role_label: employee.role,
      has_portal: false,
    });
    seen.add(name.toLowerCase());
  }

  return agents;
}

/** The agent names the assignment reader validates against. */
export async function listOfficeAgentNames(): Promise<string[]> {
  return (await listOfficeAgents()).map((agent) => agent.name);
}
