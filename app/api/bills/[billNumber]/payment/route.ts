import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { logPayment } from "@/lib/google/bills";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ billNumber: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { billNumber } = await params;
  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const bill = await logPayment(billNumber, amount);
    return NextResponse.json({ bill });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to log payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
