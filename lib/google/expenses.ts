import "server-only";
import { readSheet, appendRowWithGeneratedId } from "./sheets";
import { SHEET } from "./config";
import type { Expense } from "../types";

export type { Expense };

function parseExpense(row: Record<string, string>): Expense {
  return {
    expense_id: row.expense_id,
    date: row.date,
    name: row.name,
    amount: Number(row.amount) || 0,
    notes: row.notes ?? "",
    bill_number: row.bill_number ?? "",
  };
}

export async function listExpenses(): Promise<Expense[]> {
  const rows = await readSheet(SHEET.Expenses);
  return rows.map(parseExpense).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getExpensesForBill(billNumber: string): Promise<Expense[]> {
  const expenses = await listExpenses();
  return expenses.filter((e) => e.bill_number === billNumber);
}

export type NewExpenseInput = {
  date: string;
  name: string;
  amount: number;
  notes: string;
  bill_number?: string;
};

export async function createExpense(input: NewExpenseInput): Promise<Expense> {
  const row = await appendRowWithGeneratedId(SHEET.Expenses, "expense_id", "EXP-", 4, (id) => ({
    expense_id: id,
    date: input.date,
    name: input.name.trim(),
    amount: input.amount,
    notes: input.notes.trim(),
    bill_number: input.bill_number ?? "",
  }));
  return row as unknown as Expense;
}

export async function getMonthExpenseTotal(): Promise<number> {
  const expenses = await listExpenses();
  const monthPrefix = new Date().toISOString().slice(0, 7);
  return expenses.filter((e) => e.date.startsWith(monthPrefix)).reduce((sum, e) => sum + e.amount, 0);
}
