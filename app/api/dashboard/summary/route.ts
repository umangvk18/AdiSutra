import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { getHomeSummary } from "@/lib/google/bills";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await getHomeSummary();
  return NextResponse.json(summary);
}
