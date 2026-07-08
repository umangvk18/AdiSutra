import "server-only";
import { getSheetsClient } from "./auth";
import { HEADERS, getSpreadsheetId, type SheetName } from "./config";

function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export type SheetRow = Record<string, string>;

/** Reads every row in a sheet as an object keyed by its header row. */
export async function readSheet(sheetName: SheetName): Promise<SheetRow[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:Z`,
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];
  const [header, ...body] = rows as string[][];
  return body.map((row) => {
    const obj: SheetRow = {};
    header.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

/** Appends one row, ordering values to match the sheet's declared header. */
export async function appendRow(
  sheetName: SheetName,
  row: Record<string, string | number>
): Promise<void> {
  const sheets = getSheetsClient();
  const header = HEADERS[sheetName];
  const values = [header.map((h) => row[h] ?? "")];
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

/**
 * Finds the row where `keyColumn` === `keyValue`, merges `patch` into it,
 * and writes the full row back. Returns false if no matching row was found.
 */
export async function updateRowByKey(
  sheetName: SheetName,
  keyColumn: string,
  keyValue: string,
  patch: Record<string, string | number>
): Promise<boolean> {
  const sheets = getSheetsClient();
  const header = HEADERS[sheetName];
  const rows = await readSheet(sheetName);
  const rowIndex = rows.findIndex((r) => r[keyColumn] === keyValue);
  if (rowIndex === -1) return false;

  const merged: Record<string, string | number> = { ...rows[rowIndex], ...patch };
  const values = [header.map((h) => merged[h] ?? "")];
  const rowNumber = rowIndex + 2; // +1 for header row, +1 for 1-based indexing
  const lastCol = columnLetter(header.length - 1);

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowNumber}:${lastCol}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return true;
}

/** Reads the highest existing `prefix<digits>` id in a column and returns the next one. */
export async function getNextId(
  sheetName: SheetName,
  idColumn: string,
  prefix: string,
  digits: number
): Promise<string> {
  const rows = await readSheet(sheetName);
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const row of rows) {
    const match = row[idColumn]?.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(digits, "0")}`;
}

/**
 * Generates the next id for a sheet, appends the row built from it, and
 * verifies uniqueness afterward, retrying on the rare case of a collision
 * from two near-simultaneous writes (acceptable at this app's two-user scale).
 */
export async function appendRowWithGeneratedId<T extends Record<string, string | number>>(
  sheetName: SheetName,
  idColumn: string,
  prefix: string,
  digits: number,
  buildRow: (id: string) => T
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = await getNextId(sheetName, idColumn, prefix, digits);
    const row = buildRow(id);
    await appendRow(sheetName, row);

    const rows = await readSheet(sheetName);
    const matches = rows.filter((r) => r[idColumn] === id);
    if (matches.length === 1) return row;
  }
  throw new Error(`Failed to generate a unique ${idColumn} after 3 attempts`);
}
