import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import personas from "@/lib/fixtures/auth/personas.json";
import { demoQuickFillPassword } from "@/lib/demo-quick-fill";
import { SignInCard } from "@/components/sign-in-card";
import LoginPage from "@/app/login/page";
import FamilyLoginPage from "@/app/(signin)/client/login/page";
import AgentLoginPage from "@/app/(signin)/agent/login/page";

/**
 * One-click demo persona fill is a SERVER-side gate: DEMO_QUICK_FILL is read per
 * request and the value reaches the card as a prop (never inlined into public JS
 * like NEXT_PUBLIC_DEMO_PASSWORD). These tests pin both halves:
 *   1. which password the resolver hands out given flag / mode / explicit value,
 *   2. that every sign-in door wires that value into the card, and the rendered
 *      markup carries the password only when the server flag enabled it.
 */

// The card calls useRouter and renders the portal switcher; neither is exercised
// by these server-render assertions, so stand in for both.
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: () => {} }) }));
vi.mock("@/components/portal-switch", () => ({ PortalSwitch: () => null }));

const ENV_KEYS = [
  "DEMO_QUICK_FILL",
  "DEMO_QUICK_FILL_PASSWORD",
  "AUTH_BASE_URL",
  "NEXT_PUBLIC_DEMO_PASSWORD",
  "NEXT_PUBLIC_DEMO_HINTS",
] as const;

const original = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

function setEnv(env: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) {
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("demo quick-fill resolver (server-only DEMO_QUICK_FILL)", () => {
  it("stays off when no server flag is set — email-only fill, exactly as before", () => {
    setEnv({
      DEMO_QUICK_FILL: undefined,
      DEMO_QUICK_FILL_PASSWORD: "Demo-Passw0rd!",
      // Even when the public var is present, the resolver stays off without the
      // server flag: the two paths are independent.
      NEXT_PUBLIC_DEMO_PASSWORD: "Demo-Passw0rd!",
      AUTH_BASE_URL: undefined,
    });
    expect(demoQuickFillPassword()).toBeNull();
  });

  it("fills the recorded dev seed in fixture mode", () => {
    setEnv({ DEMO_QUICK_FILL: "1", DEMO_QUICK_FILL_PASSWORD: undefined, AUTH_BASE_URL: undefined });
    expect(demoQuickFillPassword()).toBe(personas.password);
  });

  it("uses the explicit server-side password against a configured gateway", () => {
    setEnv({
      DEMO_QUICK_FILL: "1",
      DEMO_QUICK_FILL_PASSWORD: "box-generated-seed",
      AUTH_BASE_URL: "https://gateway.internal",
    });
    expect(demoQuickFillPassword()).toBe("box-generated-seed");
  });

  it("never hands the repo seed to a live gateway", () => {
    setEnv({ DEMO_QUICK_FILL: "1", DEMO_QUICK_FILL_PASSWORD: undefined, AUTH_BASE_URL: "https://gateway.internal" });
    expect(demoQuickFillPassword()).toBeNull();
  });

  it("treats any value other than \"1\" as disabled", () => {
    setEnv({ DEMO_QUICK_FILL: "true", DEMO_QUICK_FILL_PASSWORD: "Demo-Passw0rd!", AUTH_BASE_URL: undefined });
    expect(demoQuickFillPassword()).toBeNull();
  });
});

describe("every sign-in door passes the server-resolved password to the card", () => {
  const doors = [
    ["staff", LoginPage],
    ["family", FamilyLoginPage],
    ["agent", AgentLoginPage],
  ] as const;

  it("carries the fixture password when DEMO_QUICK_FILL is on", async () => {
    setEnv({ DEMO_QUICK_FILL: "1", DEMO_QUICK_FILL_PASSWORD: undefined, AUTH_BASE_URL: undefined });
    for (const [door, Page] of doors) {
      const element = (await Page()) as ReactElement<{ quickFillPassword?: string | null }>;
      expect(element.props.quickFillPassword, door).toBe(personas.password);
    }
  });

  it("carries null when the flag is unset", async () => {
    setEnv({ DEMO_QUICK_FILL: undefined, DEMO_QUICK_FILL_PASSWORD: undefined, AUTH_BASE_URL: undefined });
    for (const [door, Page] of doors) {
      const element = (await Page()) as ReactElement<{ quickFillPassword?: string | null }>;
      expect(element.props.quickFillPassword, door).toBeNull();
    }
  });

  it("renders the hint label that matches the server gate", async () => {
    setEnv({ DEMO_QUICK_FILL: "1", DEMO_QUICK_FILL_PASSWORD: undefined, AUTH_BASE_URL: undefined });
    const enabled = renderToStaticMarkup(await LoginPage());
    expect(enabled).toContain("Demo account:");
    expect(enabled).not.toContain("Demo account (fill email):");

    setEnv({ DEMO_QUICK_FILL: undefined });
    const disabled = renderToStaticMarkup(await LoginPage());
    expect(disabled).toContain("Demo account (fill email):");
  });
});

describe("the card itself", () => {
  it("keeps the email-only label when no password source is resolved", () => {
    const html = renderToStaticMarkup(
      <SignInCard
        door="staff"
        fallbackDestination="/staff/dashboard"
        personas={[{ email: "admin@vm.demo", display_name: "Ada Admin" }]}
        quickFillPassword={null}
      />,
    );
    expect(html).toContain("Demo account (fill email):");
  });
});

/**
 * The production profile builds with NEXT_PUBLIC_DEMO_HINTS=0 (docker-compose
 * .production.yml pins it; the Dockerfile's default is 0). The chips already stop
 * rendering then — but the doors hand the card a persona list as a PROP, and a
 * server component's props travel in the response's RSC payload whether or not
 * the card draws them. So a hints-off build must pass NO list at all, which is
 * what keeps every `vm.demo` address out of a production response.
 */
describe("persona hints are build-time gated (production ships no demo addresses)", () => {
  const doors = [
    ["staff", LoginPage],
    ["family", FamilyLoginPage],
    ["agent", AgentLoginPage],
  ] as const;

  it("passes personas while demo hints are on (the unset local-dev default)", async () => {
    setEnv({ NEXT_PUBLIC_DEMO_HINTS: undefined });
    for (const [door, Page] of doors) {
      const element = (await Page()) as ReactElement<{ personas: unknown[] }>;
      expect(element.props.personas.length, door).toBeGreaterThan(0);
    }
  });

  it("passes an EMPTY list when NEXT_PUBLIC_DEMO_HINTS=0, so no address reaches the payload", async () => {
    setEnv({ NEXT_PUBLIC_DEMO_HINTS: "0", DEMO_QUICK_FILL: undefined });
    for (const [door, Page] of doors) {
      const element = (await Page()) as ReactElement<{ personas: unknown[] }>;
      expect(element.props.personas, door).toEqual([]);
      expect(renderToStaticMarkup(await Page()), door).not.toContain("vm.demo");
    }
  });
});
