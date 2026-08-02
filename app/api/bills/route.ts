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
  const itemsRaw: Array<{ saree_code?: unknown; price_at_sale?: unknown }> = Array.isArray(
    body?.items
  )
    ? body.items
    : [];
  const amountPaid = Number(body?.amount_paid ?? 0);
  const date = typeof body?.date === "string" ? body.date : "";
  const paymentMethod = body?.payment_method;
  const expensesRaw: Array<{ name?: unknown; amount?: unknown }> = Array.isArray(body?.expenses)
    ? body.expenses
    : [];

  if (
    typeof customerId !== "string" ||
    !customerId ||
    itemsRaw.length === 0 ||
    !itemsRaw.every(
      (i) => typeof i?.saree_code === "string" && Number.isFinite(Number(i?.price_at_sale))
    ) ||
    !Number.isFinite(amountPaid) ||
    !date ||
    (paymentMethod !== "Cash" && paymentMethod !== "UPI") ||
    !expensesRaw.every(
      (e) => typeof e?.name === "string" && Number.isFinite(Number(e?.amount))
    )
  ) {
    return NextResponse.json({ error: "Invalid bill payload" }, { status: 400 });
  }

  try {
    const result = await createBill({
      customer_id: customerId,
      items: itemsRaw.map((i) => ({
        saree_code: String(i.saree_code),
        price_at_sale: Number(i.price_at_sale),
      })),
      amount_paid: amountPaid,
      date,
      payment_method: paymentMethod,
      expenses: expensesRaw.map((e) => ({ name: String(e.name), amount: Number(e.amount) })),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create bill";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
