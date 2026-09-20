/**
 * Typed read for the Accounting screen (`/staff/accounting`).
 *
 * ⚠ NO STAFF-FACING LEDGER API EXISTS. The platform's accounting service exists
 * and its posting-rule contract is frozen, but no contract names a ledger read,
 * and posting is the service's business — this app only displays. The screen
 * therefore reads the office's recorded ledger
 * (`lib/fixtures/finance/accounting.json`, app-authored example books with
 * provenance) through this module, the same pattern as the lot records.
 *
 * The reader validates field by field and refuses a malformed ledger with a 500:
 * an account code no chart entry names, a line with both sides filled, or an
 * entry whose debits do not equal its credits is a broken book, not a screen
 * state. The trial balance itself is never stored — `lib/accounting.ts` derives
 * it from these entries, so the two can never disagree.
 *
 * LIVE PATH (unimplemented, named here so the branch can be written when the
 * staff-facing accounting API freezes): with `ACCOUNTING_BASE_URL` set this module
 * will read `${ACCOUNTING_BASE_URL}/accounting/api/v1/accounts` and `/journal`
 * through the edge gateway. Until then `accountingLiveModeEnabled()` is always
 * false and the screen says what the service must supply. There is no write path
 * in any mode — no posting, reversal or period close.
 */
import accountingFile from "@/lib/fixtures/finance/accounting.json";
import { ApiError } from "@/lib/api-client/api-error";
import {
  isAccountType,
  isBalancedEntry,
  isLedgerDate,
  isValidJournalLine,
  type JournalEntry,
  type JournalLine,
  type LedgerAccount,
  type LedgerPeriod,
} from "@/lib/accounting";

/** No live branch exists: no contract names a staff-facing ledger read. */
export function accountingLiveModeEnabled(): boolean {
  return false;
}

/** The one honest line the screen prints above the ledger. */
export const ACCOUNTING_NOT_WIRED =
  "No staff-facing ledger API exists yet — this screen reads the office's recorded ledger. " +
  "The accounting service supplies the live trial balance and journal.";

export type AccountingLedger = {
  accounts: LedgerAccount[];
  entries: JournalEntry[];
  /** The window the recorded books cover, for the screen's own label. */
  recorded_period: LedgerPeriod;
};

type RawStore = {
  accounts?: unknown;
  entries?: unknown;
  recorded_period?: unknown;
};

function fail(what: string): never {
  throw new ApiError(`malformed accounting fixture: ${what}`, 500);
}

function requiredString(row: Record<string, unknown>, key: string, what: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") fail(`${what} has no ${key}`);
  return value.trim();
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function toAccount(raw: unknown): LedgerAccount {
  const what = "account row";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  if (!isAccountType(row.type)) fail(`${what} has an unknown type`);
  return {
    code: requiredString(row, "code", what),
    name: requiredString(row, "name", what),
    type: row.type,
  };
}

function toLine(raw: unknown, entryId: string): JournalLine {
  if (typeof raw !== "object" || raw === null) fail(`entry ${entryId} has a malformed line`);
  const row = raw as Record<string, unknown>;
  const line: JournalLine = {
    account_code: requiredString(row, "account_code", `entry ${entryId} line`),
    debit_cents: typeof row.debit_cents === "number" ? row.debit_cents : fail(`entry ${entryId} line`),
    credit_cents:
      typeof row.credit_cents === "number" ? row.credit_cents : fail(`entry ${entryId} line`),
  };
  if (!isValidJournalLine(line)) fail(`entry ${entryId} has a line with both sides filled`);
  return line;
}

function toEntry(raw: unknown): JournalEntry {
  const what = "entry row";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  const id = requiredString(row, "id", what);
  if (!isLedgerDate(row.date)) fail(`entry ${id} has an invalid date`);
  if (!Array.isArray(row.lines) || row.lines.length === 0) fail(`entry ${id} has no lines`);
  const entry: JournalEntry = {
    id,
    date: row.date,
    reference: requiredString(row, "reference", `entry ${id}`),
    description: requiredString(row, "description", `entry ${id}`),
    case_number: optionalString(row, "case_number"),
    order_number: optionalString(row, "order_number"),
    lines: (row.lines as unknown[]).map((line) => toLine(line, id)),
  };
  if (!isBalancedEntry(entry)) fail(`entry ${id} does not balance`);
  return entry;
}

/** The recorded books, validated: chart, journal and the window they cover. */
export async function loadAccountingLedger(): Promise<AccountingLedger> {
  const raw = accountingFile as unknown;
  if (typeof raw !== "object" || raw === null) fail("no store");
  const store = raw as RawStore;
  if (!Array.isArray(store.accounts) || !Array.isArray(store.entries)) {
    fail("no accounts or entries");
  }

  const accounts = (store.accounts as unknown[]).map(toAccount);
  const codes = new Set(accounts.map((account) => account.code));
  if (codes.size !== accounts.length) fail("two accounts share a code");

  const entries = (store.entries as unknown[]).map(toEntry);
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) fail("two entries share an id");
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!codes.has(line.account_code)) {
        fail(`entry ${entry.id} names an account outside the chart`);
      }
    }
  }

  const period = store.recorded_period;
  const recordedPeriod: LedgerPeriod =
    typeof period === "object" && period !== null
      ? {
          from: optionalString(period as Record<string, unknown>, "from"),
          to: optionalString(period as Record<string, unknown>, "to"),
        }
      : { from: null, to: null };

  return { accounts, entries, recorded_period: recordedPeriod };
}
