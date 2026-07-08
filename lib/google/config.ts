import "server-only";

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SPREADSHEET_ID env var");
  return id;
}

export function getDriveFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID env var");
  return id;
}

export const SHEET = {
  Inventory: "Inventory",
  Customers: "Customers",
  Bills: "Bills",
  BillItems: "Bill_Items",
  Attributes: "Attributes",
} as const;

export type SheetName = (typeof SHEET)[keyof typeof SHEET];

export const HEADERS: Record<SheetName, readonly string[]> = {
  [SHEET.Inventory]: [
    "saree_code",
    "photo_url",
    "region",
    "vendor",
    "material",
    "design_type",
    "color",
    "cost_price",
    "selling_price",
    "date_received",
    "status",
    "date_sold",
    "bill_number",
  ],
  [SHEET.Customers]: ["customer_id", "name", "phone"],
  [SHEET.Bills]: [
    "bill_number",
    "customer_id",
    "date",
    "subtotal",
    "discount",
    "total_amount",
    "amount_paid",
    "amount_due",
    "payment_status",
    "bill_status",
  ],
  [SHEET.BillItems]: [
    "bill_item_id",
    "bill_number",
    "saree_code",
    "price_at_sale",
    "item_status",
  ],
  [SHEET.Attributes]: ["attribute_type", "value"],
};

export const ATTRIBUTE_SEED: { attribute_type: string; value: string }[] = [
  ...["Kolkata", "Banaras"].map((value) => ({
    attribute_type: "Region",
    value,
  })),
  ...[
    "Raw Mango Silk",
    "Tussar Silk",
    "Moonga Silk",
    "Tissue",
    "Kora",
    "Linen",
    "Supernet",
    "Banarasi Silk",
  ].map((value) => ({ attribute_type: "Material", value })),
  ...[
    "Katan",
    "Shikargaah",
    "Geometricals",
    "Embroidery",
    "Print",
    "Katha Stitch",
  ].map((value) => ({ attribute_type: "Design", value })),
  ...[
    "Nirmal Fashion (Kolkata)",
    "Navneet Fashion (Kolkata)",
    "Rupdarshi Sarees (Kolkata)",
    "Rangrez (Kolkata)",
    "Nilima (Kolkata)",
    "Mateen (Kolkata)",
    "Kailash (Banaras)",
    "Shalu (Banaras)",
  ].map((value) => ({ attribute_type: "Vendor", value })),
];
