/**
 * design-audit — real-browser evidence for the UI/UX review.
 *
 * Not a unit test: it drives the running app in Chromium, captures screenshots
 * at phone + desk widths, and measures the things a screenshot review cannot
 * see — contrast, tap targets, gradient usage on controls, accent density,
 * horizontal overflow, and type below the 12px floor.
 *
 * Usage:  node scripts/design-audit/audit.mjs [--base http://localhost:4000]
 * Output: .design-audit/report.json, .design-audit/summary.md, .design-audit/shots/*
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:4000";

const OUT = ".design-audit";
const SHOTS = path.join(OUT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "desk", width: 1440, height: 900, mobile: false },
];

const PERSONAS = {
  anon: null,
  admin: { email: "admin@vm.demo", password: "Demo-Passw0rd!" },
  staff: { email: "staff@vm.demo", password: "Demo-Passw0rd!" },
  agent: { email: "agent@vm.demo", password: "Demo-Passw0rd!" },
  customer: { email: "customer@vm.demo", password: "Demo-Passw0rd!" },
};

/** Which door a route needs. */
function personaFor(url) {
  if (url.startsWith("/staff/")) return "staff";
  if (url.startsWith("/client/")) return "customer";
  if (url.startsWith("/agent/")) return "agent";
  if (url.startsWith("/platform/") && url !== "/platform/sign-in" && url !== "/platform/sign-up")
    return "admin";
  return "anon";
}

/* ------------------------------------------------------------ in-page probe --- */

const PROBE = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 255, g: 255, b: 255, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a,
    };
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /** Effective background behind an element, walking ancestors. */
  const bgOf = (el) => {
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    const chain = [];
    let n = el;
    while (n && n !== document.documentElement.parentNode) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") chain.push("image");
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) chain.push(c);
      n = n.parentElement;
    }
    // composite from the furthest ancestor inward
    for (let i = chain.length - 1; i >= 0; i--) {
      if (chain[i] === "image") return { bg: acc, overImage: true };
      acc = over(chain[i], acc);
    }
    return { bg: acc, overImage: false };
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return false;
    return true;
  };

  // The accent ramp. These MUST track styles/tokens.css: when the brass ramp
  // replaced gold in the 2026-09-27 rebuild this list still held the old golds,
  // so the accent metric quietly reported zero on every route and looked like a
  // triumph. A metric that cannot fail is not a metric.
  const ACCENT = [
    "#fbf3e0", "#f4e3bd", "#e7cb8c", "#d4ab56", "#b8842a", "#966719", "#6d4b11",
  ];

  /* ---- contrast on real text ---- */
  const contrast = [];
  const textEls = [...document.querySelectorAll("body *")].filter((el) => {
    if (!visible(el)) return false;
    const t = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1
    );
    return t;
  });
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue;
    const { bg, overImage } = bgOf(el);
    const fgc = over(fg, bg);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const r = ratio(fgc, bg);
    if (r < need) {
      contrast.push({
        text: el.textContent.trim().slice(0, 60),
        sel: el.className && typeof el.className === "string"
          ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
          : el.tagName.toLowerCase(),
        ratio: Math.round(r * 100) / 100,
        need,
        fontSize: size,
        fg: cs.color,
        overImage,
      });
    }
  }

  /* ---- gradients on interactive elements ---- */
  const gradients = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.backgroundImage && cs.backgroundImage.includes("gradient")) {
      const interactive =
        el.matches("button, a, [role=button], input, select, .btn") ||
        el.closest("button, a, [role=button]") === el;
      gradients.push({
        sel: el.className && typeof el.className === "string"
          ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
          : el.tagName.toLowerCase(),
        interactive,
        image: cs.backgroundImage.slice(0, 90),
      });
    }
  }

  /* ---- accent (gold/brass) density ---- */
  let accentEls = 0;
  const accentSamples = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    let hit = false;
    for (const raw of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
      const c = parse(raw);
      if (!c || c.a === 0) continue;
      const hex =
        "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
      if (ACCENT.includes(hex)) hit = true;
    }
    if (hit) {
      accentEls++;
      if (el.className && typeof el.className === "string")
        accentSamples.add(el.className.trim().split(/\s+/)[0]);
    }
  }

  /* ---- tap targets ---- */
  const smallTargets = [];
  for (const el of document.querySelectorAll("a, button, [role=button], input, select, textarea")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      smallTargets.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
  }

  /* ---- type below the 12px floor ---- */
  const tiny = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const hasText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 0
    );
    if (!hasText) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12) tiny.push({ size, text: el.textContent.trim().slice(0, 40) });
  }

  /* ---- structure ---- */
  const imgs = [...document.querySelectorAll("img")];
  return {
    title: document.title,
    h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim().slice(0, 80)),
    h1Count: document.querySelectorAll("h1").length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    contrast: contrast.slice(0, 40),
    contrastCount: contrast.length,
    gradients: gradients.slice(0, 30),
    gradientCount: gradients.length,
    interactiveGradientCount: gradients.filter((g) => g.interactive).length,
    accentEls,
    accentSamples: [...accentSamples].slice(0, 12),
    smallTargets: smallTargets.slice(0, 40),
    smallTargetCount: smallTargets.length,
    tiny,
    tinyCount: tiny.length,
    imgCount: imgs.length,
    imgNoAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
    textLength: document.body.innerText.replace(/\s+/g, " ").trim().length,
  };
};

