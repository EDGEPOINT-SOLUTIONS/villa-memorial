import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { listChapelRecords, saveChapelRecord } from "@/lib/api-client/chapel-store";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";

/**
 * The chapel record is the ONE source for a chapel's name (content-catalogue
 * Phase 3): renaming a chapel on /staff/schedule reaches the /services card AND
 * the booking dialog's schedule (getChapelSchedule, which /api/chapel/schedule
 * serves), so the two can never describe different rooms again — the drift the
 * plan's §4.3 recorded.
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
}));

const { default: ServicesPage } = await import("@/app/(public)/services/page");

async function renderServices(): Promise<string> {
  return renderToStaticMarkup(createElement(CartProvider, null, await ServicesPage()));
}

describe("a chapel-record rename reaches the card and the booking dialog", () => {
  let before: string;

  beforeAll(async () => {
    before = await renderServices();
  });

  it("prints the park's record name on the card and on the schedule", async () => {
    const [common] = await listChapelRecords();
    expect(common.chapel_class).toBe("common");
    // Before the rename the card prints the record's own name.
    expect(before).toContain(common.name);
    expect(before).not.toContain("St. Joseph Chapel");
  });

  it("reaches both surfaces after a rename and a capacity change", async () => {
    const records = await listChapelRecords();
    const common = records.find((record) => record.chapel_class === "common")!;
    await saveChapelRecord({ ...common, name: "St. Joseph Chapel", capacity: 88 }, "2026-09-21T00:00:00.000Z");

    const html = await renderServices();
    expect(html).toContain("St. Joseph Chapel");
    expect(html).not.toContain(common.name);
    expect(html).toContain("88 people");

    // The booking dialog reads /api/chapel/schedule → getChapelSchedule, which
    // must name the renamed chapel too.
    const schedule = await getChapelSchedule();
    const named = schedule.chapels.find((chapel) => chapel.chapel_class === "common");
    expect(named?.name).toBe("St. Joseph Chapel");
    expect(named?.capacity).toBe(88);
  });
});
