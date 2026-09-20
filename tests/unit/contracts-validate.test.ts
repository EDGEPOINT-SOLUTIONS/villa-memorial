import { describe, expect, it } from "vitest";
import {
  failShape,
  isRecord,
  optionalString,
  readShape,
  readShapeList,
  requiredString,
} from "@/lib/contracts/validate";
import { ApiError } from "@/lib/api-client/api-error";

/**
 * The shared tolerant-reader layer (platform-contract pre-wire, P2).
 *
 * AGENTS.md: never cast a `fetch` result straight to a domain type. These tests pin
 * the three rules the layer encodes — extra fields ignored, a missing/mistyped
 * REQUIRED field is a 502, an optional field is omitted rather than defaulted.
 */

describe("readShape — extra fields and required fields", () => {
  const SPEC = [
    { key: "id", type: "string" as const },
    { key: "count", type: "integer" as const },
  ];

  it("reads the named fields and ignores extra ones", () => {
    const result = readShape({ id: "x", count: 2, extra: "ignored", nested: {} }, "row", SPEC);
    expect(result).toEqual({ id: "x", count: 2 });
  });

  it("fails a missing required field with a 502", () => {
    expect(() => readShape({ id: "x" }, "row", SPEC)).toThrowError(ApiError);
    try {
      readShape({ id: "x" }, "row", SPEC);
    } catch (err) {
      expect((err as ApiError).status).toBe(502);
      expect((err as ApiError).message).toContain("count");
    }
  });

  it("fails a wrong-typed field with a 502", () => {
    expect(() => readShape({ id: 1, count: 2 }, "row", SPEC)).toThrowError(ApiError);
    expect(() => readShape({ id: "x", count: "2" }, "row", SPEC)).toThrowError(ApiError);
    expect(() => readShape({ id: "x", count: 2.5 }, "row", SPEC)).toThrowError(ApiError);
  });

  it("fails a non-object payload", () => {
    expect(() => readShape(null, "row", SPEC)).toThrowError(ApiError);
    expect(() => readShape([], "row", SPEC)).toThrowError(ApiError);
  });
});

describe("readShape — optional and nullable", () => {
  const SPEC = [
    { key: "id", type: "string" as const },
    { key: "note", type: "string" as const, optional: true },
    { key: "case_number", type: "string" as const, optional: true, nullable: true },
  ];

  it("omits an absent optional field instead of defaulting it", () => {
    expect(readShape({ id: "x" }, "row", SPEC)).toEqual({ id: "x" });
    expect(Object.prototype.hasOwnProperty.call(readShape({ id: "x" }, "row", SPEC), "note")).toBe(
      false,
    );
  });

  it("keeps an explicit null only where nullable is declared", () => {
    expect(readShape({ id: "x", case_number: null }, "row", SPEC)).toEqual({
      id: "x",
      case_number: null,
    });
    expect(() => readShape({ id: "x", note: null }, "row", SPEC)).not.toThrow();
    expect(readShape({ id: "x", note: null }, "row", SPEC)).toEqual({ id: "x" });
  });

  it("validates object and array fields", () => {
    const nested = readShape(
      { id: "x", person: { name: "A" }, tags: ["a"] },
      "row",
      [
        { key: "id", type: "string" as const },
        { key: "person", type: "object" as const },
        { key: "tags", type: "array" as const },
      ],
    );
    expect(nested.person).toEqual({ name: "A" });
    expect(nested.tags).toEqual(["a"]);
  });
});

describe("readShapeList — the frozen { items } envelope", () => {
  it("reads the envelopes the repo's itemsOf() uses", () => {
    const rows = readShapeList({ items: [{ id: "a" }, { id: "b" }] }, "rows", [
      { key: "id", type: "string" as const },
    ]);
    expect(rows).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("fails a payload with no items array", () => {
    expect(() => readShapeList({}, "rows", [])).toThrowError(ApiError);
    expect(() => readShapeList([], "rows", [])).toThrowError(ApiError);
  });
});

describe("primitives", () => {
  it("requiredString rejects empty/mistyped values", () => {
    expect(requiredString({ id: "x" }, "id", "row")).toBe("x");
    expect(() => requiredString({ id: "" }, "id", "row")).toThrowError(ApiError);
    expect(() => requiredString({}, "id", "row")).toThrowError(ApiError);
  });

  it("optionalString returns null rather than a default", () => {
    expect(optionalString({ note: "hi" }, "note")).toBe("hi");
    expect(optionalString({ note: "" }, "note")).toBeNull();
    expect(optionalString({}, "note")).toBeNull();
  });

  it("isRecord and failShape behave", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(() => failShape("thing")).toThrowError(ApiError);
  });
});
