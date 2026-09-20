import { describe, expect, it } from "vitest";
import {
  buildTrialBalance,
  entryTotalCents,
  filterEntriesByPeriod,
  isBalancedEntry,
  isLedgerDate,
  isValidJournalLine,
  type JournalEntry,
  type LedgerAccount,
} from "@/lib/accounting";

/**
 * The Accounting screen's pure arithmetic: the date rule, the period window, the
 * balance checks and the trial balance derived from entries. The fixture-contract
 * suite proves the recorded book obeys these; this suite proves the rules, so the
 * page is never the only place a balance is decided.
 */

const ACCOUNTS: LedgerAccount[] = [
  { code: "1010", name: "Cash", type: "asset" },
  { code: "4010", name: "Revenue", type: "income" },
  { code: "5020", name: "Wages", type: "expense" },
];

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "je-1",
    date: "2026-08-01",
    reference: "REF-1",
    description: "Recorded event",
    case_number: null,
    order_number: null,
    lines: [
      { account_code: "1010", debit_cents: 1000, credit_cents: 0 },
      { account_code: "4010", debit_cents: 0, credit_cents: 1000 },
    ],
    ...overrides,
  };
}

describe("ledger dates and the period window", () => {
  it("accepts real calendar dates and refuses a rolled-over or malformed one", () => {
    expect(isLedgerDate("2026-08-31")).toBe(true);
    expect(isLedgerDate("2026-02-30")).toBe(false);
    expect(isLedgerDate("2026-13-01")).toBe(false);
    expect(isLedgerDate("31/08/2026")).toBe(false);
    expect(isLedgerDate(20260831)).toBe(false);
  });

  it("filters inclusively on both ends and leaves an open end open", () => {
    const entries = [
      entry({ id: "may", date: "2026-05-31" }),
      entry({ id: "jun", date: "2026-06-01" }),
      entry({ id: "jul", date: "2026-07-31" }),
    ];
    expect(filterEntriesByPeriod(entries, { from: "2026-06-01", to: "2026-07-31" }).map((e) => e.id)).toEqual([
      "jun",
      "jul",
    ]);
    expect(filterEntriesByPeriod(entries, { from: "2026-06-01", to: null }).map((e) => e.id)).toEqual([
      "jun",
      "jul",
    ]);
    expect(filterEntriesByPeriod(entries, { from: null, to: "2026-06-01" }).map((e) => e.id)).toEqual([
      "may",
      "jun",
    ]);
    expect(filterEntriesByPeriod(entries, { from: null, to: null })).toHaveLength(3);
  });
});

describe("journal line and entry balance", () => {
  it("requires exactly one side of a line to be filled, with money on it", () => {
    expect(isValidJournalLine({ account_code: "1010", debit_cents: 5, credit_cents: 0 })).toBe(true);
    expect(isValidJournalLine({ account_code: "1010", debit_cents: 0, credit_cents: 5 })).toBe(true);
    expect(isValidJournalLine({ account_code: "1010", debit_cents: 5, credit_cents: 5 })).toBe(false);
    expect(isValidJournalLine({ account_code: "1010", debit_cents: 0, credit_cents: 0 })).toBe(false);
    expect(isValidJournalLine({ account_code: "1010", debit_cents: -5, credit_cents: 0 })).toBe(false);
  });

  it("balances an entry only when debits equal credits and a line exists", () => {
    expect(isBalancedEntry(entry())).toBe(true);
    expect(isBalancedEntry(entry({ lines: [] }))).toBe(false);
    expect(
      isBalancedEntry(
        entry({
          lines: [
            { account_code: "1010", debit_cents: 1000, credit_cents: 0 },
            { account_code: "4010", debit_cents: 0, credit_cents: 900 },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("reads the entry's amount off its debit side", () => {
    expect(entryTotalCents(entry())).toBe(1000);
  });
});

describe("trial balance derivation", () => {
  const entries = [
    entry({
      id: "je-a",
      date: "2026-07-01",
      lines: [
        { account_code: "1010", debit_cents: 6352_00, credit_cents: 0 },
        { account_code: "4010", debit_cents: 0, credit_cents: 6352_00 },
      ],
    }),
    entry({
      id: "je-b",
      date: "2026-07-31",
      lines: [
        { account_code: "5020", debit_cents: 28000_00, credit_cents: 0 },
        { account_code: "1010", debit_cents: 0, credit_cents: 28000_00 },
      ],
    }),
  ];

  it("derives each account's debit, credit and net side from the entries alone", () => {
    const balance = buildTrialBalance(ACCOUNTS, entries);
    const cash = balance.rows.find((row) => row.code === "1010");
    expect(cash?.debit_cents).toBe(6352_00);
    expect(cash?.credit_cents).toBe(28000_00);
    expect(cash?.balance_cents).toBe(6352_00 - 28000_00);
    expect(cash?.balance_side).toBe("credit");
    const revenue = balance.rows.find((row) => row.code === "4010");
    expect(revenue?.balance_side).toBe("credit");
  });

  it("totals debits and credits and reports the book balanced", () => {
    const balance = buildTrialBalance(ACCOUNTS, entries);
    expect(balance.total_debit_cents).toBe(6352_00 + 28000_00);
    expect(balance.total_credit_cents).toBe(6352_00 + 28000_00);
    expect(balance.balanced).toBe(true);
  });

  it("orders rows assets → liabilities → equity → income → expenses, code within a type", () => {
    const balance = buildTrialBalance(ACCOUNTS, entries);
    expect(balance.rows.map((row) => row.code)).toEqual(["1010", "4010", "5020"]);
  });

  it("never lists an account that did not move, and nets a zero balance to no side", () => {
    const balance = buildTrialBalance(ACCOUNTS, [entry()]);
    expect(balance.rows).toHaveLength(2); // 5020 did not move
    // A sale and its exact reversal net to zero.
    const reversed = buildTrialBalance(ACCOUNTS, [
      entry({ id: "one" }),
      entry({
        id: "two",
        lines: [
          { account_code: "1010", debit_cents: 0, credit_cents: 1000 },
          { account_code: "4010", debit_cents: 1000, credit_cents: 0 },
        ],
      }),
    ]);
    expect(reversed.rows.every((row) => row.balance_side === null)).toBe(true);
    expect(reversed.balanced).toBe(true);
  });

  it("does not call an empty book balanced (there is nothing to balance)", () => {
    const balance = buildTrialBalance(ACCOUNTS, []);
    expect(balance.rows).toHaveLength(0);
    expect(balance.balanced).toBe(false);
  });
});
