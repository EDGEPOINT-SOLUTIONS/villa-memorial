import { describe, expect, it } from "vitest";
import accountingFile from "@/lib/fixtures/finance/accounting.json";
import casesFile from "@/lib/fixtures/operations/cases.json";
import ordersFile from "@/lib/fixtures/commerce/orders.json";
import {
  ACCOUNT_TYPES,
  buildTrialBalance,
  isBalancedEntry,
  isLedgerDate,
  isValidJournalLine,
  type JournalEntry,
  type LedgerAccount,
} from "@/lib/accounting";
import { accountingLiveModeEnabled, loadAccountingLedger } from "@/lib/api-client/accounting";

/**
 * The recorded ledger's contract (the Accounting screen's data).
 *
 * No staff-facing ledger API exists — that stays true — but the recorded book must
 * still be a coherent double-entry ledger: every entry balanced line by line,
 * every account named by a line in the chart, order and case references pointing
 * at documents that exist, and a trial balance the page derives rather than reads.
 */

type RawAccount = Record<string, unknown>;
type RawEntry = Record<string, unknown>;

const accounts = accountingFile.accounts as unknown as RawAccount[];
const entries = accountingFile.entries as unknown as RawEntry[];

describe("accounting fixture identity and vocabulary", () => {
  it("is fixture-mode only: no contract names a staff-facing ledger read", () => {
    expect(accountingLiveModeEnabled()).toBe(false);
  });

  it("keeps account codes unique and every type inside the chart vocabulary", () => {
    const codes = accounts.map((row) => row.code);
    expect(new Set(codes).size).toBe(accounts.length);
    for (const row of accounts) {
      expect(ACCOUNT_TYPES, `bad type on ${String(row.code)}`).toContain(row.type);
      expect(String(row.name).length, `empty name on ${String(row.code)}`).toBeGreaterThan(0);
    }
  });

  it("keeps entry ids unique and every date a real calendar date", () => {
    const ids = entries.map((row) => row.id);
    expect(new Set(ids).size).toBe(entries.length);
    for (const row of entries) {
      expect(isLedgerDate(row.date), `${String(row.id)} has date ${String(row.date)}`).toBe(true);
      expect(String(row.reference).length, `${String(row.id)} has no reference`).toBeGreaterThan(0);
      expect(String(row.description).length, `${String(row.id)} has no description`).toBeGreaterThan(0);
    }
  });
});

describe("accounting fixture double-entry rules", () => {
  it("keeps every line one-sided and inside the chart", () => {
    const codes = new Set(accounts.map((row) => row.code));
    for (const row of entries) {
      const lines = row.lines as unknown as Array<Record<string, unknown>>;
      expect(Array.isArray(lines) && lines.length > 0, `${String(row.id)} has no lines`).toBe(true);
      for (const line of lines) {
        expect(codes, `${String(row.id)} names ${String(line.account_code)}`).toContain(
          line.account_code,
        );
        expect(
          isValidJournalLine({
            account_code: String(line.account_code),
            debit_cents: Number(line.debit_cents),
            credit_cents: Number(line.credit_cents),
          }),
          `${String(row.id)} has a malformed line`,
        ).toBe(true);
      }
    }
  });

  it("balances every entry and the book as a whole", () => {
    const typed: JournalEntry[] = entries.map((row) => ({
      id: String(row.id),
      date: String(row.date),
      reference: String(row.reference),
      description: String(row.description),
      case_number: row.case_number === null ? null : String(row.case_number),
      order_number: row.order_number === null ? null : String(row.order_number),
      lines: (row.lines as unknown as Array<Record<string, unknown>>).map((line) => ({
        account_code: String(line.account_code),
        debit_cents: Number(line.debit_cents),
        credit_cents: Number(line.credit_cents),
      })),
    }));
    for (const entry of typed) {
      expect(isBalancedEntry(entry), `${entry.id} does not balance`).toBe(true);
    }
    const balance = buildTrialBalance(accounts as unknown as LedgerAccount[], typed);
    expect(balance.rows.length).toBeGreaterThan(0);
    expect(balance.total_debit_cents).toBe(balance.total_credit_cents);
    expect(balance.balanced).toBe(true);
    expect(balance.total_debit_cents).toBeGreaterThan(0);
  });
});

describe("accounting fixture cross-references", () => {
  it("points an order reference at an order that exists, and a case reference at a real case", () => {
    const orderNumbers = new Set(
      (ordersFile.orders as unknown as Array<{ order: { number: string } }>).map(
        (row) => row.order.number,
      ),
    );
    const caseNumbers = new Set(
      (casesFile.cases as unknown as Array<Record<string, unknown>>).map((row) => row.case_number),
    );
    for (const row of entries) {
      if (row.order_number) {
        expect(orderNumbers, `${String(row.id)} names ${String(row.order_number)}`).toContain(
          row.order_number,
        );
      }
      if (row.case_number) {
        expect(caseNumbers, `${String(row.id)} names ${String(row.case_number)}`).toContain(
          row.case_number,
        );
      }
    }
  });

  it("records the window the books cover as real calendar dates", () => {
    expect(isLedgerDate(accountingFile.recorded_period.from)).toBe(true);
    expect(isLedgerDate(accountingFile.recorded_period.to)).toBe(true);
    expect(accountingFile.recorded_period.from <= accountingFile.recorded_period.to).toBe(true);
  });

  it("serves the recorded books through the reader, chart and journal intact", async () => {
    const ledger = await loadAccountingLedger();
    expect(ledger.accounts.length).toBe(accounts.length);
    expect(ledger.entries.length).toBe(entries.length);
  });
});
