import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { correctBillPayment } from "@/lib/google/bills";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ billNumber: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { billNumber } = await params;
  const body = await request.json().catch(() => null);
  const amountPaid = Number(body?.amount_paid);

  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const bill = await correctBillPayment(billNumber, amountPaid);
    return NextResponse.json({ bill });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to correct payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
