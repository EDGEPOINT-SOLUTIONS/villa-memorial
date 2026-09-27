import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";

/**
 * The F-16 accessibility/craft guard.
 *
 * Two halves, both verifiable in CI without a browser:
 *
 * 1. RENDERED PAGES — the real page components (the same server-render harness
 *    the reading-budget test uses) must keep exactly one h1, never skip a
 *    heading level, label every field, and give every icon-only button an
 *    accessible name. The failure message names the page and the offending
 *    element so a regression cannot slip through a green run.
 *
 * 2. THE ONE-RING / STATUS-INK CONTRACT — styles/base.css owns the only global
 *    :focus-visible rule (token ring + halo, no border-radius mutation), the
 *    reduced-motion block is present, and status badges use the -ink roles
 *    (the banner hues measured 3.0–4.2:1 on their own washes at 12 px).
 *    The rule text lives in styles/tokens.css + styles/base.css, so this test
 *    reads those files rather than trusting a class list somewhere.
 *
 * Scope note: the per-rule pass/fail table in the PR carries the browser
 * evidence (axe, keyboard walkthrough, contrast measurements). This test is the
 * regression gate for what can be checked without a DOM.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

const { default: ServicesPage } = await import("@/app/(public)/services/page");
const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { default: PriceListPage } = await import("@/app/(public)/price-list/page");
const { default: FaqPage } = await import("@/app/(public)/faq/page");
const { default: ContactPage } = await import("@/app/(public)/contact/page");
const { default: QuotePage } = await import("@/app/(public)/quote/page");
const { default: AppointmentsPage } = await import("@/app/(public)/appointments/page");
const { default: ImmediateAssistancePage } = await import(
  "@/app/(public)/immediate-assistance/page"
);
const { default: MemorialSearchPage } = await import("@/app/(public)/memorials/page");
const { default: FindMyLovedOnePage } = await import("@/app/(public)/memorials/find/page");
const { default: LotsPage } = await import("@/app/(public)/lots/page");
const { default: PriceList2026Page } = await import("@/app/(public)/lots/price-list-2026/page");
const { SignInCard } = await import("@/components/sign-in-card");
const { default: PlatformSignInPage } = await import("@/app/(platform)/platform/sign-in/page");
const { default: PlatformTenantsPage } = await import("@/app/(platform)/platform/tenants/page");
const { default: PlatformTenantDetailPage } = await import(
  "@/app/(platform)/platform/tenants/[id]/page"
);
const { default: PlatformSignUpPage } = await import("@/app/(platform)/platform/sign-up/page");

const ROOT = path.resolve(__dirname, "../..");

type PageCase = { name: string; render: () => Promise<string> };

const PAGES: ReadonlyArray<PageCase> = [
  {
    name: "/services",
    render: async () =>
      renderToStaticMarkup(createElement(CartProvider, null, await ServicesPage())),
  },
  {
    name: "/plans",
    render: async () =>
      renderToStaticMarkup(
        createElement(CartProvider, null, await PlansPage()),
      ),
  },
  {
    name: "/price-list",
    render: async () => renderToStaticMarkup(await PriceListPage()),
  },
  { name: "/faq", render: async () => renderToStaticMarkup(await FaqPage()) },
  {
    name: "/contact",
    render: async () =>
      renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve({}) })),
  },
  {
    name: "/quote",
    render: async () =>
      renderToStaticMarkup(await QuotePage({ searchParams: Promise.resolve({}) })),
  },
  { name: "/appointments", render: async () => renderToStaticMarkup(AppointmentsPage()) },
  {
    name: "/immediate-assistance",
    render: async () => renderToStaticMarkup(await ImmediateAssistancePage()),
  },
  {
    name: "/memorials",
    render: async () =>
      renderToStaticMarkup(await MemorialSearchPage({ searchParams: Promise.resolve({}) })),
  },
  { name: "/memorials/find", render: async () => renderToStaticMarkup(await FindMyLovedOnePage()) },
  {
    name: "/lots",
    render: async () =>
      renderToStaticMarkup(await LotsPage({ searchParams: Promise.resolve({}) })),
  },
  {
    name: "/lots/price-list-2026",
    render: async () => renderToStaticMarkup(await PriceList2026Page()),
  },
  {
    name: "sign-in card (all doors)",
    render: async () =>
      renderToStaticMarkup(
        createElement(SignInCard, {
          door: "staff",
          fallbackDestination: "/staff/dashboard",
          personas: [{ email: "admin@vm.demo", display_name: "Ada Admin" }],
        }),
      ),
  },
  {
    name: "/platform/sign-in",
    render: async () => renderToStaticMarkup(await PlatformSignInPage()),
  },
  {
    name: "/platform/tenants",
    render: async () => renderToStaticMarkup(await PlatformTenantsPage()),
  },
  {
    name: "/platform/tenants/[id]",
    render: async () =>
      renderToStaticMarkup(
        await PlatformTenantDetailPage({ params: Promise.resolve({ id: "ten-sample-memorial" }) }),
      ),
  },
  {
    name: "/platform/sign-up",
    render: async () => renderToStaticMarkup(await PlatformSignUpPage()),
  },
];

function headingLevels(html: string): number[] {
  return [...html.matchAll(/<h([1-6])\b[^>]*>/g)].map((m) => Number(m[1]));
}

function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|nbsp|middot|hellip|mdash|ndash|rsquo|lsquo|ldquo|rdquo|#\d+);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unlabeledInputs(html: string): string[] {
  // `for`-linked labels may sit anywhere; collect their ids BEFORE removing
  // labels that wrap an input (a wrapped label has no for attribute).
  const labelIds = new Set(
    [...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]),
  );
  const withoutWrapped = html.replace(/<label\b[^>]*>([\s\S]*?)<\/label>/g, (whole, inner) =>
    /<input\b/.test(inner) ? "" : whole,
  );
  return [...withoutWrapped.matchAll(/<input\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !/type="hidden"/.test(tag))
    .filter((tag) => {
      if (/aria-label(?:ledby)?=/.test(tag)) return false;
      const id = tag.match(/\bid="([^"]+)"/)?.[1];
      return !(id && labelIds.has(id));
    });
}

function unnamedButtons(html: string): string[] {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .map((m) => ({ attrs: m[1], text: visibleText(m[2]) }))
    .filter(({ attrs, text }) => !text && !/aria-label=/.test(attrs) && !/title=/.test(attrs))
    .map(({ attrs }) => attrs.slice(0, 80));
}

function missingAlt(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !/\balt=/.test(tag));
}

/** WCAG 2.5.3 — a control's accessible name must contain its visible text. */
function nameContentMismatches(html: string): string[] {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .map((m) => ({ attrs: m[1], text: visibleText(m[2]) }))
    .filter(({ attrs, text }) => {
      if (!text || !/aria-label=/.test(attrs)) return false;
      const label = attrs.match(/aria-label="([^"]*)"/)?.[1] ?? "";
      return !label.includes(text);
    })
    .map(({ attrs, text }) => `${text} vs ${attrs.slice(0, 70)}`);
}

