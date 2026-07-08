import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { listCustomers, createCustomer } from "@/lib/google/customers";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const customers = await listCustomers();
  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const customer = await createCustomer({ name, phone });
  return NextResponse.json({ customer }, { status: 201 });
}
