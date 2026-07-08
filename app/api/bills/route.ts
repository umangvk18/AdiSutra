import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { listBills, createBill } from "@/lib/google/bills";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bills = await listBills();
  return NextResponse.json({ bills });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const customerId = body?.customer_id;
  const sareeCodesRaw = body?.saree_codes;
  const discount = Number(body?.discount ?? 0);
  const amountPaid = Number(body?.amount_paid ?? 0);
  const date = typeof body?.date === "string" ? body.date : "";

  if (
    typeof customerId !== "string" ||
    !customerId ||
    !Array.isArray(sareeCodesRaw) ||
    sareeCodesRaw.length === 0 ||
    !sareeCodesRaw.every((c) => typeof c === "string") ||
    !Number.isFinite(discount) ||
    !Number.isFinite(amountPaid) ||
    !date
  ) {
    return NextResponse.json({ error: "Invalid bill payload" }, { status: 400 });
  }

  try {
    const result = await createBill({
      customer_id: customerId,
      saree_codes: sareeCodesRaw,
      discount,
      amount_paid: amountPaid,
      date,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create bill";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
