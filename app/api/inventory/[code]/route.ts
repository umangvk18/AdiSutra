import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { getSareeByCode } from "@/lib/google/inventory";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const saree = await getSareeByCode(code);
  if (!saree) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ saree });
}
