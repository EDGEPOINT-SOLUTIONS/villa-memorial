/**
 * Villa's Funeral Service Contract paper form — structured capture model.
 *
 * Source of truth for the paper's field inventory: `docs/07-client-villa/paper-forms/`
 * (byte-identical copy of `Service Contract Form.docx` + transcript) and
 * `docs/07-client-villa/current-state-forms.md` §1.
 *
 * WHAT THIS IS
 * The paper's services/deals table and its deductions block as typed, validated,
 * discrete inputs — one row per row the paper prints, checkboxes and number blanks
 * where the paper has them (Lizo JR/SR, Embalming ___ days, Others ___). Nothing here
 * is free text where the paper has discrete fields.
 *
 * WHAT THIS IS NOT (the dev boundary, per FORMS_PLAN.md non-negotiable rules)
 * - NO money: the Amount cells and the money rows (TOTAL COST OF SERVICES RENDERED,
 *   GRAND TOTAL AFTER DEDUCTIONS, DOWNPAYMENT, BALANCE) are deliberately absent.
 *   Amounts on a filed contract come from the linked order (server-priced,
 *   commerce-ordering) and the deduction/balance math belongs to the guarantee
 *   sub-ledger finance owns. This module never adds, subtracts or derives a figure.
 * - NO persistence shape: where a captured draft would be stored is not frozen — the
 *   intake block on the case (case-events-v1.md) is the only ratified home for service
 *   contract data, and it stops at the header. Until the dev freezes a service-contract
 *   draft shape (FORMS_PLAN.md gaps 1 & 5 open questions), this model powers the
 *   capture screen and its print preview; the screen says so honestly.
 * - NO official-receipt numbering and no posting rules — both dev domain.
 *
 * The header fields (deceased + client + co-maker + contract date) live in the case
 * intake (see `lib/api-client/operations.ts` `CaseIntake`); this module covers the
 * rest of the paper below the header.
 */
import type { Case, CaseIntake } from "@/lib/api-client/operations";

/* ------------------------------------------------------------------ */
/* The paper's discrete rows                                           */
/* ------------------------------------------------------------------ */

export type ServiceRowKey =
  | "rod"
  | "arabesque_half"
  | "arabesque_full_glass"
  | "lizo_jr"
  | "lizo_sr"
  | "metal_half"
  | "metal_full_bubble"
  | "others";

export type DealRowKey =
  | "ordinary_coffin"
  | "embalming"
  | "lights"
  | "delivery"
  | "pickup"
  | "interment"
  | "extension";

/** One checkable row of the services column, as the paper prints it. */
export type ServiceRow = {
  key: ServiceRowKey;
  label: string;
  side: "service";
  kind: "plain" | "free_text";
};

/** One checkable row of the packaged-deals column, as the paper prints it. */
export type DealRow = {
  key: DealRowKey;
  label: string;
  side: "deal";
  kind: "plain" | "days";
};

export type PaperRow = ServiceRow | DealRow;

/** Services rendered column (left side of the paper table). */
export const SERVICE_ROWS: ServiceRow[] = [
  { key: "rod", label: "ROD", side: "service", kind: "plain" },
  { key: "arabesque_half", label: "ARABESQUE 1/2", side: "service", kind: "plain" },
  { key: "arabesque_full_glass", label: "ARABESQUE Full glass", side: "service", kind: "plain" },
  // The paper prints two boxes: Lizo ___JR ___SR.
  { key: "lizo_jr", label: "Lizo (JR)", side: "service", kind: "plain" },
  { key: "lizo_sr", label: "Lizo (SR)", side: "service", kind: "plain" },
  { key: "metal_half", label: "Metal 1/2", side: "service", kind: "plain" },
  { key: "metal_full_bubble", label: "Metal Full / Bubble Top", side: "service", kind: "plain" },
  { key: "others", label: "Others", side: "service", kind: "free_text" },
];

/** Packaged deals column (right side of the paper table). */
export const DEAL_ROWS: DealRow[] = [
  { key: "ordinary_coffin", label: "Ordinary Coffin", side: "deal", kind: "plain" },
  { key: "embalming", label: "Embalming", side: "deal", kind: "days" },
  { key: "lights", label: "Lights", side: "deal", kind: "plain" },
  { key: "delivery", label: "Delivery", side: "deal", kind: "plain" },
  { key: "pickup", label: "Pick-up", side: "deal", kind: "plain" },
  { key: "interment", label: "Interment", side: "deal", kind: "plain" },
  { key: "extension", label: "Extension", side: "deal", kind: "plain" },
];

