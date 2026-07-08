import "server-only";
import { readSheet, appendRow } from "./sheets";
import { SHEET } from "./config";
import type { AttributesByType } from "../types";

export type { AttributesByType };

export const ATTRIBUTE_TYPES = ["Region", "Material", "Design", "Vendor"] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export async function getAttributesByType(): Promise<AttributesByType> {
  const rows = await readSheet(SHEET.Attributes);
  const result: AttributesByType = {};
  for (const row of rows) {
    const type = row.attribute_type;
    const value = row.value;
    if (!type || !value) continue;
    if (!result[type]) result[type] = [];
    if (!result[type].includes(value)) result[type].push(value);
  }
  return result;
}

export async function addAttributeValue(
  attributeType: AttributeType,
  value: string
): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Value cannot be empty");

  const existing = await getAttributesByType();
  const values = existing[attributeType] ?? [];
  const alreadyExists = values.some((v) => v.toLowerCase() === trimmed.toLowerCase());
  if (alreadyExists) return;

  await appendRow(SHEET.Attributes, { attribute_type: attributeType, value: trimmed });
}
