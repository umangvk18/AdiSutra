import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import {
  getAttributesByType,
  addAttributeValue,
  ATTRIBUTE_TYPES,
  type AttributeType,
} from "@/lib/google/attributes";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const attributes = await getAttributesByType();
  return NextResponse.json({ attributes });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const attributeType = body?.attribute_type;
  const value = body?.value;

  if (
    typeof attributeType !== "string" ||
    !ATTRIBUTE_TYPES.includes(attributeType as AttributeType) ||
    typeof value !== "string" ||
    !value.trim()
  ) {
    return NextResponse.json(
      { error: "attribute_type must be one of Region/Material/Design/Vendor, value must be non-empty" },
      { status: 400 }
    );
  }

  await addAttributeValue(attributeType as AttributeType, value);
  const attributes = await getAttributesByType();
  return NextResponse.json({ attributes });
}
