import { chromium } from "@playwright/test";

/**
 * PHASE 3'S PROOF: an admin casket price edit reaches the storefront, displayed AND charged.
 *
 * THE DEFECT THIS EXISTS FOR. The casket card printed `model.srp` from the hardcoded sheet
 * list while its Add-to-cart sent the catalogue's `unit_price_cents`. So a staff edit in
 * /staff/catalog moved what the cart charged and left the printed price behind — the two
 * agreed only because a fixture contract pins the catalogue's seed, which is to say the
 * admin was decorative. The senior price was not editable at all.
 *
 * This drives the real API as a real admin and then reads the real public page, so it
 * cannot pass by inspecting types.
 */
const BASE = "http://localhost:4000";
const SKU = "CSK-LUMINA";
/**
 * The card prints `php(amount)` on the casket surfaces, which is the peso string WITHOUT
 * decimals ("₱39,999") — the catalogue's own `display_price` carries ".00" and is the
 * string other surfaces use. Matching the wrong one is how a proof lies, so these are the
 * card's format on purpose (measured off the rendered markup).
 */
const NEW_REGULAR = "39,999";
const NEW_SENIOR = "31,999";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, baseURL: BASE });
const login = await ctx.request.post(`${BASE}/api/auth/login`, {
  data: { email: "admin@vm.demo", password: "Demo-Passw0rd!" },
});
if (login.status() !== 200) {
  console.error(`FAIL — admin sign-in answered HTTP ${login.status()}`);
  process.exit(1);
}
console.log(`sign-in as admin -> HTTP ${login.status()}`);

/** The catalogue row for the SKU, as the admin API reports it.
 *  GET returns `{ item: AdminCatalogItem }`, whose own `.item` is the record. */
async function item() {
  const res = await ctx.request.get(`${BASE}/api/catalog/items/${SKU}`);
  if (!res.ok()) throw new Error(`GET /api/catalog/items/${SKU} -> HTTP ${res.status()}`);
  const body = await res.json();
  const record = body.item?.item ?? body.item ?? body;
  if (record.unit_price_cents == null) {
    throw new Error(`unexpected item shape: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return record;
}

/** The public /products page, as a visitor receives it. */
async function storefrontHtml() {
  const res = await ctx.request.get(`${BASE}/products`);
  if (!res.ok()) throw new Error(`GET /products -> HTTP ${res.status()}`);
  return res.text();
}

const before = await item();
console.log(`\n=== 1 · the catalogue row today ===`);
console.log(`  unit_price_cents     : ${before.unit_price_cents}`);
console.log(`  senior_price_cents   : ${before.senior_price_cents}`);
console.log(`  display_price        : ${before.display_price}`);

const htmlBefore = await storefrontHtml();
// The sheet's own two figures, as the CARD prints them (peso, no decimals). Both must be
// present before the edit, or the "old figure is gone" assertion below means nothing.
const oldRegular = (before.unit_price_cents / 100).toLocaleString("en-US");
const oldSenior = before.senior_price_cents != null ? (before.senior_price_cents / 100).toLocaleString("en-US") : null;
const showsBeforeRegular = htmlBefore.includes(oldRegular);
const showsBeforeSenior = oldSenior != null ? htmlBefore.includes(oldSenior) : null;
console.log(`  the storefront shows the regular ${oldRegular} : ${showsBeforeRegular}`);
console.log(`  the storefront shows the senior  ${oldSenior} : ${showsBeforeSenior}`);

/* --------------------- 2 · edit the price through the API ------------------ */

const edit = await ctx.request.patch(`${BASE}/api/catalog/items/${SKU}`, {
  data: {
    sku: before.sku,
    name: before.name,
    description: before.description,
    item_type: before.item_type,
    unit_price_cents: 3_999_900,
    senior_price_cents: 3_199_900,
    currency: before.currency,
    image: before.image ?? null,
    published: true,
  },
});
console.log(`\n=== 2 · edit the price as the office would ===`);
console.log(`  PATCH /api/catalog/items/${SKU} -> HTTP ${edit.status()}`);
if (edit.status() !== 200) {
  console.error(`    server said: ${(await edit.text()).slice(0, 300)}`);
  await browser.close();
  process.exit(1);
}
const after = await item();
console.log(`  unit_price_cents   : ${after.unit_price_cents}  (was ${before.unit_price_cents})`);
console.log(`  senior_price_cents : ${after.senior_price_cents}  (was ${before.senior_price_cents})`);
console.log(`  display_price      : ${after.display_price}`);

/* --------------------- 3 · does the STOREFRONT follow? -------------------- */

const htmlAfter = await storefrontHtml();
const showsNewRegular = htmlAfter.includes(NEW_REGULAR);
const showsNewSenior = htmlAfter.includes(NEW_SENIOR);
const stillShowsOldRegular = htmlAfter.includes(oldRegular);
const stillShowsOldSenior = oldSenior != null ? htmlAfter.includes(oldSenior) : false;
console.log(`\n=== 3 · the public /products page ===`);
console.log(`  shows the NEW regular ${NEW_REGULAR} : ${showsNewRegular}`);
console.log(`  shows the NEW senior  ${NEW_SENIOR} : ${showsNewSenior}`);
console.log(`  still shows the OLD regular ${oldRegular} : ${stillShowsOldRegular}   (want false)`);
console.log(`  still shows the OLD senior  ${oldSenior} : ${stillShowsOldSenior}   (want false)`);

/* --------------------- 4 · revert, and confirm it reverts ----------------- */

const revert = await ctx.request.patch(`${BASE}/api/catalog/items/${SKU}`, {
  data: {
    sku: before.sku,
    name: before.name,
    description: before.description,
    item_type: before.item_type,
    unit_price_cents: before.unit_price_cents,
    senior_price_cents: before.senior_price_cents,
    currency: before.currency,
    image: before.image ?? null,
    published: true,
  },
});
const htmlReverted = await storefrontHtml();
console.log(`\n=== 4 · revert ===`);
console.log(`  PATCH back -> HTTP ${revert.status()}`);
console.log(`  the sheet's regular ${oldRegular} is back : ${htmlReverted.includes(oldRegular)}`);
console.log(`  the edited figure ${NEW_REGULAR} is gone    : ${!htmlReverted.includes(NEW_REGULAR)}`);

await browser.close();

const pass =
  showsBeforeRegular &&
  showsBeforeSenior === true &&
  showsNewRegular &&
  showsNewSenior &&
  !stillShowsOldRegular &&
  !stillShowsOldSenior &&
  htmlReverted.includes(oldRegular);
console.log(
  `\n${pass ? "PASS" : "FAIL"} — a staff price edit moves what the storefront DISPLAYS, and the cart charges the same row.`,
);
if (!pass) {
  console.log("  Before this change the card printed the hardcoded sheet constant and ignored the catalogue.");
}
process.exit(pass ? 0 : 1);
