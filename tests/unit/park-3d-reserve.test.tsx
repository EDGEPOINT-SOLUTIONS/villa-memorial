import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getLot, listLots, type Lot } from "@/lib/api-client/property";
import { withLiveLotRecords } from "@/lib/park-live-lots";
import { LotReserveAction } from "@/components/lot-reserve-action";
import { PlotDetails } from "@/components/park-plot-details";
import type { PlotArea } from "@/lib/park-maps";
import parksFile from "@/lib/fixtures/property/parks.json";

/**
 * Reserving a lot from the 3D park.
 *
 * The 3D plot panel gains the real reservation control for a viewer whose scopes
 * allow it, and it must be the SAME path the 2D/staff map uses — the BFF route
 * `POST /api/property/lots/:id/reserve`, gated on `property:write`. A signed-out
 * visitor must not be able to reserve anything: without a session the route
 * answers 401, with only read scopes 403, and the lot is untouched either way.
 *
 * The last piece is the sharing: a reservation changes the LOT (the property
 * service's record), and both park modes overlay that live status onto the same
 * plot records — so the 2D map shows the new status without the plot record ever
 * being rewritten.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

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

const { POST } = await import("@/app/api/property/lots/[id]/reserve/route");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
/** Available in the seed — reserved by this file's route test (A-004). */
const AVAILABLE_LOT = "00000000-0000-4000-8000-000000000D04"; // plot A-004
/** Available in the seed — reserved only by this file's overlay test (C-002). */
const OVERLAY_LOT = "00000000-0000-4000-8000-000000000D0A";
/** Available in the seed — never reserved, so it stays renderable (C-003). */
const RENDER_LOT = "00000000-0000-4000-8000-000000000D0B";
/** Reserved in the seed — the refusal case (A-002). */
const RESERVED_LOT = "00000000-0000-4000-8000-000000000D02";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function accessToken(scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
}

function signInAs(scopes: string[]) {
  cookieJar.values.im_at = accessToken(scopes);
}

