import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { reviseBill } from "@/lib/google/bills";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ billNumber: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { billNumber } = await params;
  const body = await request.json().catch(() => null);

  const returns: string[] = Array.isArray(body?.returns)
    ? body.returns.filter((c: unknown) => typeof c === "string")
    : [];

  const exchangesRaw: Array<{
    old_saree_code?: unknown;
    new_saree_code?: unknown;
    price_at_sale?: unknown;
  }> = Array.isArray(body?.exchanges) ? body.exchanges : [];

  const exchangesValid = exchangesRaw.every(
    (e) =>
      typeof e?.old_saree_code === "string" &&
      typeof e?.new_saree_code === "string" &&
      Number.isFinite(Number(e?.price_at_sale))
  );

  const collectedNow = Number(body?.collected_now ?? 0);
  const refundedNow = Number(body?.refunded_now ?? 0);

  if (
    (returns.length === 0 && exchangesRaw.length === 0) ||
    !exchangesValid ||
    !Number.isFinite(collectedNow) ||
    !Number.isFinite(refundedNow)
  ) {
    return NextResponse.json({ error: "Invalid revision payload" }, { status: 400 });
  }

  try {
    const result = await reviseBill(billNumber, {
      returns,
      exchanges: exchangesRaw.map((e) => ({
        old_saree_code: String(e.old_saree_code),
        new_saree_code: String(e.new_saree_code),
        price_at_sale: Number(e.price_at_sale),
      })),
      collected_now: collectedNow,
      refunded_now: refundedNow,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revise bill";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
