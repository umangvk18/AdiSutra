"use client";

import { useEffect, useState } from "react";
import type { Expense } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((d) => setExpenses(d.expenses ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  const canSubmit = name.trim() && Number(amount) > 0 && date;

  async function handleAdd() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, name, amount: Number(amount), notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add expense");
      }
      setName("");
      setAmount("");
      setNotes("");
      setDate(today());
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage";

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      {!showAdd ? (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-2xl bg-sage py-3 text-center font-medium text-cream"
        >
          + Add Expense
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-gold/30 bg-white p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Expense name (e.g. Fall Pico, Shipping)"
            className={inputClass}
          />
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount ₹"
            className={inputClass}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className={inputClass}
          />
          {error && <p className="text-center text-terracotta">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canSubmit || submitting}
              className="flex-1 rounded-xl bg-sage py-3 font-medium text-cream disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Expense"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border-2 border-gold/40 px-4 py-3 text-sage-dark"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expenses !== null && expenses.length > 0 && (
        <p className="text-right text-sm text-sage-dark/70">
          Total: <span className="font-medium text-sage-dark">₹{total}</span>
        </p>
      )}

      {expenses === null ? (
        <p className="p-8 text-center text-sage-dark/60">Loading...</p>
      ) : expenses.length === 0 ? (
        <p className="p-8 text-center text-sage-dark/60">No expenses logged yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((e) => (
            <div
              key={e.expense_id}
              className="flex items-center justify-between rounded-xl border border-gold/20 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-sage-dark">{e.name}</p>
                <p className="text-xs text-sage-dark/60">
                  {e.date}
                  {e.notes && ` · ${e.notes}`}
                </p>
              </div>
              <p className="font-medium text-terracotta">₹{e.amount}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