async function postReserve(id: string, ownerName = "Juan Dela Cruz"): Promise<Response> {
  const request = new NextRequest(`http://localhost/api/property/lots/${id}/reserve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ owner_name: ownerName }),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
});

describe("POST /api/property/lots/:id/reserve — the one reservation rule", () => {
  it("refuses a signed-out visitor with 401 and leaves the lot available", async () => {
    const res = await postReserve(AVAILABLE_LOT);
    expect(res.status).toBe(401);
    expect((await getLot(AVAILABLE_LOT)).status).toBe("available");
  });

  it("refuses a session without property:write with 403 and leaves the lot available", async () => {
    signInAs(["property:read"]);
    const res = await postReserve(AVAILABLE_LOT);
    expect(res.status).toBe(403);
    expect((await getLot(AVAILABLE_LOT)).status).toBe("available");
  });

  it("reserves for a property:write session and returns the reserved lot", async () => {
    signInAs(["property:write"]);
    const res = await postReserve(AVAILABLE_LOT, "  Juan Dela Cruz  ");
    expect(res.status).toBe(200);
    const lot = (await res.json()) as Lot;
    expect(lot.status).toBe("reserved");
    expect(lot.owner_name).toBe("Juan Dela Cruz");
    expect((await getLot(AVAILABLE_LOT)).status).toBe("reserved");
  });

  it("refuses a second reservation of the same lot with 422 (the service's rule)", async () => {
    signInAs(["property:write"]);
    const res = await postReserve(RESERVED_LOT);
    expect(res.status).toBe(422);
    expect((await res.json()) as { error: string }).toMatchObject({
      error: expect.stringContaining("only available lots"),
    });
  });
});

describe("a reservation is reflected in the shared plot store's picture", () => {
  /** The raw (non-placeholder) villa plot linked to a lot, from the recorded seed. */
  function villaPlotFor(lotId: string): PlotArea {
    const villa = (parksFile as { parks: Array<{ id: string; plots: Array<{ id: string; code: string; lot_id: string | null; status: PlotArea["status"]; outline: number[][]; owner?: string }> }> }).parks.find(
      (p) => p.id === "villa",
    )!;
    const raw = villa.plots.find((p) => p.lot_id === lotId)!;
    return {
      id: raw.id,
      code: raw.code,
      lot_id: raw.lot_id,
      status: raw.status,
      outline: raw.outline.map((p) => [p[0], p[1]] as [number, number]),
      ...(raw.owner ? { owner: raw.owner } : {}),
    };
  }

  it("overlays the live status onto the linked plot — the record itself is not rewritten", async () => {
    const plot = villaPlotFor(OVERLAY_LOT);
    const storeRecord = { ...plot };

    const before = withLiveLotRecords([plot], {
      statusById: Object.fromEntries((await listLots()).map((l) => [l.id, l.status])),
      ownerById: {},
    })[0];
    expect(before.status).toBe("available");

    signInAs(["property:write"]);
    expect((await postReserve(OVERLAY_LOT, "Marites Santos")).status).toBe(200);

    const after = withLiveLotRecords([plot], {
      statusById: Object.fromEntries((await listLots()).map((l) => [l.id, l.status])),
      ownerById: Object.fromEntries((await listLots()).map((l) => [l.id, l.owner_name ?? ""])),
    })[0];
    expect(after.status).toBe("reserved");
    expect(after.owner).toBe("Marites Santos");
    // The 3D view wrote nothing into the plot store: it read the LOT's new status.
    expect(plot).toEqual(storeRecord);
  });

  it("keeps a status the plot store cannot draw out of the record", () => {
    const plot = villaPlotFor(AVAILABLE_LOT);
    const overlay = withLiveLotRecords([plot], {
      statusById: { [AVAILABLE_LOT]: "for_transfer" },
      ownerById: {},
    })[0];
    expect(overlay.status).toBe("available");
  });
});

describe("the plot panel's reservation action follows the viewer's capability", () => {
  const plot = {
    id: "villa-c-003",
    code: "C-003",
    lot_id: RENDER_LOT,
    status: "available" as const,
    outline: [
      [10, 10],
      [12, 10],
      [12, 12],
      [10, 12],
    ] as Array<[number, number]>,
  };

  it("renders the real control when the host passes one (property:write)", async () => {
    const lot = await getLot(RENDER_LOT);
    const html = renderToStaticMarkup(
      <PlotDetails
        selected={{ area: plot, parkId: "villa" }}
        lots={[lot]}
        parkName="Villa Memorial"
        reserveSlot={<LotReserveAction lot={lot} />}
      />,
    );
    expect(html).toContain("Reserve lot");
    expect(html).not.toContain("Request to reserve");
  });

  it("renders the family ask-gate link for everyone else — nothing that claims a reservation", async () => {
    const lot = await getLot(RENDER_LOT);
    const html = renderToStaticMarkup(
      <PlotDetails
        selected={{ area: plot, parkId: "villa" }}
        lots={[lot]}
        parkName="Villa Memorial"
      />,
    );
    // The captain's 2026-10-02 direction: the public lot action is the family
    // gate's exact "Ask about this lot", never a reservation claim.
    expect(html).toContain("Ask about this lot");
    expect(html).toContain("/client/ask?");
    expect(html).not.toContain("Reserve lot</button>");
    expect(html).not.toContain("Request to reserve");
  });

  it("offers the control only for an available lot", async () => {
    const reserved = await getLot(RESERVED_LOT);
    expect(renderToStaticMarkup(<LotReserveAction lot={reserved} />)).toBe("");
    const available = await getLot(RENDER_LOT);
    expect(available.status).toBe("available");
    expect(renderToStaticMarkup(<LotReserveAction lot={available} />)).toContain("Reserve lot");
  });
});