/* ------------------------------------------------------------------ crawl --- */

async function crawl(context) {
  const seen = new Set();
  const queue = ["/"];
  const found = new Set();
  while (queue.length && found.size < 200) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const page = await context.newPage();
      await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 20000 });
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"))
      );
      await page.close();
      for (const h of hrefs) {
        if (!h || !h.startsWith("/") || h.startsWith("//")) continue;
        const clean = h.split("#")[0].split("?")[0];
        if (!clean || clean.startsWith("/api") || clean.startsWith("/_next")) continue;
        if (/\.(png|jpg|svg|pdf|ico|webp|xml|txt)$/i.test(clean)) continue;
        found.add(clean);
        if (!seen.has(clean) && queue.length < 400) queue.push(clean);
      }
    } catch {
      /* a dead link is not a crawl failure */
    }
  }
  return [...found];
}

/* ------------------------------------------------------------------- main --- */

const browser = await chromium.launch();
// One context per (persona × viewport): viewport/mobile/touch are CONTEXT-level
// options — browserContext.newPage() ignores them, which silently renders every
// "phone" capture at the desk width.
const contexts = {};

for (const [name, creds] of Object.entries(PERSONAS)) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      baseURL: BASE,
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      deviceScaleFactor: 1,
    });
    if (creds) {
      const res = await ctx.request.post("/api/auth/login", { data: creds });
      if (!res.ok()) console.error(`login failed for ${name}: ${res.status()}`);
    }
    contexts[`${name}:${vp.name}`] = ctx;
  }
}

// the crawl only needs one healthy context
const crawlCtx = contexts[`staff:desk`];

console.log("crawling for real links (incl. dynamic routes)…");
const discovered = await crawl(crawlCtx);
console.log(`  discovered ${discovered.length} linked routes`);

const stats = JSON.parse(fs.readFileSync(".design-audit/routes.json", "utf8"));
const all = [...new Set([...stats.staticRoutes, ...discovered])]
  .filter((r) => !r.includes("["))
  .sort();

console.log(`auditing ${all.length} routes × ${VIEWPORTS.length} viewports…`);

const results = [];
let done = 0;

for (const route of all) {
  const persona = personaFor(route);
  for (const vp of VIEWPORTS) {
    const ctx = contexts[`${persona}:${vp.name}`];
    const page = await ctx.newPage();
    const rec = { route, persona, viewport: vp.name, width: vp.width };
    try {
      const resp = await page.goto(BASE + route, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      rec.status = resp ? resp.status() : null;
      await page.waitForTimeout(350);
      const probe = await page.evaluate(PROBE);
      Object.assign(rec, probe);
      const safe = route === "/" ? "root" : route.replace(/^\//, "").replace(/\//g, "__");
      rec.shot = path.join(SHOTS, `${safe}--${vp.name}.png`);
      await page.screenshot({ path: rec.shot, fullPage: true });
    } catch (err) {
      rec.error = String(err).slice(0, 200);
    }
    await page.close();
    results.push(rec);
    done++;
    if (done % 20 === 0) console.log(`  ${done}/${all.length * VIEWPORTS.length}`);
  }
}

await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));

/* ---------------------------------------------------------------- summary --- */

const lines = [];
lines.push("# Design audit — measured");
lines.push("");
lines.push(`Base: ${BASE}   Routes: ${all.length}   Captures: ${results.length}`);
lines.push("");

const failed = results.filter((r) => r.error || (r.status && r.status >= 400));
lines.push(`## Routes that did not render (${failed.length})`);
lines.push("");
for (const f of failed) {
  lines.push(`- \`${f.route}\` (${f.viewport}) → ${f.error ? "ERROR " + f.error : "HTTP " + f.status}`);
}
lines.push("");

