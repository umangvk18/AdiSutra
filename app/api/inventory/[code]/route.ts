import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { getSareeByCode, updateSaree } from "@/lib/google/inventory";
import { uploadSareePhoto } from "@/lib/google/drive";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const existing = await getSareeByCode(code);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await request.formData();
  const photo = form.get("photo");

  const region = String(form.get("region") ?? "").trim();
  const vendor = String(form.get("vendor") ?? "").trim();
  const material = String(form.get("material") ?? "").trim();
  const design_type = String(form.get("design_type") ?? "").trim();
  const color = String(form.get("color") ?? "").trim();
  const cost_price = Number(form.get("cost_price"));
  const selling_price = Number(form.get("selling_price"));
  const date_received = String(form.get("date_received") ?? "").trim();

  if (
    !region ||
    !vendor ||
    !material ||
    !design_type ||
    !color ||
    !date_received ||
    !Number.isFinite(cost_price) ||
    !Number.isFinite(selling_price)
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  try {
    let photo_url = existing.photo_url;
    if (photo instanceof File && photo.size > 0) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      photo_url = await uploadSareePhoto(buffer, `saree-${Date.now()}.jpg`);
    }

    const saree = await updateSaree(code, {
      photo_url,
      region,
      vendor,
      material,
      design_type,
      color,
      cost_price,
      selling_price,
      date_received,
    });

    return NextResponse.json({ saree });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update saree";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
