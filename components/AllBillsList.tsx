"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Bill, Customer, PaymentStatus } from "@/lib/types";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  Paid: "bg-sage text-cream",
  Partial: "bg-gold text-cream",
  Credit: "bg-terracotta text-cream",
};

export function AllBillsList() {
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/bills")
      .then((r) => r.json())
      .then((d) => setBills(d.bills ?? []));
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }, []);

  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.customer_id, c])),
    [customers]
  );

  const filtered = (bills ?? []).filter((b) => {
    if (statusFilter && b.payment_status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const customer = customerById.get(b.customer_id);
    return (
      b.bill_number.toLowerCase().includes(q) ||
      customer?.name.toLowerCase().includes(q) ||
      customer?.phone.includes(q)
    );
  });

  const selectClass = "rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-sage-dark";

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by customer or bill no."
          className="flex-1 rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-sage-dark"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "")}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Credit">Credit</option>
        </select>
      </div>

      {bills === null ? (
        <p className="p-8 text-center text-sage-dark/60">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="p-8 text-center text-sage-dark/60">No bills match.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((bill) => {
            const customer = customerById.get(bill.customer_id);
            return (
              <Link
                key={bill.bill_number}
                href={`/bills/${bill.bill_number}`}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sage-dark">{bill.bill_number}</p>
                  <p className="text-sm text-sage-dark/60">
                    {customer?.name ?? "Unknown"} · {bill.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sage-dark">₹{bill.total_amount}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[bill.payment_status]}`}
                  >
                    {bill.payment_status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
