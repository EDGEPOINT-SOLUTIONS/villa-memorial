import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import seed from "@/lib/fixtures/family/snapshot.json";
import type { FamilyDocument, FamilySnapshot } from "@/lib/api-client/family";

/**
 * The captain's rule on the family portal (2026-09-17): the service contract and every
 * official receipt BELONG to the family. These tests render the REAL family pages with
 * the REAL fixture and with records that carry the fields a family API would deliver,
 * and pin:
 *   - the owned papers are labelled “Yours” with the ownership sentence,
 *   - they carry NO request affordance (the request path stays for the other types),
 *   - the honest “getting it ready for this page” state when no copy exists,
 *   - a receipt with its number/date/amount opens a real copy built from the record,
 *   - staff-only record fields never reach the page.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/documents",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

const state = vi.hoisted(() => ({ snapshot: null as unknown }));
vi.mock("@/lib/api-client/family", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/family")>();
  return { ...actual, getFamilySnapshot: async () => state.snapshot };
});

const { default: PapersPage } = await import("@/app/(family)/client/documents/page");
const { default: FuneralPage } = await import("@/app/(family)/client/cases/page");
const { default: HomePage } = await import("@/app/(family)/client/dashboard/page");
const { default: ReceiptPage } = await import(
  "@/app/(family)/client/documents/receipts/[reference]/page"
);

const base = seed as unknown as FamilySnapshot;

const CONTRACT: FamilyDocument = {
  title: "Service contract",
  status: "Generated",
  kind: "service_contract",
};
const RECEIPT: FamilyDocument = {
  title: "Official receipt",
  status: "Sent",
  kind: "official_receipt",
  reference: "OR-2026-00412",
  issued_on: "2026-09-12",
  amount: "₱12,000",
  covers: "Villa Memorial Plan",
};
const CERTIFICATE: FamilyDocument = {
  title: "Death certificate",
  status: "pending_review",
  kind: "other",
};
const PERMIT: FamilyDocument = { title: "Burial permit", status: "verified", kind: "other" };

function snapshotWith(documents: FamilyDocument[]): FamilySnapshot {
  return { ...base, recent_documents: documents };
}

/** Every family row on the page, as its own HTML segment (`<article class="ag-work">`). */
function rowSegments(html: string): string[] {
  return html.split('<article class="ag-work">').slice(1);
}

function rowFor(html: string, title: string): string {
  const found = rowSegments(html).filter((row) => row.includes(title));
  expect(found, `no row found for ${title}`).toHaveLength(1);
  return found[0];
}

beforeEach(() => {
  state.snapshot = snapshotWith([CONTRACT, RECEIPT]);
});

describe("the family's own papers on the Papers page", () => {
  it("always shows the contract and the receipts as the family's own", async () => {
    const html = renderToStaticMarkup(await PapersPage());
    expect(html).toContain("Service contract");
    expect(html).toContain("Official receipt");
    for (const owned of ["Service contract", "Official receipt"]) {
      const row = rowFor(html, owned);
      expect(row).toContain("Yours");
      expect(row).toContain("never need to request");
    }
  });

  it("carries no request affordance for the owned papers", async () => {
    const html = renderToStaticMarkup(await PapersPage());
    expect(html).not.toContain("Ask for a copy");
    expect(html).not.toMatch(/request a copy/i);
    for (const owned of ["Service contract", "Official receipt"]) {
      expect(rowFor(html, owned)).not.toContain("Ask for a copy");
    }
  });

  it("keeps the honest getting-ready state and a person to call when no copy exists", async () => {
    // A record that lists the papers but carries no receipt details — exactly the
    // state the honest copy comes from.
    const withoutCopy = (doc: (typeof base.recent_documents)[number]) => ({
      ...doc,
      reference: undefined,
      issued_on: undefined,
      amount: undefined,
      covers: undefined,
    });
    state.snapshot = snapshotWith(base.recent_documents.map(withoutCopy));
    const html = renderToStaticMarkup(await PapersPage());
    for (const owned of ["Service contract", "Official receipt"]) {
      const row = rowFor(html, owned);
      expect(row).toContain("getting it ready for this page");
      expect(row).toContain("tel:+639176178489");
    }
    expect(html).toContain("Call if you need it today");
  });

  it("keeps the request path for the other paper types, unchanged", async () => {
    state.snapshot = snapshotWith([CONTRACT, RECEIPT, CERTIFICATE, PERMIT]);
    const html = renderToStaticMarkup(await PapersPage());
    expect(html.match(/Ask for a copy/g)).toHaveLength(2);
    for (const requestable of ["Death certificate", "Burial permit"]) {
      expect(rowFor(html, requestable)).toContain("Ask for a copy");
    }
    for (const owned of ["Service contract", "Official receipt"]) {
      expect(rowFor(html, owned)).not.toContain("Ask for a copy");
    }
  });

  it("opens a real receipt copy when the record carries number, date and amount", async () => {
    state.snapshot = snapshotWith([CONTRACT, RECEIPT]);
    const html = renderToStaticMarkup(await PapersPage());
    const receiptRow = rowFor(html, "OR-2026-00412");
    expect(receiptRow).toContain("₱12,000");
    expect(receiptRow).toContain("12 September 2026");
    expect(receiptRow).toContain("for Villa Memorial Plan");
    expect(receiptRow).toContain("always here");
    expect(receiptRow).toContain('href="/client/documents/receipts/OR-2026-00412"');
    expect(receiptRow).toContain("Open the receipt");
  });

  it("still names the exact amount, date and coverage of every listable receipt", async () => {
    const second: FamilyDocument = {
      title: "Official receipt",
      status: "Sent",
      kind: "official_receipt",
      reference: "OR-2026-00301",
      issued_on: "2026-08-01",
      amount: "₱8,000",
      covers: "cash payment at the office",
    };
    state.snapshot = snapshotWith([CONTRACT, RECEIPT, second]);
    const html = renderToStaticMarkup(await PapersPage());
    expect(html).toContain("₱12,000");
    expect(html).toContain("₱8,000");
    expect(html).toContain("1 August 2026");
    expect(html).toContain("cash payment at the office");
  });
});