export const ALL_ROWS: PaperRow[] = [...SERVICE_ROWS, ...DEAL_ROWS];

/* ------------------------------------------------------------------ */
/* Deductions block ("Less: LIFE PLANS / INSURANCES / BURIAL           */
/* ASSISTANCE / GUARANTEES")                                           */
/* ------------------------------------------------------------------ */

/**
 * An LGU guarantee covers any of the three boxes the paper prints:
 * `coffin`, `embalming ___ days`, `Others ___`.
 */
export type LguCoverage = {
  coffin: boolean;
  embalming: boolean;
  /** Days of embalming an LGU embalming guarantee covers (paper's number blank). */
  embalming_days: string;
  others: boolean;
  /** What the LGU "Others" guarantee covers (paper's free-text blank). */
  others_detail: string;
};

export type DeductionsCapture = {
  lgu: LguCoverage;
  /** DSWD / Senior Citizen box. */
  dswd_senior: boolean;
  /** SSS ID# blank (burial assistance claim). */
  sss_id: string;
  /** GSIS ID# blank. */
  gsis_id: string;
  /** Life Plan / Insurance Plan # blank. */
  plan_number: string;
};

/* ------------------------------------------------------------------ */
/* The draft                                                            */
/* ------------------------------------------------------------------ */

export type RowSelection = {
  applied: boolean;
};

export type FreeTextSelection = RowSelection & {
  detail: string;
};

export type DaysSelection = RowSelection & {
  /** Whole number of days, as typed into the paper's `___ days` blank. */
  days: string;
};

export type AnyRowState = RowSelection | FreeTextSelection | DaysSelection;

/**
 * A working capture of the paper's table + deductions block. Rows carry no money
 * (see the header note); they record WHICH of Villa's named rows the contract
 * covers and the paper's number/text blanks next to them.
 */
export type ServiceContractDraft = {
  services: Record<ServiceRowKey, RowSelection | FreeTextSelection>;
  deals: Record<DealRowKey, RowSelection | DaysSelection>;
  deductions: DeductionsCapture;
};

export function emptyDraft(): ServiceContractDraft {
  const selection = (): RowSelection => ({ applied: false });
  return {
    services: {
      rod: selection(),
      arabesque_half: selection(),
      arabesque_full_glass: selection(),
      lizo_jr: selection(),
      lizo_sr: selection(),
      metal_half: selection(),
      metal_full_bubble: selection(),
      others: { applied: false, detail: "" },
    },
    deals: {
      ordinary_coffin: selection(),
      embalming: { applied: false, days: "" },
      lights: selection(),
      delivery: selection(),
      pickup: selection(),
      interment: selection(),
      extension: selection(),
    },
    deductions: {
      lgu: { coffin: false, embalming: false, embalming_days: "", others: false, others_detail: "" },
      dswd_senior: false,
      sss_id: "",
      gsis_id: "",
      plan_number: "",
    },
  };
}

/**
 * A draft begins from the case, not from nothing: services already recorded on the case
 * pre-tick the paper rows whose label they name so the counter does not re-enter what
 * the platform already holds. A no-order case (intake precedes checkout) starts clean.
 */
export function emptyDraftForCase(kase: Pick<Case, "services">): ServiceContractDraft {
  const draft = emptyDraft();
  const recorded = kase.services.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (recorded.length === 0) {
    return draft;
  }
  // "Lights & Sound" names the Lights deal row; "Embalming" names "Embalming ___ days".
  for (const row of ALL_ROWS) {
    const bucket = row.side === "service" ? draft.services : draft.deals;
    const state = (bucket as unknown as Record<string, RowSelection>)[row.key];
    const needle = row.label.toLowerCase();
    state.applied = recorded.some((s) => s === needle || s.includes(needle));
  }
  return draft;
}

/* ------------------------------------------------------------------ */
/* Printed labels — what shows on the paper preview per row            */
/* ------------------------------------------------------------------ */

