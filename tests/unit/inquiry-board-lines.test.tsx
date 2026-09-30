import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InquiryBoard } from "@/app/(staff)/staff/inquiries/inquiry-board";
import type { Inquiry } from "@/lib/api-client/crm";

/**
 * D6-A: the office receives STRUCTURED line items. These pin the board's own
 * rendering of them — one row per line, its SKU, the published figure where it
 * has one, and a "Needs pricing" flag on every line the coordinator must price
 * by hand — instead of the one free-text blob this replaced.
 */
const inquiry: Inquiry = {
  id: "inq-1",
  reference: "INQ-2026-00099",
  person: { full_name: "Maria Dela Cruz", email: "maria@example.com", phone: "+63 917 000 0000" },
  source: "website",
  topic: "Quote request — 2 items",
  message: "Please call after 6pm.",
  assigned_to: "Unassigned",
  status: "new",
  received_at: "2026-09-30T02:00:00.000Z",
  lines: [
    {
      sku: "SRV-RETRIEVAL",
      name: "Retrieval",
      kind: "service",
      pricingMode: "on_request",
      unitPriceCents: null,
      currency: null,
      quantity: 1,
      detail: "Same week as the burial",
    },
    {
      sku: "LOT-MAUSOLEUM",
      name: "Mausoleum — memorial lot",
      kind: "lot",
      pricingMode: "published",
      unitPriceCents: 107300000,
      currency: "PHP",
      quantity: 1,
      dateRange: "24 sqm · 1. Lot Only · lot only",
    },
  ],
};

describe("the office board renders structured quote lines (D6-A)", () => {
  it("shows one row per line, its SKU, the figure and a needs-pricing flag", () => {
    const html = renderToStaticMarkup(
      createElement(InquiryBoard, {
        initialInquiries: [inquiry],
        statusTone: { new: "info" },
        canCapture: false,
      }),
    );
    expect(html).toContain("Quote request — 2 items");
    expect(html).toContain("SRV-RETRIEVAL");
    expect(html).toContain("LOT-MAUSOLEUM");
    expect(html).toContain("Needs pricing");
    expect(html).toContain("1,073,000.00");
    expect(html).toContain("Please call after 6pm.");
    expect(html).toContain("Same week as the burial");
  });
});
