/**
 * The ONE field-by-field validation layer for live responses and recorded fixtures.
 *
 * AGENTS.md's tolerant-reader rule: never cast a `fetch` result straight to a domain
 * type. A response is read field by field, extra fields are ignored, a missing or
 * mistyped REQUIRED field fails the read loudly (a 502 at the seam), and an optional
 * field is OMITTED rather than defaulted to a fabricated value.
 *
 * This module holds no domain vocabulary — the caller supplies the field list. The
 * per-service `toX` readers (property.ts, operations.ts, …) keep their own shapes;
 * this is the shared primitive new and pre-wired readers use, so the rule cannot be
 * re-implemented slightly differently per module.
 */
import { ApiError } from "@/lib/api-client/api-error";

export type ShapeFieldType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "object"
  | "array";

export type ShapeField = {
  key: string;
  type: ShapeFieldType;
  /** Absent/undefined is allowed; an absent optional field is omitted from the result. */
  optional?: boolean;
  /** An explicit null is allowed. Without this, a null is a failure (or omitted when optional). */
  nullable?: boolean;
};

export type ShapeValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The tolerant-reader failure: a malformed payload is a 502, never a cast. */
export function failShape(what: string): never {
  throw new ApiError(`malformed ${what}`, 502);
}

function matchesType(value: unknown, type: ShapeFieldType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return isRecord(value);
    case "array":
      return Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Read one object against a field spec. Extra keys are ignored. A required field
 * that is absent, null (unless `nullable`) or the wrong type fails the read; an
 * optional field that is absent or null is simply omitted from the result — callers
 * must then treat "absent" as "not recorded", never substitute a default.
 */
export function readShape(
  raw: unknown,
  what: string,
  fields: readonly ShapeField[],
): Record<string, ShapeValue> {
  if (!isRecord(raw)) failShape(what);
  const out: Record<string, ShapeValue> = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (value === undefined) {
      if (field.optional) continue;
      failShape(`${what} (${field.key} is missing)`);
    }
    if (value === null) {
      // An explicit null is kept only where the spec declares it. Otherwise it is
      // treated as absent: optional omits it, required fails.
      if (field.nullable) {
        out[field.key] = null;
        continue;
      }
      if (field.optional) continue;
      failShape(`${what} (${field.key} is missing)`);
    }
    if (!matchesType(value, field.type)) failShape(`${what} (${field.key} is not ${field.type})`);
    out[field.key] = value as ShapeValue;
  }
  return out;
}

/**
 * Read a list of objects against an item spec. The upstream list shape is the frozen
 * `{ items: [...] }` envelope this repo's `itemsOf()` uses; extra keys are ignored.
 */
export function readShapeList(
  raw: unknown,
  what: string,
  fields: readonly ShapeField[],
): Array<Record<string, ShapeValue>> {
  if (!isRecord(raw) || !Array.isArray(raw.items)) failShape(what);
  return (raw.items as unknown[]).map((item) => readShape(item, what, fields));
}

/** A required non-empty string, or the shape failure. */
export function requiredString(row: Record<string, unknown>, key: string, what: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") failShape(`${what} (${key})`);
  return value;
}

/** A non-empty string when present, otherwise null — never a default. */
export function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
