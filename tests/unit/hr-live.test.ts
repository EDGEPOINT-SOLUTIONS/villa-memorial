import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The HR live branch is honestly unimplemented.
 *
 * No hr contract is frozen (D13), so live mode (`HR_BASE_URL` set) must refuse with the
 * named 503 (`HR_NOT_WIRED`) — a `501 "not wired"` is a status a service never answers,
 * and reading the platform-contracts plan's proposed C2 shape straight off a `fetch` is
 * the AGENTS.md tolerant-reader trap. The fixture path is asserted unchanged with the
 * env var unset.
 *
 * `BASE_URL` is captured when the module loads, so each case re-imports after setting
 * (or clearing) the env var — the same pattern `billing-live-write.test.ts` uses.
 */

async function load(env: string | undefined) {
  vi.resetModules();
  if (env === undefined) delete process.env.HR_BASE_URL;
  else process.env.HR_BASE_URL = env;
  return import("@/lib/api-client/hr");
}

function noFetch() {
  return vi.fn(async (input: URL | RequestInfo) => {
    throw new Error(`unexpected fetch: ${String(input)}`);
  });
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.HR_BASE_URL;
});

describe("hr live mode refuses rather than pretending", () => {
  it("enables live mode and refuses every read with the named 503", async () => {
    const fetchSpy = noFetch();
    globalThis.fetch = fetchSpy;
    const hr = await load("https://gateway.example.com");

    expect(hr.hrLiveModeEnabled()).toBe(true);
    await expect(hr.listEmployees()).rejects.toMatchObject({
      status: 503,
      message: hr.HR_NOT_WIRED,
    });
    await expect(hr.getEmployee("00000000-0000-4000-8000-000000000A01")).rejects.toMatchObject({
      status: 503,
      message: hr.HR_NOT_WIRED,
    });

    // The refusal makes no request and reads no fixture — it names why.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("hr fixture path is unchanged", () => {
  it("serves the recorded fixtures with HR_BASE_URL unset and never fetches", async () => {
    const fetchSpy = noFetch();
    globalThis.fetch = fetchSpy;
    const hr = await load(undefined);

    expect(hr.hrLiveModeEnabled()).toBe(false);

    const employees = await hr.listEmployees();
    expect(employees.length).toBeGreaterThan(0);

    const employee = await hr.getEmployee(employees[0].id);
    expect(employee.id).toBe(employees[0].id);
    expect(Array.isArray(employee.attendance)).toBe(true);
    expect(Array.isArray(employee.leave)).toBe(true);

    await expect(hr.getEmployee("missing")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
