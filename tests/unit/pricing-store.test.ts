import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";
import {
  listPricingQuestions,
  loadPricingDocument,
  PRICING_ADMIN_NOT_WIRED,
  saveLotPricing,
  savePlanPricing,
} from "@/lib/api-client/pricing";
import { checkPlanPricing, type LotCategory, type PlanPricing } from "@/lib/pricing-model";
import { LOT_PRICE_CATEGORIES, SEED_PRICING, VMP_PAYMENTS } from "@/lib/villa-pricing";

/**
 * The durable fixture-mode pricing store: the office edit must survive a reload,
 * the public read must return it, and an invariant-breaking edit must be refused
 * without touching the stored document. Every test gets its own throwaway
 * PRICING_STORE_PATH (never the repo's .data store).
 */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let dir: string;
let storePath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "villa-pricing-store-"));
  storePath = path.join(dir, "pricing.json");
  process.env.PRICING_STORE_PATH = storePath;
  delete process.env.COMMERCE_BASE_URL;
});

afterEach(async () => {
  delete process.env.PRICING_STORE_PATH;
  delete process.env.COMMERCE_BASE_URL;
  await rm(dir, { recursive: true, force: true });
});

/** A valid edit: Bronze 1 monthly 619 (annual 7,428) — a number no sheet cell has. */
function editedPlans(): PlanPricing {
  const plans = clone(SEED_PRICING.plans);
  const monthly = plans.regular.find((r) => r.mode === "Monthly")!;
  monthly.bronze1 = 619;
  plans.regular.find((r) => r.mode === "Annual")!.bronze1 = 619 * 12;
  plans.regular.find((r) => r.mode === "Semi-annual")!.bronze1 = 619 * 6;
  plans.regular.find((r) => r.mode === "Quarterly")!.bronze1 = 619 * 3;
  return plans;
}

/** A valid lot edit: Prime Lots regular selling ₱130,000 with annual 21,667. */
function editedLots(): LotCategory[] {
  const categories = clone(LOT_PRICE_CATEGORIES);
  const prime = categories[0].rows.find((r) => r.product === "Prime Lots")!;
  prime.regular.selling = 130000;
  prime.regular.annual = 21667;
  return categories;
}

describe("fixture-mode pricing store", () => {
  it("reads the recorded seed when no store file exists", async () => {
    const pricing = await loadPricingDocument();
    expect(pricing.plans.regular).toEqual(VMP_PAYMENTS);
    expect(pricing.lotCategories).toEqual(LOT_PRICE_CATEGORIES);
    expect(pricing.updated_at).toBeNull();
    expect(pricing.updated_by).toBeNull();
  });

  it("persists a plan-rate edit and the next read returns it", async () => {
    const saved = await savePlanPricing(editedPlans(), "Sam Staff");
    expect(saved.updated_by).toBe("Sam Staff");
    expect(saved.updated_at).not.toBeNull();
    expect(saved.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(619);

    // A fresh read (what a public page does) sees the edit.
    const reread = await loadPricingDocument();
    expect(reread.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(619);
    expect(reread.plans.regular.find((r) => r.mode === "Annual")!.bronze1).toBe(7428);
    // The untouched slice travelled with it.
    expect(reread.lotCategories).toEqual(LOT_PRICE_CATEGORIES);

    // The journal is a real file on disk (survives a process restart).
    const journal = JSON.parse(await readFile(storePath, "utf8")) as {
      version: number;
      events: unknown[];
    };
    expect(journal.version).toBe(1);
    expect(journal.events).toHaveLength(1);
  });

  it("persists a lot-price edit without clobbering a previously saved plan edit", async () => {
    await savePlanPricing(editedPlans(), "Sam Staff");
    const savedLots = await saveLotPricing(editedLots(), "Sam Staff");
    expect(savedLots.lotCategories[0].rows.find((r) => r.product === "Prime Lots")!.regular.selling).toBe(
      130000,
    );
    expect(savedLots.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(619);

    const reread = await loadPricingDocument();
    expect(reread.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(619);
    expect(
      reread.lotCategories[0].rows.find((r) => r.product === "Prime Lots")!.regular.selling,
    ).toBe(130000);
  });

  it("refuses an invariant-breaking plan edit with a 422 and stores nothing", async () => {
    const broken = editedPlans();
    broken.regular.find((r) => r.mode === "Monthly")!.bronze1 = 500; // annual stays 7,428
    await expect(savePlanPricing(broken, "Sam Staff")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
    });
    // Nothing was written: the seed still reads as the published document.
    const reread = await loadPricingDocument();
    expect(reread.updated_at).toBeNull();
    expect(reread.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(600);
    await expect(readFile(storePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses a lot edit whose senior figure exceeds the regular cell", async () => {
    const broken = editedLots();
    const prime = broken[0].rows.find((r) => r.product === "Prime Lots")!;
    prime.senior.selling = prime.regular.selling + 1;
    await expect(saveLotPricing(broken, "Sam Staff")).rejects.toMatchObject({ status: 422 });
    expect((await loadPricingDocument()).updated_at).toBeNull();
  });

  it("fails loudly when the store file is corrupt (never serves half a schedule)", async () => {
    const broken = clone(SEED_PRICING.plans);
    broken.regular.find((r) => r.mode === "Monthly")!.bronze1 = 1;
    await writeFile(
      storePath,
      JSON.stringify({
        version: 1,
        events: [
          {
            kind: "document_saved",
            at: new Date().toISOString(),
            actor: "Hand edited",
            document: { ...SEED_PRICING, plans: broken },
          },
        ],
      }),
    );
    await expect(loadPricingDocument()).rejects.toMatchObject({ status: 500 });
  });

  it("keeps the client questions outside the editable document", async () => {
    await savePlanPricing(editedPlans(), "Sam Staff");
    const questions = await listPricingQuestions();
    expect(questions.map((q) => q.id)).toEqual([
      "senior-rate-sheet-conflict",
      "lot-a001-fixture-vs-sheet",
    ]);
    expect(questions.map((q) => q.scope)).toEqual(["plans", "lots"]);
    // A saved document can never carry or drop them.
    const pricing = (await loadPricingDocument()) as unknown as Record<string, unknown>;
    expect("questions" in pricing).toBe(false);
  });

  it("accepts the seed through the same validator the save path uses", () => {
    expect(checkPlanPricing(SEED_PRICING.plans)).toBeNull();
  });
});

describe("live mode", () => {
  it("refuses admin writes with an honest 503 while reads keep the recorded sheet", async () => {
    process.env.COMMERCE_BASE_URL = "https://gateway.example";
    await expect(savePlanPricing(editedPlans(), "Sam Staff")).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: PRICING_ADMIN_NOT_WIRED,
    });
    expect(PRICING_ADMIN_NOT_WIRED).toMatch(/no frozen catalog-pricing write contract/);
    // The published sheets are content: the public read still serves them.
    const pricing = await loadPricingDocument();
    expect(pricing.plans.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(600);
  });

  it("exports a single ApiError class for the refusal", () => {
    expect(new ApiError(PRICING_ADMIN_NOT_WIRED, 503)).toBeInstanceOf(ApiError);
  });
});