describe("F-16 accessibility craft: rendered pages", () => {
  for (const page of PAGES) {
    describe(page.name, () => {
      let html = "";
      it("renders", async () => {
        html = await page.render();
        expect(html.length).toBeGreaterThan(200);
      });

      it("has exactly one h1", () => {
        const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
          visibleText(m[1]),
        );
        expect(h1s.length, `${page.name} has ${h1s.length} h1s: ${h1s.join(" | ")}`).toBe(1);
      });

      it("never skips a heading level", () => {
        const levels = headingLevels(html);
        const failures: string[] = [];
        levels.forEach((level, index) => {
          if (index === 0) return;
          const previous = levels[index - 1];
          if (level > previous + 1) {
            failures.push(`h${previous} → h${level} at heading ${index + 1}`);
          }
        });
        expect(failures, `${page.name}: ${failures.join(", ")}`).toEqual([]);
      });

      it("labels every field", () => {
        const offenders = unlabeledInputs(html);
        expect(
          offenders,
          `${page.name}: ${offenders.length} input(s) with no label or aria-label`,
        ).toEqual([]);
      });

      it("names every icon-only button", () => {
        const offenders = unnamedButtons(html);
        expect(offenders, `${page.name}: unnamed button(s): ${offenders.join(" | ")}`).toEqual([]);
      });

      it("gives every image an alt attribute (empty alt is allowed for decoration)", () => {
        expect(missingAlt(html), `${page.name}: image without alt`).toEqual([]);
      });

      it("keeps accessible names containing the visible label (WCAG 2.5.3)", () => {
        const offenders = nameContentMismatches(html);
        expect(offenders, `${page.name}: name/label mismatch: ${offenders.join(" | ")}`).toEqual(
          [],
        );
      });
    });
  }

  it("renders the sign-in card inside a main landmark", async () => {
    const html = await PAGES.find((p) => p.name.startsWith("sign-in"))!.render();
    expect(html).toMatch(/<main\b/);
  });
});