/** The row as it reads on the printed contract, blanks filled in. */
export function printedRowLabel(
  row: PaperRow,
  state: RowSelection | FreeTextSelection | DaysSelection,
): string {
  if (row.kind === "free_text") {
    const detail = (state as FreeTextSelection).detail.trim();
    return detail ? `${row.label}: ${detail}` : row.label;
  }
  if (row.kind === "days") {
    const days = (state as DaysSelection).days.trim();
    return days ? `${row.label} — ${days} day${days === "1" ? "" : "s"}` : `${row.label} ___ days`;
  }
  return row.label;
}

/** Applied rows in paper order, services first then deals. */
export function appliedRows(draft: ServiceContractDraft): Array<{ row: PaperRow; label: string }> {
  const out: Array<{ row: PaperRow; label: string }> = [];
  for (const row of SERVICE_ROWS) {
    const state = draft.services[row.key];
    if (state.applied) out.push({ row, label: printedRowLabel(row, state) });
  }
  for (const row of DEAL_ROWS) {
    const state = draft.deals[row.key];
    if (state.applied) out.push({ row, label: printedRowLabel(row, state) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Validation — structure only, never money                            */
/* ------------------------------------------------------------------ */

export type DraftErrors = {
  /** Whole-number blanks that were filled with something that is not a positive integer. */
  badDays: string[];
  /** Free-text blanks over the paper's practical length, or a bare tick with no words. */
  longDetails: string[];
};

const MAX_DETAIL_LENGTH = 120;

/** A paper blank is valid empty; only a filled blank is checked. */
export function validateDraft(draft: ServiceContractDraft): DraftErrors {
  const badDays: string[] = [];
  const longDetails: string[] = [];

  const embalming = draft.deals.embalming as DaysSelection;
  if (embalming.applied && embalming.days.trim() !== "") {
    const days = embalming.days.trim();
    if (!/^\d+$/.test(days) || Number(days) < 1) {
      badDays.push("Embalming (days)");
    }
  }
  const lguDays = draft.deductions.lgu.embalming_days.trim();
  if (draft.deductions.lgu.embalming && lguDays !== "") {
    if (!/^\d+$/.test(lguDays) || Number(lguDays) < 1) {
      badDays.push("LGU embalming (days)");
    }
  }

  const others = draft.services.others as FreeTextSelection;
  if (others.applied && others.detail.trim().length > MAX_DETAIL_LENGTH) {
    longDetails.push("Others");
  }
  if (
    draft.deductions.lgu.others &&
    draft.deductions.lgu.others_detail.trim().length > MAX_DETAIL_LENGTH
  ) {
    longDetails.push("LGU — Others");
  }
  if (draft.deductions.lgu.others && draft.deductions.lgu.others_detail.trim() === "") {
    // Ticking the box without saying what it covers would print an empty promise; the
    // paper never prints a bare tick, so neither should the screen's print view.
    longDetails.push("LGU — Others (say what the guarantee covers)");
  }
  return { badDays, longDetails };
}

export function draftIsValid(draft: ServiceContractDraft): boolean {
  const errors = validateDraft(draft);
  return errors.badDays.length === 0 && errors.longDetails.length === 0;
}

/* ------------------------------------------------------------------ */
/* Header helpers shared by the capture screen and the paper preview   */
/* ------------------------------------------------------------------ */

/** Gender/civil-status letters as the paper prints them, for the preview's tick layout. */
export const GENDER_LETTER = { male: "M", female: "F" } as const;
export const CIVIL_STATUS_LETTER = { single: "S", married: "M", other: "O" } as const;

export type ClientChannels = {
  telephone: string | null;
  facebook: string | null;
  email: string | null;
};

export function channelsFromIntake(intake: CaseIntake | null): ClientChannels {
  return {
    telephone: intake?.client_contact ?? null,
    facebook: intake?.client_facebook ?? null,
    email: intake?.client_email ?? null,
  };
}

/** The paper's "Gender:" line for one party: letters ticked when the intake says so. */
export function genderOptions(value: string | null | undefined): { letter: string; checked: boolean }[] {
  return (["male", "female"] as const).map((g) => ({
    letter: GENDER_LETTER[g],
    checked: value === g,
  }));
}

/** The paper's "Civil Status: S M O" line: letters ticked when the intake says so. */
export function civilStatusOptions(value: string | null | undefined): { letter: string; checked: boolean }[] {
  return (["single", "married", "other"] as const).map((s) => ({
    letter: CIVIL_STATUS_LETTER[s],
    checked: value === s,
  }));
}
