import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { familyAskHref, parseFamilyAsk, readFamilyAskSubmission } from "@/lib/family/ask";
import { listInquiries } from "@/lib/api-client/crm";
import {
  listFixtureInquiriesForUser,
  receiveInquiry,
} from "@/lib/api-client/inquiry-store";
import { listFamilyInquiries } from "@/lib/api-client/family";
import { safePortalReturnPath } from "@/lib/auth/destination";

/**
 * The family plan & lot inquiry gate (captain, 2026-10-02).
 *
 * "people will not be able to inquire plans and lots until they created their
 * family account… then after they logged in, all their inquiries will now be
 * tracked in their family portal."
 *
 * These pin the three promises of that sentence:
 *   · the gate refuses a signed-out visitor and sends them to the family sign-in
 *     carrying the ask as the return path;
 *   · a signed-in ask is recorded against the account, in the SAME durable store
 *     the office board reads;
 *   · the family portal's own read shows the account's inquiries and nobody
 *     else's — services and products (no account) never appear.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const redirects = vi.hoisted(() => ({ hrefs: [] as string[] }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/client/ask",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  redirect: (href: string) => {
    redirects.hrefs.push(href);
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
}));

/** The session cookie jar the mocked `cookies()` reads. */
const jar = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.values.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const FAMILY_USER = "00000000-0000-4000-8000-000000000014";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-family-inquiries-"));
  process.env.INQUIRIES_STORE_PATH = path.join(dir, "inquiries.json");
  jar.values.clear();
  redirects.hrefs = [];
});

afterEach(async () => {
  delete process.env.INQUIRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

/** Sign the demo family persona in through the real fixture auth, for the jar. */
async function signInFamily() {
  const { login } = await import("@/lib/api-client/fixture-auth");
  const result = await login("customer@vm.demo", "Demo-Passw0rd!");
  jar.values.set("im_at", result.accessToken);
  jar.values.set(
    "im_u",
    Buffer.from(JSON.stringify(result.user), "utf8").toString("base64"),
  );
  return result;
}

describe("the ask link round-trip (one reading on both sides)", () => {
  it("carries the kind, item, price, amount and note through the URL", () => {
    const href = familyAskHref({
      kind: "lot",
      item: "Lot A-001 (Section A · Block 1 · 2.5 sqm)",
      price: "₱16,095 / month",
      amountCents: 1_609_500,
      note: "Asking does not reserve the lot.",
    });
    expect(href.startsWith("/client/ask?")).toBe(true);
    const ask = parseFamilyAsk(new URL(href, "https://villa.test").searchParams);
    expect(ask).toEqual({
      kind: "lot",
      item: "Lot A-001 (Section A · Block 1 · 2.5 sqm)",
      price: "₱16,095 / month",
      amountCents: 1_609_500,
      note: "Asking does not reserve the lot.",
    });
  });

  it("returns null with no kind or no item, so the gate shows its honest state", () => {
    expect(parseFamilyAsk(undefined)).toBeNull();
    expect(parseFamilyAsk(new URLSearchParams())).toBeNull();
    expect(parseFamilyAsk({ kind: "plan", item: "   " })).toBeNull();
    expect(parseFamilyAsk({ item: "Silver 1 plan" })).toBeNull();
  });

  it("refuses a tampered confirmation body", () => {
    expect(readFamilyAskSubmission({ kind: "banana", item: "x" })).toMatchObject({ ok: false });
    expect(readFamilyAskSubmission({ kind: "plan", item: "" })).toMatchObject({ ok: false });
    expect(readFamilyAskSubmission({ kind: "lot", item: "Lot A" }).ok).toBe(true);
  });
});

describe("POST /api/family/inquiries", () => {
  it("refuses a signed-out ask and records nothing", async () => {
    const { POST } = await import("@/app/api/family/inquiries/route");
    const res = await POST(
      new Request("http://localhost/api/family/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "lot", item: "Lot A-001" }),
      }),
    );
    expect(res.status).toBe(401);
    expect(await listInquiries()).toHaveLength(3); // the recorded front-desk seed only
  });

  it("records a signed-in lot ask against the account, where the office board finds it", async () => {
    await signInFamily();
    const { POST } = await import("@/app/api/family/inquiries/route");
    const res = await POST(
      new Request("http://localhost/api/family/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "lot",
          item: "Lot A-001 (Section A, block 1)",
          sku: "LOT-A-001",
          price: "₱16,095 / month",
          amountCents: 1_609_500,
          note: "Asking does not reserve the lot.",
        }),
      }),
    );
    expect(res.status).toBe(201);

    // The office's own reader sees the row, with the account stamped on it.
    const board = await listInquiries();
    const row = board.find((r) => r.person.email === "customer@vm.demo");
    expect(row, "the office board must see the family's own ask").toBeDefined();
    expect(row!.user_id).toBe(FAMILY_USER);
    expect(row!.topic).toBe("Lot inquiry — Lot A-001 (Section A, block 1)");
    expect(row!.lines?.[0]).toMatchObject({
      kind: "lot",
      sku: "LOT-A-001",
      pricingMode: "published",
      unitPriceCents: 1_609_500,
    });

    // And the family's own read serves exactly that row.
    const mine = await listFixtureInquiriesForUser(FAMILY_USER);
    expect(mine).toHaveLength(1);
    expect(mine[0].reference).toBe(row!.reference);
  });

  it("records a plan ask as a plan line, on-request when no figure was carried", async () => {
    await signInFamily();
    const { POST } = await import("@/app/api/family/inquiries/route");
    const res = await POST(
      new Request("http://localhost/api/family/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "plan", item: "Bronze 2 plan — Monthly" }),
      }),
    );
    expect(res.status).toBe(201);
    const mine = await listFamilyInquiries(FAMILY_USER);
    expect(mine).toHaveLength(1);
    expect(mine[0].kind).toBe("plan");
    expect(mine[0].title).toBe("Bronze 2 plan — Monthly");
    expect(mine[0].status).toBe("With the office");
  });
});

