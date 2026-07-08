import "server-only";
import { readSheet, appendRowWithGeneratedId } from "./sheets";
import { SHEET } from "./config";
import { normalizePhone } from "../phone";
import type { Customer } from "../types";

export type { Customer };

function parseCustomer(row: Record<string, string>): Customer {
  return {
    customer_id: row.customer_id,
    name: row.name,
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
  name: string;
  phone: string;
};

export async function createCustomer(input: NewCustomerInput): Promise<Customer> {
  const phone = normalizePhone(input.phone);
  const row = await appendRowWithGeneratedId(SHEET.Customers, "customer_id", "CUST-", 4, (id) => ({
    customer_id: id,
    name: input.name.trim(),
    phone,
  }));
  return row as unknown as Customer;
}
