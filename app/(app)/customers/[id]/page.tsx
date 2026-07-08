"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Bill, Customer, PaymentStatus } from "@/lib/types";

type Summary = {
  customer: Customer;
  bills: Bill[];
  totalSpent: number;
  totalDue: number;
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  Paid: "bg-sage text-cream",
  Partial: "bg-gold text-cream",
  Credit: "bg-terracotta text-cream",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then(setSummary);
  }, [id]);

  if (summary === undefined) {
    return <p className="p-8 text-center text-sage-dark/60">Loading...</p>;
  }

  if (summary === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sage-dark/70">Customer not found.</p>
        <button onClick={() => router.push("/customers")} className="text-sage underline">
          Back to Customers
        </button>
      </div>
    );
  }

  const { customer, bills, totalSpent, totalDue } = summary;
  const sortedBills = [...bills].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-sage-dark/70">
          ←
        </button>
        <div>
          <h1 className="font-serif text-2xl text-sage">{customer.name}</h1>
          <p className="text-sm text-sage-dark/60">{customer.phone}</p>
        </div>
      </header>

      <div className="px-4">
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl border border-gold/20 bg-white p-4 text-center">
            <p className="text-xs text-sage-dark/60">Total Spent</p>
            <p className="text-xl font-semibold text-sage-dark">₹{totalSpent}</p>
          </div>
          <div
            className={`flex-1 rounded-2xl border p-4 text-center ${
              totalDue > 0 ? "border-terracotta bg-terracotta/10" : "border-gold/20 bg-white"
            }`}
          >
            <p className="text-xs text-sage-dark/60">Current Due</p>
            <p className={`text-xl font-semibold ${totalDue > 0 ? "text-terracotta" : "text-sage-dark"}`}>
              ₹{totalDue}
            </p>
          </div>
        </div>

        <Link
          href={`/bills?customer=${customer.customer_id}`}
          className="mt-4 block rounded-2xl bg-sage py-3 text-center font-medium text-cream"
        >
          Start New Bill for {customer.name}
        </Link>

        <h2 className="mb-2 mt-6 text-sm font-medium text-sage-dark/80">Purchase History</h2>
        {sortedBills.length === 0 ? (
          <p className="p-4 text-center text-sage-dark/60">No bills yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedBills.map((bill) => (
              <Link
                key={bill.bill_number}
                href={`/bills/${bill.bill_number}`}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sage-dark">{bill.bill_number}</p>
                  <p className="text-sm text-sage-dark/60">{bill.date}</p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
