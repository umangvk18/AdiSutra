import "server-only";
import { readSheet, appendRowWithGeneratedId, updateRowByKey } from "./sheets";
import { SHEET } from "./config";
import type { Saree, SareeStatus } from "../types";

export type { Saree, SareeStatus };

function parseSaree(row: Record<string, string>): Saree {
  return {
    saree_code: row.saree_code,
    photo_url: row.photo_url,
    region: row.region,
    vendor: row.vendor,
    material: row.material,
    design_type: row.design_type,
    color: row.color,
    cost_price: Number(row.cost_price) || 0,
    selling_price: Number(row.selling_price) || 0,
    date_received: row.date_received,
    status: row.status === "Sold" ? "Sold" : "In Stock",
    date_sold: row.date_sold,
    bill_number: row.bill_number,
  };
}

export type InventoryFilters = {
  status?: SareeStatus;
  region?: string;
  material?: string;
  design_type?: string;
  vendor?: string;
};

export async function listInventory(filters: InventoryFilters = {}): Promise<Saree[]> {
  const rows = await readSheet(SHEET.Inventory);
  return rows
    .map(parseSaree)
    .filter((s) => {
      if (filters.status && s.status !== filters.status) return false;
      if (filters.region && s.region !== filters.region) return false;
      if (filters.material && s.material !== filters.material) return false;
      if (filters.design_type && s.design_type !== filters.design_type) return false;
      if (filters.vendor && s.vendor !== filters.vendor) return false;
      return true;
    })
    .sort((a, b) => (a.date_received < b.date_received ? 1 : -1));
}

export async function getSareeByCode(code: string): Promise<Saree | null> {
  const rows = await readSheet(SHEET.Inventory);
  const row = rows.find((r) => r.saree_code === code);
  return row ? parseSaree(row) : null;
}

export type NewSareeInput = {
  photo_url: string;
  region: string;
  vendor: string;
  material: string;
  design_type: string;
  color: string;
  cost_price: number;
  selling_price: number;
  date_received: string;
};

export async function createSaree(input: NewSareeInput): Promise<Saree> {
  const row = await appendRowWithGeneratedId(
    SHEET.Inventory,
    "saree_code",
    "AS-",
    4,
    (id) => ({
      saree_code: id,
      photo_url: input.photo_url,
      region: input.region,
      vendor: input.vendor,
      material: input.material,
      design_type: input.design_type,
      color: input.color,
      cost_price: input.cost_price,
      selling_price: input.selling_price,
      date_received: input.date_received,
      status: "In Stock",
      date_sold: "",
      bill_number: "",
    })
  );
  return parseSaree(row as unknown as Record<string, string>);
}

export type UpdateSareeInput = {
  photo_url: string;
  region: string;
  vendor: string;
  material: string;
  design_type: string;
  color: string;
  cost_price: number;
  selling_price: number;
  date_received: string;
};

/**
 * Edits a saree's business fields (region/vendor/material/design/color/
 * prices/date/photo). Deliberately excludes status/date_sold/bill_number --
 * those stay fully automatic per Section 3.1 and are never hand-edited.
 * Already-recorded bills keep their own frozen price_at_sale snapshot, so
 * editing selling_price here has no effect on past sales.
 */
export async function updateSaree(code: string, input: UpdateSareeInput): Promise<Saree> {
  const ok = await updateRowByKey(SHEET.Inventory, "saree_code", code, input);
  if (!ok) throw new Error(`Saree ${code} not found`);
  const updated = await getSareeByCode(code);
  if (!updated) throw new Error(`Saree ${code} not found after update`);
  return updated;
}
