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
  const firstName = typeof body?.first_name === "string" ? body.first_name.trim() : "";
  const lastName = typeof body?.last_name === "string" ? body.last_name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!firstName || !phone) {
    return NextResponse.json({ error: "first_name and phone are required" }, { status: 400 });
  }

  const customer = await createCustomer({ first_name: firstName, last_name: lastName, phone });
  return NextResponse.json({ customer }, { status: 201 });
}
