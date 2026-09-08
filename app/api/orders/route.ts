import { NextResponse, type NextRequest } from "next/server";
import { createOrder } from "@/lib/api-client/commerce";
import { ApiError } from "@/lib/api-client/api-error";

/**
 * BFF: POST /api/orders — thin proxy over FROZEN POST /api/v1/orders.
 * No pricing logic here; the server-side service re-prices everything.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await createOrder(body as never), { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "checkout failed" }, { status: 502 });
  }
}
