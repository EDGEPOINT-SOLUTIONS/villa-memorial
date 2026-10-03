import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The CRM live branch is honestly unimplemented.
 *
 * No crm-families contract is frozen (D3), so live mode (`CRM_BASE_URL` set) must refuse
 * with the named 503 (`CRM_NOT_WIRED`) — a `501 "not wired"` is a status a service never
 * answers, and reading the platform-contracts plan's proposed C1 shape straight off a
 * `fetch` is the AGENTS.md tolerant-reader trap. The fixture path is asserted unchanged
 * with the env var unset.
 *
 * `BASE_URL` is captured when the module loads, so each case re-imports after setting
 * (or clearing) the env var — the same pattern `billing-live-write.test.ts` uses.
 */

async function load(env: string | undefined) {
  vi.resetModules();
  if (env === undefined) delete process.env.CRM_BASE_URL;
  else process.env.CRM_BASE_URL = env;
  return import("@/lib/api-client/crm");
}

function noFetch() {
  return vi.fn(async (input: URL | RequestInfo) => {
    throw new Error(`unexpected fetch: ${String(input)}`);
  });
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.CRM_BASE_URL;
});

describe("crm live mode refuses rather than pretending", () => {
  it("enables live mode and refuses every read with the named 503", async () => {
    const fetchSpy = noFetch();
    globalThis.fetch = fetchSpy;
    const crm = await load("https://gateway.example.com");

    expect(crm.crmLiveModeEnabled()).toBe(true);
    await expect(crm.listCustomers()).rejects.toMatchObject({
      status: 503,
      message: crm.CRM_NOT_WIRED,
    });
    await expect(crm.listInquiries()).rejects.toMatchObject({
      status: 503,
      message: crm.CRM_NOT_WIRED,
    });
    await expect(crm.getCustomer("00000000-0000-4000-8000-000000000101")).rejects.toMatchObject({
      status: 503,
      message: crm.CRM_NOT_WIRED,
    });

    // The refusal makes no request and reads no fixture — it names why.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("crm fixture path is unchanged", () => {
  it("serves the clean fixtures with CRM_BASE_URL unset and never fetches", async () => {
    const fetchSpy = noFetch();
    globalThis.fetch = fetchSpy;
    const crm = await load(undefined);

    expect(crm.crmLiveModeEnabled()).toBe(false);

    // Clean start (captain, 2026-10-02): the recorded demo customers and
    // enquiries are removed, so fixture mode serves empty lists.
    expect(await crm.listCustomers()).toEqual([]);
    expect(await crm.listInquiries()).toEqual([]);

    await expect(crm.getCustomer("missing")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