const withOverflow = results.filter((r) => r.overflowX > 2);
lines.push(`## Horizontal overflow (${withOverflow.length})`);
lines.push("");
for (const r of withOverflow.sort((a, b) => b.overflowX - a.overflowX).slice(0, 25)) {
  lines.push(`- \`${r.route}\` ${r.viewport} → ${r.overflowX}px past the viewport`);
}
lines.push("");

const withContrast = results.filter((r) => r.contrastCount > 0);
lines.push(`## WCAG AA contrast failures (${withContrast.length} captures)`);
lines.push("");
const contrastTotals = {};
for (const r of withContrast) {
  for (const c of r.contrast || []) {
    const k = c.sel;
    contrastTotals[k] = contrastTotals[k] || { n: 0, worst: 9, need: c.need, sample: c.text };
    contrastTotals[k].n++;
    if (c.ratio < contrastTotals[k].worst) {
      contrastTotals[k].worst = c.ratio;
      contrastTotals[k].sample = c.text;
    }
  }
}
lines.push("| selector | hits | worst ratio | needs | sample text |");
lines.push("|---|---|---|---|---|");
for (const [k, v] of Object.entries(contrastTotals).sort((a, b) => a[1].worst - b[1].worst).slice(0, 30)) {
  lines.push(`| \`${k}\` | ${v.n} | ${v.worst}:1 | ${v.need}:1 | ${v.sample.replace(/\|/g, "/")} |`);
}
lines.push("");

const grad = results.filter((r) => r.interactiveGradientCount > 0);
lines.push(`## Gradient on interactive elements (${grad.length} captures)`);
lines.push("");
const gradTotals = {};
for (const r of grad) {
  for (const g of r.gradients || []) {
    if (!g.interactive) continue;
    gradTotals[g.sel] = (gradTotals[g.sel] || 0) + 1;
  }
}
for (const [k, n] of Object.entries(gradTotals).sort((a, b) => b[1] - a[1])) {
  lines.push(`- \`${k}\` × ${n}`);
}
lines.push("");

lines.push("## Accent (gold/brass) density per route");
lines.push("");
lines.push("| route | viewport | accent elements |");
lines.push("|---|---|---|");
for (const r of results
  .filter((r) => r.accentEls > 0)
  .sort((a, b) => b.accentEls - a.accentEls)
  .slice(0, 30)) {
  lines.push(`| \`${r.route}\` | ${r.viewport} | ${r.accentEls} |`);
}
lines.push("");

const touch = results.filter((r) => r.viewport === "phone" && r.smallTargetCount > 0);
lines.push(`## Tap targets under 44px on phone (${touch.length} captures)`);
lines.push("");
for (const r of touch.sort((a, b) => b.smallTargetCount - a.smallTargetCount).slice(0, 25)) {
  lines.push(`- \`${r.route}\` → **${r.smallTargetCount}** undersized`);
}
lines.push("");

const tinyRoutes = results.filter((r) => r.tinyCount > 0);
lines.push(`## Type below the 12px floor (${tinyRoutes.length} captures)`);
lines.push("");
for (const r of tinyRoutes.sort((a, b) => b.tinyCount - a.tinyCount).slice(0, 20)) {
  const sizes = [...new Set((r.tiny || []).map((t) => t.size))].join(", ");
  lines.push(`- \`${r.route}\` ${r.viewport} → ${r.tinyCount} (${sizes}px)`);
}
lines.push("");

const multiH1 = results.filter((r) => r.h1Count > 1);
lines.push(`## More than one h1 (${multiH1.length})`);
lines.push("");
for (const r of multiH1.slice(0, 25)) {
  lines.push(`- \`${r.route}\` ${r.viewport} → ${r.h1Count}: ${r.h1.join(" / ")}`);
}
lines.push("");

const noH1 = results.filter((r) => !r.error && r.h1Count === 0 && r.status < 400);
lines.push(`## No h1 (${noH1.length})`);
lines.push("");
for (const r of noH1.slice(0, 25)) lines.push(`- \`${r.route}\` ${r.viewport}`);
lines.push("");

const noAlt = results.filter((r) => r.imgNoAlt > 0);
lines.push(`## Images without alt (${noAlt.length})`);
lines.push("");
for (const r of noAlt.sort((a, b) => b.imgNoAlt - a.imgNoAlt).slice(0, 20)) {
  lines.push(`- \`${r.route}\` ${r.viewport} → ${r.imgNoAlt} of ${r.imgCount}`);
}
lines.push("");

fs.writeFileSync(path.join(OUT, "summary.md"), lines.join("\n"));
console.log(`\nwrote ${OUT}/summary.md and ${OUT}/report.json`);
console.log(`screenshots: ${results.length}`);
