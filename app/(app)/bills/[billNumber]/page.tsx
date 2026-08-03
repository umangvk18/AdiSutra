"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { BillDetail } from "@/lib/types";
import { photoProxySrc } from "@/lib/photoUrl";
import { BillImageActions } from "@/components/BillImageActions";
import type { BillImageItem } from "@/lib/renderBillImage";
import { fullName } from "@/lib/customerName";

export default function BillDetailPage() {
  const { billNumber } = useParams<{ billNumber: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<BillDetail | null | undefined>(undefined);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loggingPayment, setLoggingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [showCorrectPayment, setShowCorrectPayment] = useState(false);
  const [correctMode, setCorrectMode] = useState<"full" | "partial" | "credit">("credit");
  const [correctPartialAmount, setCorrectPartialAmount] = useState("");
  const [correctingPayment, setCorrectingPayment] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);

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

  const { bill, customer, items, expenses } = detail;

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

  async function handleCorrectPayment() {
    const amount =
      correctMode === "full"
        ? bill.total_amount
        : correctMode === "credit"
          ? 0
          : Number(correctPartialAmount);

    setCorrectingPayment(true);
    setCorrectError(null);
    try {
      const res = await fetch(`/api/bills/${billNumber}/correct-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_paid: amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to correct payment");
      }
      setShowCorrectPayment(false);
      setCorrectPartialAmount("");
      loadDetail();
    } catch (err) {
      setCorrectError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCorrectingPayment(false);
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
          {row("Customer", customer ? fullName(customer) : "Unknown")}
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

        {bill.bill_status !== "Returned" && (
          <Link
            href={`/bills/${billNumber}/edit`}
            className="mt-4 block rounded-2xl border-2 border-sage py-3 text-center font-medium text-sage"
          >
            Edit Bill (Return / Exchange)
          </Link>
        )}

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

        <div className="mt-4">
          {!showCorrectPayment ? (
            <button
              type="button"
              onClick={() => {
                setCorrectMode(
                  bill.payment_status === "Paid"
                    ? "full"
                    : bill.payment_status === "Credit"
                      ? "credit"
                      : "partial"
                );
                setCorrectPartialAmount(String(bill.amount_paid));
                setShowCorrectPayment(true);
              }}
              className="text-sm text-sage-dark/60 underline"
            >
              Payment marked wrong? Correct it
            </button>
          ) : (
            <div className="rounded-2xl border border-gold/20 bg-white p-4">
              <h2 className="mb-1 text-sm font-medium text-sage-dark/80">Correct Payment Status</h2>
              <p className="mb-2 text-xs text-sage-dark/50">
                Currently: {bill.payment_status}, ₹{bill.amount_paid} paid of ₹{bill.total_amount}
              </p>
              <div className="flex gap-2">
                {(["full", "partial", "credit"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCorrectMode(mode)}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium ${
                      correctMode === mode
                        ? "border-sage bg-sage text-cream"
                        : "border-gold/30 bg-white text-sage-dark"
                    }`}
                  >
                    {mode === "full" ? "Paid Full" : mode === "partial" ? "Partial" : "Full Credit"}
                  </button>
                ))}
              </div>
              {correctMode === "partial" && (
                <input
                  type="number"
                  inputMode="decimal"
                  value={correctPartialAmount}
                  onChange={(e) => setCorrectPartialAmount(e.target.value)}
                  placeholder="Amount actually paid"
                  className="mt-2 w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage"
                />
              )}
              {correctError && <p className="mt-2 text-center text-terracotta">{correctError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={
                    correctingPayment ||
                    (correctMode === "partial" &&
                      !(Number(correctPartialAmount) >= 0 && Number(correctPartialAmount) <= bill.total_amount))
                  }
                  onClick={handleCorrectPayment}
                  className="flex-1 rounded-xl bg-sage py-3 font-medium text-cream disabled:opacity-50"
                >
                  {correctingPayment ? "Saving..." : "Save Correction"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCorrectPayment(false)}
                  className="rounded-xl border-2 border-gold/40 px-4 py-3 text-sage-dark"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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

        {expenses.length > 0 && (
          <>
            <h2 className="mb-2 mt-4 text-sm font-medium text-sage-dark/80">
              Bill Expenses <span className="font-normal text-sage-dark/50">(business cost, not charged to customer)</span>
            </h2>
            <div className="flex flex-col gap-2">
              {expenses.map((e) => (
                <div
                  key={e.expense_id}
                  className="flex items-center justify-between rounded-xl border border-gold/20 bg-white px-4 py-3"
                >
                  <span className="text-sm text-sage-dark">{e.name}</span>
                  <span className="font-medium text-terracotta">₹{e.amount}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {customer && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-sage-dark/80">Bill Image</h2>
            <BillImageActions bill={bill} customer={customer} items={billImageItems} />
          </div>
        )}
      </div>
    </div>
  );
}
