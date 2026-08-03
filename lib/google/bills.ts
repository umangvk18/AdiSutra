import "server-only";
import { readSheet, appendRow, getNextId, updateRowByKey } from "./sheets";
import { SHEET } from "./config";
import { listInventory, getAverageInventoryDays } from "./inventory";
import { getCustomerById, listCustomers } from "./customers";
import { getMonthExpenseTotal, getExpensesForBill, createExpense } from "./expenses";
import { fullName } from "../customerName";
import type {
  Bill,
  BillItem,
  PaymentStatus,
  PaymentMethod,
  BillDetail,
  Customer,
  HomeSummary,
  PendingBillSummary,
  MonthlySales,
  Expense,
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
    payment_method: (row.payment_method as PaymentMethod) || "Cash",
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

  const [customer, items, sarees, expenses] = await Promise.all([
    getCustomerById(bill.customer_id),
    getBillItems(billNumber),
    listInventory(),
    getExpensesForBill(billNumber),
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

  return { bill, customer, items: enrichedItems, expenses };
}

/**
 * Section 7.4: logs an additional payment against an existing Partial/Credit
 * bill. Adds to amount_paid, recalculates amount_due, and re-derives
 * payment_status -- updates the same bill row in place rather than creating
 * a new bill record.
 */
export async function logPayment(billNumber: string, amount: number): Promise<Bill> {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  const bill = await getBillByNumber(billNumber);
  if (!bill) {
    throw new Error(`Bill ${billNumber} not found`);
  }

  const amountPaid = Math.min(bill.amount_paid + amount, bill.total_amount);
  const amountDue = Math.max(0, bill.total_amount - amountPaid);
  const paymentStatus: PaymentStatus =
    amountDue <= 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Credit";

  await updateRowByKey(SHEET.Bills, "bill_number", billNumber, {
    amount_paid: amountPaid,
    amount_due: amountDue,
    payment_status: paymentStatus,
  });

  return { ...bill, amount_paid: amountPaid, amount_due: amountDue, payment_status: paymentStatus };
}

/**
 * Corrects a bill's recorded payment to an exact amount -- unlike
 * logPayment (which only ever adds to what's recorded, for a genuine new
 * payment received), this directly sets amount_paid, for fixing a data-entry
 * mistake (e.g. a bill marked Paid that was actually never collected).
 */
export async function correctBillPayment(billNumber: string, amountPaid: number): Promise<Bill> {
  if (amountPaid < 0) {
    throw new Error("Amount cannot be negative");
  }
  const bill = await getBillByNumber(billNumber);
  if (!bill) {
    throw new Error(`Bill ${billNumber} not found`);
  }

  const clampedPaid = Math.min(amountPaid, bill.total_amount);
  const amountDue = Math.max(0, bill.total_amount - clampedPaid);
  const paymentStatus: PaymentStatus =
    amountDue <= 0 ? "Paid" : clampedPaid > 0 ? "Partial" : "Credit";

  await updateRowByKey(SHEET.Bills, "bill_number", billNumber, {
    amount_paid: clampedPaid,
    amount_due: amountDue,
    payment_status: paymentStatus,
  });

  return { ...bill, amount_paid: clampedPaid, amount_due: amountDue, payment_status: paymentStatus };
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

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Trailing 12 months of sales (active bills only), oldest to newest. */
function computeMonthlySales(activeBills: Bill[]): MonthlySales[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}` });
  }

  const totalsByMonth = new Map<string, number>();
  for (const bill of activeBills) {
    const key = bill.date.slice(0, 7);
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + bill.total_amount);
  }

  return months.map((m) => ({
    month: m.label,
    total: totalsByMonth.get(m.key) ?? 0,
  }));
}

/** Section 6.1: Home tab's daily-glance stats, all computed live. */
export async function getHomeSummary(): Promise<HomeSummary> {
  const [bills, customers, monthExpenses, avgInventoryDays] = await Promise.all([
    listBills(),
    listCustomers(),
    getMonthExpenseTotal(),
    getAverageInventoryDays(),
  ]);
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
  const monthlySales = computeMonthlySales(activeBills);

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
      const customer = customerById.get(b.customer_id);
      return {
        bill_number: b.bill_number,
        customer_name: customer ? fullName(customer) : "Unknown",
        amount_due: b.amount_due,
        days_pending: daysPending,
      };
    })
    .sort((a, b) => b.days_pending - a.days_pending);

  return {
    todaySales,
    monthSales,
    totalPendingDues,
    monthExpenses,
    avgInventoryDays,
    monthlySales,
    pendingBills,
  };
}

export type CreateBillInput = {
  customer_id: string;
  // Each saree can carry its own discounted price (e.g. 5% off one, 10% off
  // another) -- price_at_sale is what it actually sells for on this bill.
  // The bill's aggregate `discount` is derived as subtotal - sum(price_at_sale)
  // rather than being entered as a single bill-wide number.
  items: { saree_code: string; price_at_sale: number }[];
  amount_paid: number;
  date: string;
  payment_method: PaymentMethod;
  // Optional Fall Pico/freight-style costs tied to this specific bill --
  // most bills won't have any. These are the business's own cost, tracked
  // for profit visibility; they don't affect what the customer is charged
  // (subtotal/total/amount_due are untouched).
  expenses?: { name: string; amount: number }[];
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
): Promise<{ bill: Bill; billItems: BillItem[]; expenses: Expense[] }> {
  if (input.items.length === 0) {
    throw new Error("Select at least one saree");
  }

  const inventory = await listInventory();
  const sareeByCode = new Map(inventory.map((s) => [s.saree_code, s]));

  const selected = input.items.map((item) => {
    const saree = sareeByCode.get(item.saree_code);
    if (!saree) throw new Error(`Saree ${item.saree_code} not found`);
    if (saree.status !== "In Stock") throw new Error(`Saree ${item.saree_code} is no longer In Stock`);
    // Clamp to a sane range so a stray client-side bug can't corrupt the
    // record -- never negative, never more than the saree's own price.
    const priceAtSale = Math.max(0, Math.min(item.price_at_sale, saree.selling_price));
    return { saree, priceAtSale };
  });

  const subtotal = selected.reduce((sum, s) => sum + s.saree.selling_price, 0);
  const totalAmount = selected.reduce((sum, s) => sum + s.priceAtSale, 0);
  const discount = Math.max(0, subtotal - totalAmount);
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
    discount,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    amount_due: amountDue,
    payment_status: paymentStatus,
    bill_status: "Active",
    payment_method: input.payment_method,
  };
  await appendRow(SHEET.Bills, bill);

  const billItems: BillItem[] = [];
  for (const { saree, priceAtSale } of selected) {
    const billItemId = await getNextId(SHEET.BillItems, "bill_item_id", "BI-", 5);
    const item: BillItem = {
      bill_item_id: billItemId,
      bill_number: billNumber,
      saree_code: saree.saree_code,
      price_at_sale: priceAtSale,
      item_status: "Sold",
    };
    await appendRow(SHEET.BillItems, item);
    billItems.push(item);
  }

  for (const { saree } of selected) {
    await updateRowByKey(SHEET.Inventory, "saree_code", saree.saree_code, {
      status: "Sold",
      date_sold: input.date,
      bill_number: billNumber,
    });
  }

  const expenses: Expense[] = [];
  for (const draft of input.expenses ?? []) {
    if (!draft.name.trim() || draft.amount <= 0) continue;
    const expense = await createExpense({
      date: input.date,
      name: draft.name,
      amount: draft.amount,
      notes: "",
      bill_number: billNumber,
    });
    expenses.push(expense);
  }

  return { bill, billItems, expenses };
}

export type BillRevisionInput = {
  // Plain returns: saree goes back to In Stock, drops off the bill entirely.
  returns: string[];
  // Exchanges: old saree goes back to In Stock, new saree becomes Sold on
  // this same bill at its own (possibly discounted) price -- can be a
  // different price entirely, not necessarily matching the original.
  exchanges: { old_saree_code: string; new_saree_code: string; price_at_sale: number }[];
  // Cash that actually changes hands right now, as a result of this
  // revision -- only one of these is normally nonzero, but both are
  // accepted for flexibility. amount_paid is adjusted by
  // (collected_now - refunded_now) rather than storing a separate
  // "refund owed" figure, so it always reflects true net cash received.
  collected_now: number;
  refunded_now: number;
};

/**
 * Implements returns and exchanges (Phase 2 v1) as one combined edit: for
 * each item on a bill you can Keep it, Return it (back to In Stock, off the
 * bill), or Exchange it for a different In-Stock saree (old one goes back
 * to stock, new one becomes Sold on this same bill). Recomputes the bill's
 * subtotal/discount/total/amount_paid/amount_due/payment_status from
 * scratch afterward. bill_status becomes "Returned" only if nothing Sold
 * remains on the bill; otherwise "Partially Returned" -- an exchange is
 * modeled as a return + a fresh sale on the same bill, so it fits the
 * existing status/history model without a new status value: the item-level
 * Returned/Sold rows in Bill_Items already tell the full story.
 */
export async function reviseBill(
  billNumber: string,
  revision: BillRevisionInput
): Promise<{ bill: Bill }> {
  const bill = await getBillByNumber(billNumber);
  if (!bill) throw new Error(`Bill ${billNumber} not found`);
  if (bill.bill_status === "Returned") {
    throw new Error("This bill has already been fully returned -- nothing left to edit");
  }
  if (revision.returns.length === 0 && revision.exchanges.length === 0) {
    throw new Error("Mark at least one item as Returned or Exchanged");
  }

  const billItems = await getBillItems(billNumber);
  const soldItems = billItems.filter((i) => i.item_status === "Sold");
  const soldByCode = new Map(soldItems.map((i) => [i.saree_code, i]));

  for (const code of [...revision.returns, ...revision.exchanges.map((e) => e.old_saree_code)]) {
    if (!soldByCode.has(code)) {
      throw new Error(`${code} is not currently Sold on this bill`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const inventory = await listInventory();
  const sareeByCode = new Map(inventory.map((s) => [s.saree_code, s]));

  for (const code of revision.returns) {
    const item = soldByCode.get(code)!;
    await updateRowByKey(SHEET.BillItems, "bill_item_id", item.bill_item_id, {
      item_status: "Returned",
    });
    await updateRowByKey(SHEET.Inventory, "saree_code", code, {
      status: "In Stock",
      date_sold: "",
      bill_number: "",
    });
  }

  for (const { old_saree_code, new_saree_code, price_at_sale } of revision.exchanges) {
    const oldItem = soldByCode.get(old_saree_code)!;
    const newSaree = sareeByCode.get(new_saree_code);
    if (!newSaree) throw new Error(`Saree ${new_saree_code} not found`);
    if (newSaree.status !== "In Stock") {
      throw new Error(`Saree ${new_saree_code} is no longer In Stock`);
    }

    await updateRowByKey(SHEET.BillItems, "bill_item_id", oldItem.bill_item_id, {
      item_status: "Returned",
    });
    await updateRowByKey(SHEET.Inventory, "saree_code", old_saree_code, {
      status: "In Stock",
      date_sold: "",
      bill_number: "",
    });

    const clampedPrice = Math.max(0, Math.min(price_at_sale, newSaree.selling_price));
    const newBillItemId = await getNextId(SHEET.BillItems, "bill_item_id", "BI-", 5);
    await appendRow(SHEET.BillItems, {
      bill_item_id: newBillItemId,
      bill_number: billNumber,
      saree_code: new_saree_code,
      price_at_sale: clampedPrice,
      item_status: "Sold",
    });
    await updateRowByKey(SHEET.Inventory, "saree_code", new_saree_code, {
      status: "Sold",
      date_sold: today,
      bill_number: billNumber,
    });
  }

  const refreshedItems = await getBillItems(billNumber);
  const stillSold = refreshedItems.filter((i) => i.item_status === "Sold");

  const newSubtotal = stillSold.reduce((sum, i) => {
    const saree = sareeByCode.get(i.saree_code);
    return sum + (saree?.selling_price ?? i.price_at_sale);
  }, 0);
  const newTotal = stillSold.reduce((sum, i) => sum + i.price_at_sale, 0);
  const newDiscount = Math.max(0, newSubtotal - newTotal);

  const newAmountPaid = Math.max(
    0,
    Math.min(newTotal, bill.amount_paid + revision.collected_now - revision.refunded_now)
  );
  const newAmountDue = Math.max(0, newTotal - newAmountPaid);
  const newPaymentStatus: PaymentStatus =
    newAmountDue <= 0 ? "Paid" : newAmountPaid > 0 ? "Partial" : "Credit";
  const newBillStatus: Bill["bill_status"] = stillSold.length === 0 ? "Returned" : "Partially Returned";

  await updateRowByKey(SHEET.Bills, "bill_number", billNumber, {
    subtotal: newSubtotal,
    discount: newDiscount,
    total_amount: newTotal,
    amount_paid: newAmountPaid,
    amount_due: newAmountDue,
    payment_status: newPaymentStatus,
    bill_status: newBillStatus,
  });

  const updated = await getBillByNumber(billNumber);
  if (!updated) throw new Error("Bill vanished during revision");
  return { bill: updated };
}
