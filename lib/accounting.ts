/**
 * The ledger's vocabulary and arithmetic — PURE, client + server.
 *
 * Why it exists: the Accounting screen (`/staff/accounting`) shows a trial balance
 * and a journal list from the office's recorded ledger. The accounts, the entry
 * lines and the one piece of arithmetic that matters — a trial balance derived
 * from the entries, never stored beside them — live here so the screen, the
 * fixture-contract test and any future live read share them.
 *
 * READ-ONLY BY CONSTRUCTION: nothing here posts, reverses, closes a period or
 * touches a balance. The platform's accounting service owns posting (its
 * posting-rule contract is frozen; no staff-facing ledger API is). A balance is
 * always the sum of the entry lines a caller hands in — if the ledger file says
 * something different, the trial balance does not.
 */

/* -------------------------------- accounts ------------------------------- */

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

/** The order a printed chart of accounts walks: assets first, expenses last. */
export const ACCOUNT_TYPE_ORDER: Record<AccountType, number> = {
  asset: 0,
  liability: 1,
  equity: 2,
  income: 3,
  expense: 4,
};

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

export type LedgerAccount = {
  code: string;
  name: string;
  type: AccountType;
};

/* -------------------------------- the ledger ----------------------------- */

/** One side of one line: exactly one of the two amounts is non-zero. */
export type JournalLine = {
  account_code: string;
  debit_cents: number;
  credit_cents: number;
};

export type JournalEntry = {
  id: string;
  /** Calendar date, yyyy-mm-dd. */
  date: string;
  reference: string;
  description: string;
  /** The case or order this entry is against, when the ledger records one. */
  case_number: string | null;
  order_number: string | null;
  lines: JournalLine[];
};

/** The entry's own amount — the total of its debit side (equal to the credit side). */
export function entryTotalCents(entry: JournalEntry): number {
  return entry.lines.reduce((sum, line) => sum + line.debit_cents, 0);
}

/** Is one side of a line filled and the other empty? A malformed line fails this. */
export function isValidJournalLine(line: JournalLine): boolean {
  const debit = line.debit_cents;
  const credit = line.credit_cents;
  const isMoney = (v: number) => Number.isInteger(v) && v >= 0;
  if (!isMoney(debit) || !isMoney(credit)) return false;
  return (debit > 0 && credit === 0) || (credit > 0 && debit === 0);
}

/** An entry's lines must balance: every debit matched by a credit, to the centavo. */
export function isBalancedEntry(entry: JournalEntry): boolean {
  if (entry.lines.length === 0) return false;
  if (!entry.lines.every(isValidJournalLine)) return false;
  const debit = entry.lines.reduce((sum, line) => sum + line.debit_cents, 0);
  const credit = entry.lines.reduce((sum, line) => sum + line.credit_cents, 0);
  return debit === credit;
}

/* ------------------------------- the period ------------------------------ */

/** Inclusive calendar-date window; either end may be open. */
export type LedgerPeriod = {
  from: string | null;
  to: string | null;
};

/** yyyy-mm-dd only — the fixture's own date vocabulary. */
export function isLedgerDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** The entries inside the window, inclusive of both ends; an open end means "all". */
export function filterEntriesByPeriod(
  entries: readonly JournalEntry[],
  period: LedgerPeriod,
): JournalEntry[] {
  return entries.filter((entry) => {
    if (period.from && entry.date < period.from) return false;
    if (period.to && entry.date > period.to) return false;
    return true;
  });
}

/* ----------------------------- the trial balance ------------------------- */

export type BalanceSide = "debit" | "credit";

export type TrialBalanceRow = {
  account: LedgerAccount | null;
  code: string;
  name: string;
  type: AccountType | null;
  debit_cents: number;
  credit_cents: number;
  /** Debit minus credit; negative means the credit side is larger. */
  balance_cents: number;
  /** null when the account nets to zero in the window. */
  balance_side: BalanceSide | null;
};

export type TrialBalance = {
  rows: TrialBalanceRow[];
  total_debit_cents: number;
  total_credit_cents: number;
  /** Debits equal credits — the accounting equation's own check, not an app verdict. */
  balanced: boolean;
};

/**
 * The trial balance is DERIVED from the entries handed in — never read from the
 * file, so a stale printed balance cannot disagree with the journal. Accounts with
 * no movement in the window are real accounts but carry no row here (a trial
 * balance lists what moved).
 *
 * `includeZeroMovement` renders the CHART OF ACCOUNTS instead: every account the
 * chart defines keeps its row, with zero movement shown as no movement (— on the
 * screen), so the office can see the whole chart beside the journal. The amounts
 * are still derived from the entries alone — the flag only decides whether an
 * account with no lines is listed.
 */
export function buildTrialBalance(
  accounts: readonly LedgerAccount[],
  entries: readonly JournalEntry[],
  options: { includeZeroMovement?: boolean } = {},
): TrialBalance {
  const byCode = new Map(accounts.map((account) => [account.code, account]));
  const totals = new Map<string, { debit: number; credit: number }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const sum = totals.get(line.account_code) ?? { debit: 0, credit: 0 };
      sum.debit += line.debit_cents;
      sum.credit += line.credit_cents;
      totals.set(line.account_code, sum);
    }
  }

  if (options.includeZeroMovement) {
    for (const account of accounts) {
      if (!totals.has(account.code)) totals.set(account.code, { debit: 0, credit: 0 });
    }
  }

  const rows: TrialBalanceRow[] = [...totals.entries()]
    .map(([code, sum]): TrialBalanceRow => {
      const account = byCode.get(code) ?? null;
      const balance = sum.debit - sum.credit;
      return {
        account,
        code,
        name: account?.name ?? code,
        type: account?.type ?? null,
        debit_cents: sum.debit,
        credit_cents: sum.credit,
        balance_cents: balance,
        balance_side: balance > 0 ? "debit" : balance < 0 ? "credit" : null,
      };
    })
    .sort((a, b) => {
      const byType =
        (a.type ? ACCOUNT_TYPE_ORDER[a.type] : 99) - (b.type ? ACCOUNT_TYPE_ORDER[b.type] : 99);
      if (byType !== 0) return byType;
      return a.code.localeCompare(b.code, "en");
    });

  const totalDebit = rows.reduce((sum, row) => sum + row.debit_cents, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit_cents, 0);
  // Movement is what a balance is judged on: a chart rendered with all accounts
  // still only balances when the ledger moved and both sides are equal.
  const moved = rows.some((row) => row.debit_cents > 0 || row.credit_cents > 0);

  return {
    rows,
    total_debit_cents: totalDebit,
    total_credit_cents: totalCredit,
    balanced: totalDebit === totalCredit && moved,
  };
}
