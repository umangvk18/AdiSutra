"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Saree, Customer } from "@/lib/types";
import { photoProxySrc } from "@/lib/photoUrl";
import { DiscountInput } from "./DiscountInput";
import { BillImageActions } from "./BillImageActions";
import type { BillImageItem } from "./BillImageTemplate";

type PaymentMode = "full" | "partial" | "credit";
type PaymentMethod = "Cash" | "UPI";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function NewBillForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customer");

  const [sarees, setSarees] = useState<Saree[] | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [sareeQuery, setSareeQuery] = useState("");

  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBill, setSuccessBill] = useState<{
    bill_number: string;
    customer: Customer;
    items: BillImageItem[];
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    discount: number;
    subtotal: number;
    payment_status: string;
    payment_method: PaymentMethod;
    date: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/inventory?status=In Stock")
      .then((r) => r.json())
      .then((d) => setSarees(d.items ?? []));
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }, []);

  useEffect(() => {
    if (!presetCustomerId || !customers) return;
    const match = customers.find((c) => c.customer_id === presetCustomerId);
    if (match) setSelectedCustomer(match);
  }, [presetCustomerId, customers]);

  const selectedSarees = useMemo(
    () => (sarees ?? []).filter((s) => selectedCodes.includes(s.saree_code)),
    [sarees, selectedCodes]
  );
  const subtotal = selectedSarees.reduce((sum, s) => sum + s.selling_price, 0);
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const amountPaid =
    paymentMode === "full" ? totalAmount : paymentMode === "credit" ? 0 : Number(partialAmount) || 0;
  const amountDue = Math.max(0, totalAmount - amountPaid);

  const sareeSearchActive = sareeQuery.trim().length > 0;

  const filteredSarees = (sarees ?? []).filter((s) => {
    const q = sareeQuery.trim().toLowerCase();
    if (!q) return true;
    const codeDigits = s.saree_code.replace(/\D/g, "");
    const queryDigits = q.replace(/\D/g, "");
    return (
      s.saree_code.toLowerCase().includes(q) ||
      (queryDigits.length > 0 && codeDigits.includes(queryDigits))
    );
  });

  // When not searching, show already-selected sarees first so it's easy to
  // review/deselect them without hunting through the whole catalogue.
  const displaySarees = sareeSearchActive
    ? filteredSarees
    : [...filteredSarees].sort((a, b) => {
        const aSel = selectedCodes.includes(a.saree_code);
        const bSel = selectedCodes.includes(b.saree_code);
        return aSel === bSel ? 0 : aSel ? -1 : 1;
      });

  const filteredCustomers = (customers ?? []).filter((c) => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  function toggleSaree(code: string) {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  const canSubmit =
    selectedCodes.length > 0 &&
    (selectedCustomer || (showNewCustomer && newCustomerName.trim() && newCustomerPhone.trim())) &&
    (paymentMode !== "partial" || (Number(partialAmount) > 0 && Number(partialAmount) < totalAmount));

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      let customer = selectedCustomer;
      if (!customer && showNewCustomer) {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCustomerName, phone: newCustomerPhone }),
        });
        if (!res.ok) throw new Error("Failed to create customer");
        const data = await res.json();
        customer = data.customer;
      }
      if (!customer) throw new Error("Select or add a customer");

      const date = today();
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          saree_codes: selectedCodes,
          discount: discountAmount,
          amount_paid: amountPaid,
          date,
          payment_method: paymentMethod,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create bill");
      }
      const data = await res.json();

      const billImageItems: BillImageItem[] = selectedSarees.map((s) => ({
        saree_code: s.saree_code,
        description: `${s.material} - ${s.design_type}`,
        price: s.selling_price,
      }));

      setSuccessBill({
        bill_number: data.bill.bill_number,
        customer,
        items: billImageItems,
        total_amount: data.bill.total_amount,
        amount_paid: data.bill.amount_paid,
        amount_due: data.bill.amount_due,
        discount: data.bill.discount,
        subtotal: data.bill.subtotal,
        payment_status: data.bill.payment_status,
        payment_method: data.bill.payment_method,
        date: data.bill.date,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (successBill) {
    return (
      <div className="flex flex-1 flex-col items-center gap-6 p-6 text-center">
        <div className="text-5xl">🌸</div>
        <h2 className="font-serif text-2xl text-sage">Bill {successBill.bill_number} created</h2>

        <BillImageActions
          bill={{
            bill_number: successBill.bill_number,
            customer_id: successBill.customer.customer_id,
            date: successBill.date,
            subtotal: successBill.subtotal,
            discount: successBill.discount,
            total_amount: successBill.total_amount,
            amount_paid: successBill.amount_paid,
            amount_due: successBill.amount_due,
            payment_status: successBill.payment_status as "Paid" | "Partial" | "Credit",
            bill_status: "Active",
            payment_method: successBill.payment_method,
          }}
          customer={successBill.customer}
          items={successBill.items}
        />

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push(`/bills/${successBill.bill_number}`)}
            className="rounded-xl border-2 border-sage px-6 py-3 text-sage"
          >
            View Bill
          </button>
          <button onClick={() => router.refresh()} className="text-sage-dark/60 underline">
            Start a New Bill
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage";

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <div>
        <h2 className="mb-2 text-sm font-medium text-sage-dark/80">
          Select sarees ({selectedCodes.length} selected)
        </h2>
        {sarees !== null && sarees.length > 0 && (
          <input
            value={sareeQuery}
            onChange={(e) => setSareeQuery(e.target.value)}
            placeholder="Search by code (e.g. 0303 or AS-0303)"
            className="mb-2 w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage"
          />
        )}
        {sarees === null ? (
          <p className="p-4 text-center text-sage-dark/60">Loading stock...</p>
        ) : sarees.length === 0 ? (
          <p className="p-4 text-center text-sage-dark/60">No sarees in stock right now.</p>
        ) : displaySarees.length === 0 ? (
          <p className="p-4 text-center text-sage-dark/60">No sarees match &quot;{sareeQuery}&quot;.</p>
        ) : (
          <div className="grid max-h-[340px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {displaySarees.map((s) => {
              const selected = selectedCodes.includes(s.saree_code);
              return (
                <button
                  type="button"
                  key={s.saree_code}
                  onClick={() => toggleSaree(s.saree_code)}
                  className={`relative h-28 overflow-hidden rounded-xl border-2 ${
                    selected ? "border-sage" : "border-transparent"
                  }`}
                >
                  {s.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoProxySrc(s.photo_url)}
                      alt={s.saree_code}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {selected && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sage text-xs text-cream">
                      ✓
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 text-[10px] text-cream">
                    {s.saree_code} · ₹{s.selling_price}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedCodes.length > 0 && (
        <p className="text-right text-lg font-medium text-sage-dark">
          Subtotal: <span className="text-terracotta">₹{subtotal}</span>
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-sage-dark/80">Customer</label>
        {selectedCustomer ? (
          <div className="flex items-center justify-between rounded-xl border-2 border-sage bg-white px-4 py-3">
            <span>
              {selectedCustomer.name} · {selectedCustomer.phone}
            </span>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="text-sage-dark/60"
            >
              ✕
            </button>
          </div>
        ) : showNewCustomer ? (
          <div className="flex flex-col gap-2 rounded-xl border-2 border-gold/30 bg-white p-3">
            <input
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Name"
              className={inputClass}
            />
            <input
              type="tel"
              inputMode="numeric"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value.replace(/[^\d+]/g, ""))}
              placeholder="Phone"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowNewCustomer(false)}
              className="self-start text-sm text-sage-dark/60 underline"
            >
              Search existing instead
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search by name or phone"
              className={inputClass}
            />
            <div className="max-h-40 overflow-y-auto rounded-xl border border-gold/20 bg-white">
              {filteredCustomers.map((c) => (
                <button
                  type="button"
                  key={c.customer_id}
                  onClick={() => setSelectedCustomer(c)}
                  className="block w-full border-b border-gold/10 px-4 py-2 text-left last:border-b-0"
                >
                  {c.name} · {c.phone}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowNewCustomer(true)}
              className="self-start text-sm text-sage underline"
            >
              + New Customer
            </button>
          </div>
        )}
      </div>

      <div>
        <DiscountInput subtotal={subtotal} onChange={setDiscountAmount} />
        {discountAmount > 0 && (
          <p className="mt-1 text-right text-sm text-sage-dark/70">
            New Total: <span className="font-medium text-sage-dark">₹{totalAmount}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-sage-dark/80">Payment</label>
        <div className="flex gap-2">
          {(["full", "partial", "credit"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPaymentMode(mode)}
              className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium ${
                paymentMode === mode
                  ? "border-sage bg-sage text-cream"
                  : "border-gold/30 bg-white text-sage-dark"
              }`}
            >
              {mode === "full" ? "Paid Full" : mode === "partial" ? "Partial" : "Full Credit"}
            </button>
          ))}
        </div>
        {paymentMode === "partial" && (
          <input
            type="number"
            inputMode="decimal"
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
            placeholder="Amount received"
            className={`${inputClass} mt-2`}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-sage-dark/80">Payment Method</label>
        <div className="flex gap-2">
          {(["Cash", "UPI"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium ${
                paymentMethod === method
                  ? "border-sage bg-sage text-cream"
                  : "border-gold/30 bg-white text-sage-dark"
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {selectedCodes.length > 0 && (
        <div className="rounded-xl border border-gold/20 bg-white p-4 text-sm">
          {selectedSarees.map((s) => (
            <div key={s.saree_code} className="flex justify-between py-1">
              <span className="text-sage-dark/60">{s.saree_code}</span>
              <span className="font-medium">₹{s.selling_price}</span>
            </div>
          ))}
          <div className="my-2 border-t border-gold/15" />
          <div className="flex justify-between py-1">
            <span className="text-sage-dark/60">Total</span>
            <span className="font-medium">₹{totalAmount}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sage-dark/60">Paid</span>
            <span className="font-medium">₹{amountPaid}</span>
          </div>
          {amountDue > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-sage-dark/60">Due</span>
              <span className="font-medium text-terracotta">₹{amountDue}</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-center text-terracotta">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!canSubmit || submitting}
        className="w-full rounded-2xl bg-sage py-4 text-lg font-medium text-cream shadow-sm disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Confirm Bill"}
      </button>
    </div>
  );
}