describe("the service contract on the funeral page", () => {
  it("is shown as the family's own paper, with no request", async () => {
    const html = renderToStaticMarkup(await FuneralPage());
    expect(html).toContain("Your service contract");
    const row = rowFor(html, "Service contract");
    expect(row).toContain("Yours");
    expect(row).toContain("never need to request");
    expect(row).not.toContain("Ask for a copy");
  });
});

describe("the dashboard summary points at the family's own papers", () => {
  it("shows the papers count and links to the papers page, with no request affordance", async () => {
    state.snapshot = snapshotWith([CONTRACT, RECEIPT, PERMIT]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Papers");
    expect(html).toContain('href="/client/documents"');
    expect(html).not.toContain("Ask for a copy");
  });
});

describe("one official receipt opens as the family's own copy", () => {
  it("renders the receipt from the recorded cells through the shared paper sheet", async () => {
    const html = renderToStaticMarkup(
      await ReceiptPage({ params: Promise.resolve({ reference: "OR-2026-00412" }) }),
    );
    expect(html).toContain('data-paper-sheet');
    expect(html).toContain("OFFICIAL RECEIPT");
    expect(html).toContain("OR-2026-00412");
    expect(html).toContain("12 September 2026");
    expect(html).toContain("₱12,000");
    expect(html).toContain("Villa Memorial Plan");
    expect(html).toContain("your family&#x27;s copy of the official receipt");
    // The shared export actions — Print / Word / PDF — come with the sheet.
    expect(html).toContain("Print");
    expect(html).toContain("Word (.docx)");
    expect(html).toContain("PDF");
  });

  it("answers 404 for a receipt that does not exist", async () => {
    await expect(
      ReceiptPage({ params: Promise.resolve({ reference: "OR-NOT-A-RECEIPT" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers 404 for a recorded receipt with no number/date/amount to print", async () => {
    state.snapshot = snapshotWith([
      CONTRACT,
      { title: "Official receipt", status: "Sent", kind: "official_receipt", reference: "OR-HALF" },
    ]);
    await expect(
      ReceiptPage({ params: Promise.resolve({ reference: "OR-HALF" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("staff-only fields never reach the family screen", () => {
  it("ignores anything on the record beyond the family-safe fields", async () => {
    state.snapshot = snapshotWith([
      {
        ...CONTRACT,
        uploaded_by: "Elena Villanueva",
        file_size_bytes: 245000,
        internal_notes: "staff eyes only",
      } as FamilyDocument,
      RECEIPT,
    ]);
    const html = renderToStaticMarkup(await PapersPage());
    expect(html).not.toContain("Elena Villanueva");
    expect(html).not.toContain("245000");
    expect(html).not.toContain("staff eyes only");
    expect(html).not.toContain("file_size_bytes");
    expect(html).not.toContain("uploaded_by");
  });
});
