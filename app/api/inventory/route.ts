import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
import { listInventory, createSaree, type InventoryFilters, type SareeStatus } from "@/lib/google/inventory";
import { uploadSareePhoto } from "@/lib/google/drive";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const filters: InventoryFilters = {
    status: status === "In Stock" || status === "Sold" ? (status as SareeStatus) : undefined,
    region: searchParams.get("region") ?? undefined,
    material: searchParams.get("material") ?? undefined,
    design_type: searchParams.get("design_type") ?? undefined,
    vendor: searchParams.get("vendor") ?? undefined,
  };

  const items = await listInventory(filters);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }

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

  const buffer = Buffer.from(await photo.arrayBuffer());
  const photo_url = await uploadSareePhoto(buffer, `saree-${Date.now()}.jpg`);

  const saree = await createSaree({
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

  return NextResponse.json({ saree }, { status: 201 });
}