describe("the family portal's own read", () => {
  it("shows the account's inquiries and never another family's or a public one", async () => {
    const intake = {
      full_name: "Walk-in",
      email: "desk@example.com",
      phone: "0917",
      source: "walk_in" as const,
      topic: "Front desk",
      message: "",
      assigned_to: "Unassigned",
    };
    await receiveInquiry({ intake, user_id: "someone-else" });
    await receiveInquiry({ intake }); // a public service request: no account

    expect(await listFamilyInquiries(FAMILY_USER)).toEqual([]);
    expect(await listFamilyInquiries("someone-else")).toHaveLength(1);
    expect(await listFamilyInquiries()).toEqual([]);
  });
});

describe("the gate page", () => {
  it("sends a signed-out visitor to the family sign-in with the ask as the return path", async () => {
    const { default: FamilyAskPage } = await import("@/app/(family)/client/ask/page");
    const ask = "Lot A-001";
    await expect(
      FamilyAskPage({
        searchParams: Promise.resolve({ kind: "lot", item: ask }),
      } as never),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    expect(redirects.hrefs).toHaveLength(1);
    const href = redirects.hrefs[0];
    expect(href.startsWith("/client/login?next=")).toBe(true);
    const next = new URLSearchParams(href.slice("/client/login?".length)).get("next");
    expect(next).toBe(familyAskHref({ kind: "lot", item: ask }));
  });

  it("renders the captain's exact lot wording for a signed-in family", async () => {
    await signInFamily();
    const { default: FamilyAskPage } = await import("@/app/(family)/client/ask/page");
    const html = renderToStaticMarkup(
      await FamilyAskPage({
        searchParams: Promise.resolve({
          kind: "lot",
          item: "Lot A-001 (Section A, block 1)",
          price: "₱16,095 / month",
        }),
      } as never),
    );
    expect(html).toContain("Ask about this lot");
    expect(html).toContain("Lot A-001 (Section A, block 1)");
    expect(html).toContain("Send inquiry");
  });

  it("renders the plan wording for a plan ask", async () => {
    await signInFamily();
    const { default: FamilyAskPage } = await import("@/app/(family)/client/ask/page");
    const html = renderToStaticMarkup(
      await FamilyAskPage({
        searchParams: Promise.resolve({ kind: "plan", item: "Gold plan — Annual" }),
      } as never),
    );
    expect(html).toContain("Ask about this plan");
  });
});

describe("the sign-in return path is validated (never an open redirect)", () => {
  it("accepts a same-portal path and rejects a host, a scheme or another portal", () => {
    expect(safePortalReturnPath("/client/ask?kind=lot&item=Lot+A", "family")).toBe(
      "/client/ask?kind=lot&item=Lot+A",
    );
    expect(safePortalReturnPath("https://evil.example/client/ask", "family")).toBeNull();
    expect(safePortalReturnPath("//evil.example/client/ask", "family")).toBeNull();
    expect(safePortalReturnPath("/agent/dashboard", "family")).toBeNull();
    expect(safePortalReturnPath("/client", "family")).toBeNull();
    expect(safePortalReturnPath("", "family")).toBeNull();
  });

  it("the login route returns the family to the ask after a valid sign-in", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "customer@vm.demo",
          password: "Demo-Passw0rd!",
          next: "/client/ask?kind=lot&item=Lot+A-001",
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { redirectTo: string };
    expect(body.redirectTo).toBe("/client/ask?kind=lot&item=Lot+A-001");
  });

  it("the login route ignores a hostile next and lands on the portal home", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "customer@vm.demo",
          password: "Demo-Passw0rd!",
          next: "https://evil.example/steal",
        }),
      }) as never,
    );
    const body = (await res.json()) as { redirectTo: string };
    expect(body.redirectTo).toBe("/client/dashboard");
  });
});