describe("F-16 accessibility craft: the one-ring + status-ink contract", () => {
  const base = readFileSync(path.join(ROOT, "styles/base.css"), "utf8");
  const tokens = readFileSync(path.join(ROOT, "styles/tokens.css"), "utf8");
  const components = readFileSync(path.join(ROOT, "styles/components.css"), "utf8");

  it("declares the focus ring + halo once, from tokens", () => {
    // The ring and its halo must resolve THROUGH tokens (a raw hex here is how
    // focus got lost on dark surfaces before), and they must be two DIFFERENT
    // values or the halo does nothing. Asserted by shape, not by palette name,
    // so the 2026-09-27 rebuild (sky-800 → ever-700, marble-50 → paper-50) did
    // not have to retype a literal to keep the promise honest.
    const ring = tokens.match(/--color-focus-ring:\s*([^;]+);/)?.[1]?.trim() ?? "";
    const halo = tokens.match(/--color-focus-ring-halo:\s*([^;]+);/)?.[1]?.trim() ?? "";
    expect(ring, "--color-focus-ring is unset").not.toBe("");
    expect(halo, "--color-focus-ring-halo is unset").not.toBe("");
    expect(ring).toMatch(/var\(--[a-z0-9-]+\)/);
    expect(halo).toMatch(/var\(--[a-z0-9-]+\)/);
    expect(ring).not.toBe(halo);
    const rule = base.match(/:focus-visible\s*\{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("outline: 2px solid var(--color-focus-ring)");
    expect(rule).toContain("box-shadow: 0 0 0 2px var(--color-focus-ring-halo)");
    // The old rule mutated border-radius on focus; that is gone.
    expect(rule).not.toContain("border-radius");
  });

  it("has no stray light-surface focus overrides", () => {
    expect(components).not.toMatch(/outline:\s*2px solid var\(--sky-(500|600)\)/);
    expect(components).not.toMatch(/\.fv-body\s+:focus-visible/);
  });

  it("keeps the global reduced-motion block", () => {
    expect(base).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it("keeps status badges on the accessible ink roles", () => {
    for (const tone of ["success", "warning", "danger", "info"] as const) {
      const rule = components.match(new RegExp(`\\.badge--${tone}\\s*\\{[^}]*\\}`))?.[0] ?? "";
      expect(rule, `.badge--${tone} must use its -ink token`).toContain(
        `--color-status-${tone}-ink`,
      );
    }
  });

  it("keeps the danger control dark enough for white ink", () => {
    expect(tokens).toMatch(/--color-status-danger-strong:\s*var\(--clay-700\)/);
    const rule = components.match(/\.btn--danger\s*\{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("--color-status-danger-strong");
  });

  it("keeps one modal focus contract for dialogs/drawers", () => {
    const hook = readFileSync(path.join(ROOT, "components/ui/use-modal-focus.ts"), "utf8");
    expect(hook).toContain('event.key === "Escape"');
    expect(hook).toContain('event.key !== "Tab"');
    expect(hook).toContain('document.body.style.overflow = "hidden"');
    for (const file of [
      "components/landing/editor-pickers.tsx",
      "components/landing/mobile-quick-menu.tsx",
      "components/landing/phone-action-bar.tsx",
      "components/portal-frame.tsx",
    ]) {
      expect(readFileSync(path.join(ROOT, file), "utf8"), `${file} must use the hook`).toContain(
        "useModalFocus",
      );
    }
  });

  it("keeps the phone action bar inside a landmark", () => {
    const phonebar = readFileSync(
      path.join(ROOT, "components/landing/phone-action-bar.tsx"),
      "utf8",
    );
    expect(phonebar).toMatch(/<nav className="anchored-phonebar" aria-label="Quick actions">/);
  });
});
