import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildFamilyRequestSlip,
  familyRequestFileStem,
} from "@/lib/contracts/family-request-slip";

/**
 * The family request slip (captain, 2026-09-30): a manager asks the office for
 * something on behalf of ONE loved one, and the request must remember WHICH person
 * and WHICH lot it is about — the office receives that link, not a free-text
 * sentence. These tests pin the payload and the printed page.
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
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/client/requests/slip",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

const input = {
  person_name: "Aurora Dela Cruz",
  life_dates: "1951 – 2024",
  lot_number: "C-02",
  lot_section: "C",
  lot_plan: "Garden Niche · Niche C-02",
  park: "Sanctuario de Mercedes y Gloria",
  kind: { label: "Something at the lot", detail: "Grass, the marker, the path." },
  note: "Please cut the grass before All Souls’.",
  manager_name: "Cory Customer",
  manager_contact: "0917 000 1234",
  manager_email: "customer@vm.demo",
  written_on: "2026-09-30",
};

function blockText(blocks: ReturnType<typeof buildFamilyRequestSlip>["blocks"]): string {
  return blocks
    .map((block) => {
      if (block.kind === "line") return block.text;
      if (block.kind === "table") {
        return block.rows
          .flat()
          .map((cell) => [cell.label, cell.value].filter(Boolean).join(": "))
          .join(" | ");
      }
      return "";
    })
    .join("\n");
}

describe("the request slip names the person and the lot", () => {
  it("prints the loved one, their lot and the park", () => {
    const text = blockText(buildFamilyRequestSlip(input).blocks);
    expect(text).toContain("Aurora Dela Cruz (1951 – 2024)");
    expect(text).toContain("Section C · Lot C-02");
    expect(text).toContain("Garden Niche · Niche C-02");
    expect(text).toContain("Sanctuario de Mercedes y Gloria");
  });

  it("prints the kind of help, the family's own words and who to call", () => {
    const text = blockText(buildFamilyRequestSlip(input).blocks);
    expect(text).toContain("Something at the lot");
    expect(text).toContain("Please cut the grass before All Souls’.");
    expect(text).toContain("Cory Customer");
    expect(text).toContain("0917 000 1234");
    expect(text).toContain("30 September 2026");
  });

  it("is not a ticket, carries no amount, and says nothing is booked", () => {
    const text = blockText(buildFamilyRequestSlip(input).blocks);
    expect(text).toContain("This is a request, not a ticket");
    expect(text).toContain("nothing is booked");
    expect(text).not.toMatch(/₱/);
    expect(text).not.toMatch(/#\d{3,}/);
  });

  it("prints the honest em dash when the family added no words", () => {
    const text = blockText(buildFamilyRequestSlip({ ...input, note: undefined }).blocks);
    expect(text).toContain("In the family's words: —");
  });

  it("names the export file after the person and the day", () => {
    expect(familyRequestFileStem("Aurora Dela Cruz", "2026-09-30")).toBe(
      "Request-from-the-family-Aurora-Dela-Cruz-2026-09-30",
    );
  });
});

describe("the printed request page", () => {
  it("renders the slip for the chosen person through the shared paper sheet", async () => {
    const { default: SlipPage } = await import("@/app/(family)/client/requests/slip/page");
    const html = renderToStaticMarkup(
      await SlipPage({
        searchParams: Promise.resolve({
          person: "aurora-dela-cruz",
          kind: "lot",
          note: "Please cut the grass.",
        }),
      }),
    );
    expect(html).toContain('data-paper-sheet');
    expect(html).toContain("REQUEST FROM THE FAMILY");
    expect(html).toContain("Aurora Dela Cruz");
    expect(html).toContain("Section C · Lot C-02");
    expect(html).toContain("Please cut the grass.");
    // The shared export actions — Print / Word / PDF — come with the sheet.
    expect(html).toContain("Word (.docx)");
    expect(html).toContain("PDF");
  });

  it("answers 404 for a person the household does not carry", async () => {
    const { default: SlipPage } = await import("@/app/(family)/client/requests/slip/page");
    await expect(
      SlipPage({ searchParams: Promise.resolve({ person: "someone-else" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
