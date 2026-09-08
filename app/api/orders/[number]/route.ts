import { NextResponse } from "next/server";
import { getOrderByNumber } from "@/lib/api-client/commerce";
import { ApiError } from "@/lib/api-client/api-error";

/** BFF: GET /api/orders/:number — status polling by capability-token number. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  try {
    return NextResponse.json(await getOrderByNumber(number));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
