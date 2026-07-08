import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { getCustomerBillSummary } from "@/lib/google/bills";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const summary = await getCustomerBillSummary(id);
  if (!summary.customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
