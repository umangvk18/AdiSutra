"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { BillDetail } from "@/lib/types";
import { photoProxySrc } from "@/lib/photoUrl";
import { BillImageActions } from "@/components/BillImageActions";
import type { BillImageItem } from "@/components/BillImageTemplate";

export default function BillDetailPage() {
  const { billNumber } = useParams<{ billNumber: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<BillDetail | null | undefined>(undefined);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loggingPayment, setLoggingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  function loadDetail() {
    fetch(`/api/bills/${billNumber}`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then(setDetail);
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleLogPayment(amount: number) {
    setLoggingPayment(true);
    setPaymentError(null);
    try {
      const res = await fetch(`/api/bills/${billNumber}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log payment");
      }
      setPaymentAmount("");
      loadDetail();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoggingPayment(false);
    }
  }

  const row = (label: string, value: string, opts?: { color?: string }) => (
    <div className="flex justify-between border-b border-gold/15 py-2 text-sm">
      <span className="text-sage-dark/60">{label}</span>
      <span className="font-medium" style={{ color: opts?.color }}>
        {value || "-"}
      </span>
    </div>
  );

  const billImageItems: BillImageItem[] = items.map((item) => ({
    saree_code: item.saree_code,
    description: `${item.material} - ${item.design_type}`,
    price: item.price_at_sale,
  }));

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
          {row("Payment Method", bill.payment_method)}
        </div>

        {bill.amount_due > 0 && (
          <div className="mt-4 rounded-2xl border border-gold/20 bg-white p-4">
            <h2 className="mb-2 text-sm font-medium text-sage-dark/80">Log Payment</h2>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Amount received"
                className="flex-1 rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage"
              />
              <button
                type="button"
                onClick={() => setPaymentAmount(String(bill.amount_due))}
                className="rounded-xl border-2 border-sage px-3 py-3 text-sm text-sage"
              >
                Full (₹{bill.amount_due})
              </button>
            </div>
            {paymentError && <p className="mt-2 text-center text-terracotta">{paymentError}</p>}
            <button
              type="button"
              disabled={loggingPayment || !(Number(paymentAmount) > 0)}
              onClick={() => handleLogPayment(Number(paymentAmount))}
              className="mt-3 w-full rounded-xl bg-sage py-3 font-medium text-cream disabled:opacity-50"
            >
              {loggingPayment ? "Saving..." : "Log Payment"}
            </button>
          </div>
        )}

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

        {customer && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-sage-dark/80">Bill Image</h2>
            <BillImageActions bill={bill} customer={customer} items={billImageItems} />
          </div>
        )}

        <p className="mt-4 text-center text-xs text-sage-dark/50">
          Process Return is coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
