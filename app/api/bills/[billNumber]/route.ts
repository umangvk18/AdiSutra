import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { getBillDetail } from "@/lib/google/bills";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ billNumber: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { billNumber } = await params;
  const detail = await getBillDetail(billNumber);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
