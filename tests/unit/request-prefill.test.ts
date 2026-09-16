import { describe, expect, it } from "vitest";
import {
  buildRequestHref,
  parseRequestPrefill,
  requestMessage,
  REQUEST_PATH,
} from "@/lib/public-forms/request-prefill";
import { validateContact } from "@/lib/public-forms/validation";

/**
 * The storefront's request seam: a price-list action link must carry exactly
 * what the visitor clicked to the contact capture, and the capture must never
 * read as a reservation or a purchase. These tests pin the round-trip
 * (build → parse → message), the untrusted-input handling, and that a prefilled
 * message passes the EXISTING contact gate unchanged.
 */
describe("request prefill round-trip", () => {
  const prefill = {
    item: "White Rose Half casket",
    sku: "CSK-WHITE-ROSE-HALF",
    price: "₱62,000.00",
    note: "Senior-citizen price ₱49,600.00.",
  };

  it("carries the item, SKU and published figure through the URL unchanged", () => {
    const href = buildRequestHref(prefill);
    expect(href.startsWith(`${REQUEST_PATH}?`)).toBe(true);
    const parsed = parseRequestPrefill(new URL(href, "https://villa.test").searchParams);
    expect(parsed).toEqual(prefill);
  });

  it("accepts Next's page searchParams record shape", () => {
    const parsed = parseRequestPrefill({
      item: ["Silver 1 plan — Quarterly"],
      sku: "PKG-STANDARD",
      price: "₱3,000.00 / quarter",
      note: undefined,
    });
    expect(parsed?.item).toBe("Silver 1 plan — Quarterly");
    expect(parsed?.sku).toBe("PKG-STANDARD");
    expect(parsed?.price).toBe("₱3,000.00 / quarter");
    expect(parsed?.note).toBeUndefined();
  });

  it("returns null for a plain visit, an empty item, or no params at all", () => {
    expect(parseRequestPrefill(undefined)).toBeNull();
    expect(parseRequestPrefill(new URLSearchParams())).toBeNull();
    expect(parseRequestPrefill({ item: "   " })).toBeNull();
    expect(parseRequestPrefill({ item: "" })).toBeNull();
  });

  it("clamps over-long params instead of trusting the URL", () => {
    const parsed = parseRequestPrefill({ item: "x".repeat(500) });
    expect(parsed?.item.length).toBe(140);
    expect(parsed?.item.endsWith("…")).toBe(true);
  });

  it("names the item, SKU and figure in the message and never claims a reservation", () => {
    const message = requestMessage(prefill);
    expect(message).toContain(prefill.item);
    expect(message).toContain(prefill.sku);
    expect(message).toContain(prefill.price);
    expect(message).toContain(prefill.note);
    expect(message).toMatch(/does not reserve/i);
    expect(message).not.toMatch(/\breserved\b|\bpurchased\b|paid/i);
  });

  it("omits SKU/price lines when the link carried none (e.g. a plan term)", () => {
    const message = requestMessage({ item: "Gold plan — Annual" });
    expect(message).toContain("Gold plan — Annual");
    expect(message).not.toContain("Published 2026 price");
    expect(message).not.toContain("undefined");
  });
});

describe("a prefilled request passes the existing contact gate", () => {
  const valid = {
    full_name: "Maria Dela Cruz",
    email: "maria@example.com",
    phone: "",
    message: requestMessage({
      item: "Prime Lots — Prime Lots",
      price: "₱128,000 regular selling price",
    }),
    consent: true,
  };

  it("validates with no changes to the DPA/field rules", () => {
    expect(validateContact(valid)).toEqual({});
  });
});
