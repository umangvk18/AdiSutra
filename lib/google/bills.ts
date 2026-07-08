import "server-only";
import { readSheet, appendRow, getNextId, updateRowByKey } from "./sheets";
import { SHEET } from "./config";
import { listInventory } from "./inventory";
import { getCustomerById, listCustomers } from "./customers";
import type {
  Bill,
  BillItem,
  PaymentStatus,
  BillDetail,
  Customer,
  HomeSummary,
  PendingBillSummary,
} from "../types";

export type { Bill, BillItem };

function parseBill(row: Record<string, string>): Bill {
  return {
    bill_number: row.bill_number,
    customer_id: row.customer_id,
    date: row.date,
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    total_amount: Number(row.total_amount) || 0,
    amount_paid: Number(row.amount_paid) || 0,
    amount_due: Number(row.amount_due) || 0,
    payment_status: (row.payment_status as PaymentStatus) || "Credit",
    bill_status: (row.bill_status as Bill["bill_status"]) || "Active",
  };
}

function parseBillItem(row: Record<string, string>): BillItem {
  return {
    bill_item_id: row.bill_item_id,
    bill_number: row.bill_number,
    saree_code: row.saree_code,
    price_at_sale: Number(row.price_at_sale) || 0,
    item_status: (row.item_status as BillItem["item_status"]) || "Sold",
  };
}

export async function listBills(): Promise<Bill[]> {
  const rows = await readSheet(SHEET.Bills);
  return rows.map(parseBill).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getBillByNumber(billNumber: string): Promise<Bill | null> {
  const rows = await readSheet(SHEET.Bills);
  const row = rows.find((r) => r.bill_number === billNumber);
  return row ? parseBill(row) : null;
}

export async function getBillItems(billNumber: string): Promise<BillItem[]> {
  const rows = await readSheet(SHEET.BillItems);
  return rows.filter((r) => r.bill_number === billNumber).map(parseBillItem);
}

export async function getBillDetail(billNumber: string): Promise<BillDetail | null> {
  const bill = await getBillByNumber(billNumber);
  if (!bill) return null;

  const [customer, items, sarees] = await Promise.all([
    getCustomerById(bill.customer_id),
    getBillItems(billNumber),
    listInventory(),
  ]);

  const sareeByCode = new Map(sarees.map((s) => [s.saree_code, s]));
  const enrichedItems = items.map((item) => {
    const saree = sareeByCode.get(item.saree_code);
    return {
      ...item,
      material: saree?.material ?? "",
      design_type: saree?.design_type ?? "",
      photo_url: saree?.photo_url ?? "",
    };
  });

  return { bill, customer, items: enrichedItems };
}

/** Section 9: customer total spend / current due, always computed live from Bills. */
export async function getCustomerBillSummary(customerId: string): Promise<{
  customer: Customer | null;
  bills: Bill[];
  totalSpent: number;
  totalDue: number;
}> {
  const [customer, allBills] = await Promise.all([getCustomerById(customerId), listBills()]);
  const bills = allBills.filter((b) => b.customer_id === customerId);
  const totalSpent = bills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalDue = bills.reduce((sum, b) => sum + b.amount_due, 0);
  return { customer, bills, totalSpent, totalDue };
}

/** Section 6.1: Home tab's daily-glance stats, all computed live. */
export async function getHomeSummary(): Promise<HomeSummary> {
  const [bills, customers] = await Promise.all([listBills(), listCustomers()]);
  const customerById = new Map(customers.map((c) => [c.customer_id, c]));

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7); // YYYY-MM

  const activeBills = bills.filter((b) => b.bill_status !== "Returned");
  const todaySales = activeBills
    .filter((b) => b.date === todayStr)
    .reduce((sum, b) => sum + b.total_amount, 0);
  const monthSales = activeBills
    .filter((b) => b.date.startsWith(monthPrefix))
    .reduce((sum, b) => sum + b.total_amount, 0);

  const dueBills = bills.filter((b) => b.amount_due > 0);
  const totalPendingDues = dueBills.reduce((sum, b) => sum + b.amount_due, 0);

  const today = new Date(todayStr);
  const pendingBills: PendingBillSummary[] = dueBills
    .map((b) => {
      const billDate = new Date(b.date);
      const daysPending = Math.max(
        0,
        Math.round((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        bill_number: b.bill_number,
        customer_name: customerById.get(b.customer_id)?.name ?? "Unknown",
        amount_due: b.amount_due,
        days_pending: daysPending,
      };
    })
    .sort((a, b) => b.days_pending - a.days_pending);

  return { todaySales, monthSales, totalPendingDues, pendingBills };
}

export type CreateBillInput = {
  customer_id: string;
  saree_codes: string[];
  discount: number; // already resolved to a flat rupee amount by the caller
  amount_paid: number;
  date: string;
};

/**
 * Implements the spec's "one logical operation" sale flow (Section 7.2):
 * create the Bill row, create one Bill_Items row per saree, then flip each
 * saree's Inventory row to Sold. Sheets has no real transactions, so at this
 * app's two-user scale we validate everything up front (all codes exist and
 * are still In Stock) to minimize the chance of a partial write.
 */
export async function createBill(
  input: CreateBillInput
): Promise<{ bill: Bill; billItems: BillItem[] }> {
  if (input.saree_codes.length === 0) {
    throw new Error("Select at least one saree");
  }

  const inventory = await listInventory();
  const sareeByCode = new Map(inventory.map((s) => [s.saree_code, s]));

  const selected = input.saree_codes.map((code) => {
    const saree = sareeByCode.get(code);
    if (!saree) throw new Error(`Saree ${code} not found`);
    if (saree.status !== "In Stock") throw new Error(`Saree ${code} is no longer In Stock`);
    return saree;
  });

  const subtotal = selected.reduce((sum, s) => sum + s.selling_price, 0);
  const totalAmount = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.min(Math.max(0, input.amount_paid), totalAmount);
  const amountDue = totalAmount - amountPaid;
  const paymentStatus: PaymentStatus =
    amountDue <= 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Credit";

  const billNumber = await getNextId(SHEET.Bills, "bill_number", "AS-B", 4);

  const bill: Bill = {
    bill_number: billNumber,
    customer_id: input.customer_id,
    date: input.date,
    subtotal,
    discount: input.discount,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    amount_due: amountDue,
    payment_status: paymentStatus,
    bill_status: "Active",
  };
  await appendRow(SHEET.Bills, bill);

  const billItems: BillItem[] = [];
  for (const saree of selected) {
    const billItemId = await getNextId(SHEET.BillItems, "bill_item_id", "BI-", 5);
    const item: BillItem = {
      bill_item_id: billItemId,
      bill_number: billNumber,
      saree_code: saree.saree_code,
      price_at_sale: saree.selling_price,
      item_status: "Sold",
    };
    await appendRow(SHEET.BillItems, item);
    billItems.push(item);
  }

  for (const saree of selected) {
    await updateRowByKey(SHEET.Inventory, "saree_code", saree.saree_code, {
      status: "Sold",
      date_sold: input.date,
      bill_number: billNumber,
    });
  }

  return { bill, billItems };
}
