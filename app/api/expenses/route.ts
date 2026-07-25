import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { listExpenses, createExpense } from "@/lib/google/expenses";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expenses = await listExpenses();
  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const amount = Number(body?.amount);
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

  if (!date || !name || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "date, name, and a positive amount are required" }, { status: 400 });
  }

  const expense = await createExpense({ date, name, amount, notes });
  return NextResponse.json({ expense }, { status: 201 });
}
