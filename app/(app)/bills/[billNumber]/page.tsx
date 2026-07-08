"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { BillDetail } from "@/lib/types";
import { photoProxySrc } from "@/lib/photoUrl";

export default function BillDetailPage() {
  const { billNumber } = useParams<{ billNumber: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<BillDetail | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/bills/${billNumber}`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then(setDetail);
  }, [billNumber]);

  if (detail === undefined) {
    return <p className="p-8 text-center text-sage-dark/60">Loading...</p>;
  }

  if (detail === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sage-dark/70">Bill not found.</p>
        <button onClick={() => router.push("/bills")} className="text-sage underline">
          Back to Bills
        </button>
      </div>
    );
  }

  const { bill, customer, items } = detail;

  const row = (label: string, value: string, opts?: { color?: string }) => (
    <div className="flex justify-between border-b border-gold/15 py-2 text-sm">
      <span className="text-sage-dark/60">{label}</span>
      <span className="font-medium" style={{ color: opts?.color }}>
        {value || "-"}
      </span>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-sage-dark/70">
          ←
        </button>
        <h1 className="font-serif text-2xl text-sage">{bill.bill_number}</h1>
        <span className="ml-auto rounded-full bg-sage px-3 py-1 text-xs font-medium text-cream">
          {bill.bill_status}
        </span>
      </header>

      <div className="px-4">
        <div className="rounded-2xl border border-gold/20 bg-white p-4">
          {row("Customer", customer?.name ?? "Unknown")}
          {row("Phone", customer?.phone ?? "-")}
          {row("Date", bill.date)}
          {row("Subtotal", `₹${bill.subtotal}`)}
          {bill.discount > 0 && row("Discount", `-₹${bill.discount}`)}
          {row("Total", `₹${bill.total_amount}`)}
          {row("Paid", `₹${bill.amount_paid}`)}
          {bill.amount_due > 0 && row("Due", `₹${bill.amount_due}`, { color: "#D98B5F" })}
          {row("Payment Status", bill.payment_status)}
        </div>

        <h2 className="mb-2 mt-4 text-sm font-medium text-sage-dark/80">Items</h2>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.bill_item_id}
              className="flex items-center gap-3 rounded-xl border border-gold/20 bg-white p-2"
            >
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-blush/30">
                {item.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoProxySrc(item.photo_url)}
                    alt={item.saree_code}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-sage-dark">{item.saree_code}</p>
                <p className="text-xs text-sage-dark/60">
                  {item.material} · {item.design_type}
                </p>
              </div>
              <div className="text-right text-sm font-medium text-sage-dark">
                ₹{item.price_at_sale}
                {item.item_status === "Returned" && (
                  <p className="text-[10px] text-terracotta">Returned</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-sage-dark/50">
          Log Payment and Process Return are coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
