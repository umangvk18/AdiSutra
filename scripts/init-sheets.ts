// One-time setup script: creates the 5 required tabs (with headers) in the
// AdiSutra spreadsheet if they don't already exist, and seeds the
// Attributes tab with the starting Region/Material/Design/Vendor values.
// Safe to re-run -- it won't duplicate sheets or seed data that's already there.
//
// Standalone by design (does not import lib/google/*, which guards itself
// with "server-only" so it can never leak into a client bundle -- that
// guard throws outside of Next's build, so this script talks to the
// Sheets API directly instead).
//
// Usage: npx tsx scripts/init-sheets.ts

import { config } from "dotenv";
config();
config({ path: ".env.local", override: true });

import { google } from "googleapis";

const SHEET_NAMES = ["Inventory", "Customers", "Bills", "Bill_Items", "Attributes"] as const;

const HEADERS: Record<(typeof SHEET_NAMES)[number], string[]> = {
  Inventory: [
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
  Customers: ["customer_id", "name", "phone"],
  Bills: [
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
    "payment_method",
  ],
  Bill_Items: ["bill_item_id", "bill_number", "saree_code", "price_at_sale", "item_status"],
  Attributes: ["attribute_type", "value"],
};

const ATTRIBUTE_SEED: { attribute_type: string; value: string }[] = [
  ...["Kolkata", "Banaras"].map((value) => ({ attribute_type: "Region", value })),
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
  ...["Katan", "Shikargaah", "Geometricals", "Embroidery", "Print", "Katha Stitch"].map(
    (value) => ({ attribute_type: "Design", value })
  ),
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

async function main() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = requireEnv("GOOGLE_REFRESH_TOKEN");
  const spreadsheetId = requireEnv("GOOGLE_SPREADSHEET_ID");

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title));

  const toCreate = SHEET_NAMES.filter((name) => !existingTitles.has(name));
  if (toCreate.length > 0) {
    console.log(`Creating tabs: ${toCreate.join(", ")}`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
  } else {
    console.log("All 5 tabs already exist.");
  }

  for (const name of SHEET_NAMES) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS[name]] },
    });
    console.log(`Wrote header row for ${name}`);
  }

  const attrRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Attributes!A:B",
  });
  const attrRows = (attrRes.data.values ?? []).slice(1); // drop header
  const existingKeys = new Set(attrRows.map((r) => `${r[0]}::${r[1]}`));
  const missingSeed = ATTRIBUTE_SEED.filter(
    (s) => !existingKeys.has(`${s.attribute_type}::${s.value}`)
  );

  if (missingSeed.length > 0) {
    console.log(`Seeding ${missingSeed.length} attribute values...`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Attributes!A:A",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: missingSeed.map((s) => [s.attribute_type, s.value]),
      },
    });
  } else {
    console.log("Attributes already seeded.");
  }

  console.log("\nDone. Open the spreadsheet to verify the 5 tabs and seed data look right.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
