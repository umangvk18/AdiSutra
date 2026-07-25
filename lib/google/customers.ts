import "server-only";
import { readSheet, appendRowWithGeneratedId } from "./sheets";
import { SHEET } from "./config";
import { normalizePhone } from "../phone";
import type { Customer } from "../types";

export type { Customer };

function parseCustomer(row: Record<string, string>): Customer {
  const firstName = row.first_name?.trim();
  if (firstName) {
    return {
      customer_id: row.customer_id,
      first_name: firstName,
      last_name: row.last_name?.trim() ?? "",
      phone: row.phone,
    };
  }

  // Legacy rows created before the first/last name split only have the old
  // combined "name" column -- split it so the rest of the app can keep
  // treating every customer uniformly.
  const legacyParts = (row.name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    customer_id: row.customer_id,
    first_name: legacyParts[0] ?? "",
    last_name: legacyParts.slice(1).join(" "),
    phone: row.phone,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const rows = await readSheet(SHEET.Customers);
  return rows.map(parseCustomer);
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const customers = await listCustomers();
  return customers.find((c) => c.customer_id === customerId) ?? null;
}

export type NewCustomerInput = {
  first_name: string;
  last_name: string;
  phone: string;
};

export async function createCustomer(input: NewCustomerInput): Promise<Customer> {
  const phone = normalizePhone(input.phone);
  const firstName = input.first_name.trim();
  const lastName = input.last_name.trim();
  const row = await appendRowWithGeneratedId(SHEET.Customers, "customer_id", "CUST-", 4, (id) => ({
    customer_id: id,
    name: [firstName, lastName].filter(Boolean).join(" "),
    phone,
    first_name: firstName,
    last_name: lastName,
  }));
  return row as unknown as Customer;
}
