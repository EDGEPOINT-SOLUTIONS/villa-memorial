import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";

/**
 * Admin plan wave 1 — the corner page documents drive the public pages.
 *
 * The captain's ask: "you can literally copy the entire page and when you edit it
 * in the admin and save it you will see the new updates." The seven surfaces that
 * had no page document before wave 1 (Contact · Memorials · Builder · Facilities ·
 * Gallery · Price list · Login) each now read their hero from the shared page
 * document. This suite proves the loop end to end for the two that render as a
 * public page + a sign-in card: a save through `savePageDocument` is what the
 * rendered page prints, not the shipped fallback.
 *
 * The suite owns its throwaway journal (tests/setup already redirects the env var,
 * but pointing it here makes the isolation explicit and restores it afterwards).
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
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  usePathname: () => "/contact",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/portal-switch", () => ({ PortalSwitch: () => null }));

const { getPageDocument, savePageDocument } = await import("@/lib/api-client/content-pages");
const { default: ContactPage } = await import("@/app/(public)/contact/page");
const { default: LoginPage } = await import("@/app/login/page");

const CORNER_KEYS = [
  "contact",
  "memorials",
  "builder",
  "facilities",
  "priceList",
  "login",
] as const;

let dir: string;
let previous: string | undefined;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-corner-pages-"));
  previous = process.env.CONTENT_PAGES_STORE_PATH;
  process.env.CONTENT_PAGES_STORE_PATH = path.join(dir, "pages.json");
});

afterEach(async () => {
  if (previous === undefined) delete process.env.CONTENT_PAGES_STORE_PATH;
  else process.env.CONTENT_PAGES_STORE_PATH = previous;
  await rm(dir, { recursive: true, force: true });
});

describe("the corner page documents", () => {
  it("saves and reads back an edit for each of the six surfaces", async () => {
    for (const key of CORNER_KEYS) {
      const doc = await getPageDocument(key);
      expect(doc, key).toBeTruthy();
      await savePageDocument(key, {
        ...doc,
        hero: { ...doc!.hero, headline: `Edited ${key}` },
      });
      expect((await getPageDocument(key))?.hero.headline, key).toBe(`Edited ${key}`);
    }
  });

  it("prints the saved contact headline on the public page", async () => {
    const doc = await getPageDocument("contact");
    await savePageDocument("contact", {
      ...doc,
      hero: { ...doc!.hero, headline: "Talk to a Villa coordinator" },
    });

    const html = renderToStaticMarkup(
      createElement(
        CartProvider,
        null,
        createElement(QuoteBasketProvider, null, await ContactPage({ searchParams: Promise.resolve({}) })),
      ),
    );
    expect(html).toContain("Talk to a Villa coordinator");
  });

  it("prints the saved welcome heading on the sign-in card", async () => {
    const doc = await getPageDocument("login");
    await savePageDocument("login", {
      ...doc,
      hero: { ...doc!.hero, headline: "A calmer welcome" },
    });

    const html = renderToStaticMarkup(await LoginPage());
    expect(html).toContain("A calmer welcome");
    expect(html).toContain("Sign in to your portal.");
  });
});
