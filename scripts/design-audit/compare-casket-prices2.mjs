import fs from "node:fs";

/**
 * Does a casket card print one price and charge another?
 *
 * THE CLAIM UNDER TEST. `components/villa/casket-catalogue.tsx`:
 *   · line 90 renders `amount(model.srp)` as the headline price
 *   · line 94 renders `amount(model.seniorPrice)` as the senior line
 *   · line 56 builds the cart item with `unitPriceCents: item.unit_price_cents`
 *     — the CATALOGUE item's price
 * so the number a family READS comes from a constant in the code while the number
 * the cart CHARGES comes from the catalogue the admin edits.
 *
 * A first attempt at this comparison joined on a regex that matched nothing and
 * reported "24 of 24 have no catalogue item" — a false alarm from my own script,
 * not a finding. This version derives each SKU the way `lib/catalogue-skus.ts`
 * does (`CSK-` + the model slug) and PROVES the join by requiring all 24 to match.
 */
const items = JSON.parse(fs.readFileSync("lib/fixtures/commerce/catalog-items.json", "utf8"));
const catalog = new Map((items.items ?? items).map((i) => [i.sku, i]));

const pricing = fs.readFileSync("lib/villa-pricing.ts", "utf8");
const models = [...pricing.matchAll(
  /\{\s*collection:\s*"([^"]*)",\s*family:\s*"([^"]*)",\s*model:\s*"([^"]*)",\s*srp:\s*(\d+),\s*seniorDiscount:\s*(\d+),\s*seniorPrice:\s*(\d+)\s*\}/g
)].map((m) => ({
  collection: m[1],
  model: m[3],
  srp: Number(m[4]),
  seniorDiscount: Number(m[5]),
  seniorPrice: Number(m[6]),
}));

const slug = (s) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const skuOf = (model) => `CSK-${slug(model)}`;

console.log(`  models parsed from lib/villa-pricing.ts : ${models.length}`);
const joined = models.filter((m) => catalog.has(skuOf(m.model)));
console.log(`  models whose derived SKU is in the catalogue : ${joined.length}`);
if (joined.length !== models.length) {
  console.log("  !! the join is incomplete, so the comparison below is NOT trustworthy:");
  for (const m of models.filter((m) => !catalog.has(skuOf(m.model)))) {
    console.log(`     ${m.model} -> ${skuOf(m.model)} (not in the catalogue)`);
  }
  process.exit(1);
}
console.log("  the derived-SKU join matched every model — the comparison is sound\n");

console.log("  model                  code srp    catalogue   same?   code senior  catalogue senior");
let priceDiff = 0;
let seniorDiff = 0;
let noSenior = 0;
for (const m of models) {
  const item = catalog.get(skuOf(m.model));
  const cat = (item.unit_price_cents ?? 0) / 100;
  const same = cat === m.srp;
  if (!same) priceDiff++;
  const catSenior = item.senior_price_cents != null ? item.senior_price_cents / 100 : null;
  if (catSenior == null) noSenior++;
  else if (catSenior !== m.seniorPrice) seniorDiff++;
  console.log(
    `  ${m.model.slice(0, 21).padEnd(22)} ${String(m.srp).padStart(8)}   ${String(cat).padStart(9)}   ${(same ? "yes" : "NO").padEnd(6)}  ${String(m.seniorPrice).padStart(10)}  ${catSenior == null ? "      none" : String(catSenior).padStart(15)}`
  );
}

console.log(`\n  HEADLINE PRICE differences : ${priceDiff} of ${models.length}`);
console.log(`  SENIOR PRICE differences   : ${seniorDiff}`);
console.log(`  catalogue rows with NO senior price field : ${noSenior}`);
console.log(
  priceDiff === 0
    ? "\n  The two sources agree TODAY — so this is a latent divergence, not a visible\n  contradiction. Editing a casket price in /staff/catalog would make the card\n  print the old figure while the cart charges the new one."
    : "\n  *** THE CARD AND THE CART DISAGREE RIGHT NOW ***"
);
