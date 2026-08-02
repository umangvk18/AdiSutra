"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { BillDetail, Saree } from "@/lib/types";
import { photoProxySrc } from "@/lib/photoUrl";

type ItemAction = "keep" | "return" | "exchange";
type SettleMode = "full" | "partial" | "later";

export default function EditBillPage() {
  const { billNumber } = useParams<{ billNumber: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<BillDetail | null | undefined>(undefined);
  const [inStockSarees, setInStockSarees] = useState<Saree[] | null>(null);

  const [actions, setActions] = useState<Record<string, ItemAction>>({});
  const [exchangeTargets, setExchangeTargets] = useState<
    Record<string, { saree: Saree; price: string }>
  >({});
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  const [settleMode, setSettleMode] = useState<SettleMode>("full");
  const [settlePartialAmount, setSettlePartialAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bills/${billNumber}`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then(setDetail);
    fetch("/api/inventory?status=In Stock")
      .then((r) => r.json())
      .then((d) => setInStockSarees(d.items ?? []));
  }, [billNumber]);

  if (detail === undefined || inStockSarees === null) {
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

  if (detail.bill.bill_status === "Returned") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sage-dark/70">
          This bill has already been fully returned -- nothing left to edit.
        </p>
        <button onClick={() => router.push(`/bills/${billNumber}`)} className="text-sage underline">
          Back to Bill
        </button>
      </div>
    );
  }

  const { bill } = detail;
  const soldItems = detail.items.filter((i) => i.item_status === "Sold");

  const usedReplacementCodes = new Set(
    Object.values(exchangeTargets).map((t) => t.saree.saree_code)
  );

  function actionFor(code: string): ItemAction {
    return actions[code] ?? "keep";
  }

  function setAction(code: string, action: ItemAction) {
    setActions((prev) => ({ ...prev, [code]: action }));
    if (action !== "exchange") {
      setExchangeTargets((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      if (pickerOpenFor === code) setPickerOpenFor(null);
    } else {
      setPickerOpenFor(code);
    }
  }

  function chooseReplacement(oldCode: string, saree: Saree) {
    setExchangeTargets((prev) => ({
      ...prev,
      [oldCode]: { saree, price: String(saree.selling_price) },
    }));
    setPickerOpenFor(null);
    setPickerQuery("");
  }

  function setReplacementPrice(oldCode: string, price: string) {
    setExchangeTargets((prev) =>
      prev[oldCode] ? { ...prev, [oldCode]: { ...prev[oldCode], price } } : prev
    );
  }

  // What the bill's total would become if confirmed right now.
  const newTotal = soldItems.reduce((sum, item) => {
    const action = actionFor(item.saree_code);
    if (action === "return") return sum;
    if (action === "exchange") {
      const target = exchangeTargets[item.saree_code];
      return sum + (target ? Number(target.price) || 0 : item.price_at_sale);
    }
    return sum + item.price_at_sale;
  }, 0);

  const netDelta = newTotal - bill.amount_paid; // >0 collect more, <0 refund owed
  const hasChanges = Object.values(actions).some((a) => a !== "keep");
  const allExchangesHaveTargets = Object.entries(actions).every(
    ([code, action]) => action !== "exchange" || Boolean(exchangeTargets[code])
  );

  const settleAmount =
    settleMode === "full"
      ? Math.abs(netDelta)
      : settleMode === "partial"
        ? Number(settlePartialAmount) || 0
        : 0;

  const canSubmit =
    hasChanges &&
    allExchangesHaveTargets &&
    (netDelta === 0 ||
      settleMode !== "partial" ||
      (settleAmount > 0 && settleAmount < Math.abs(netDelta)));

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const returns = Object.entries(actions)
        .filter(([, action]) => action === "return")
        .map(([code]) => code);
      const exchanges = Object.entries(actions)
        .filter(([, action]) => action === "exchange")
        .map(([code]) => {
          const target = exchangeTargets[code];
          return {
            old_saree_code: code,
            new_saree_code: target.saree.saree_code,
            price_at_sale: Number(target.price) || 0,
          };
        });

      const collectedNow = netDelta > 0 ? settleAmount : 0;
      const refundedNow = netDelta < 0 ? settleAmount : 0;

      const res = await fetch(`/api/bills/${billNumber}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returns,
          exchanges,
          collected_now: collectedNow,
          refunded_now: refundedNow,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update bill");
      }
      router.push(`/bills/${billNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const pickerSarees = (inStockSarees ?? []).filter((s) => {
    if (usedReplacementCodes.has(s.saree_code)) return false;
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    const codeDigits = s.saree_code.replace(/\D/g, "");
    const queryDigits = q.replace(/\D/g, "");
    return (
      s.saree_code.toLowerCase().includes(q) ||
      (queryDigits.length > 0 && codeDigits.includes(queryDigits))
    );
  });

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-sage-dark/70">
          ←
        </button>
        <h1 className="font-serif text-2xl text-sage">Edit {bill.bill_number}</h1>
      </header>

      <div className="flex flex-col gap-3 px-4">
        <p className="text-xs text-sage-dark/50">
          Mark each item Keep / Return / Exchange. You can do several at once, then confirm.
        </p>

        {soldItems.map((item) => {
          const action = actionFor(item.saree_code);
          const target = exchangeTargets[item.saree_code];
          return (
            <div key={item.saree_code} className="rounded-xl border border-gold/20 bg-white p-3">
              <div className="flex items-center gap-3">
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
                    {item.material} · {item.design_type} · ₹{item.price_at_sale}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex gap-2">
                {(["keep", "return", "exchange"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAction(item.saree_code, opt)}
                    className={`flex-1 rounded-lg border-2 py-2 text-xs font-medium capitalize ${
                      action === opt
                        ? "border-sage bg-sage text-cream"
                        : "border-gold/30 bg-white text-sage-dark"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {action === "exchange" && (
                <div className="mt-2">
                  {target ? (
                    <div className="flex items-center gap-2 rounded-lg border border-sage/50 bg-sage/5 p-2">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-blush/30">
                        {target.saree.photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoProxySrc(target.saree.photo_url)}
                            alt={target.saree.saree_code}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <span className="flex-1 text-xs text-sage-dark">
                        → {target.saree.saree_code} ({target.saree.material})
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={target.price}
                        onChange={(e) => setReplacementPrice(item.saree_code, e.target.value)}
                        className="w-20 rounded-lg border border-gold/30 bg-white px-2 py-1 text-xs text-sage-dark"
                      />
                      <button
                        type="button"
                        onClick={() => setPickerOpenFor(item.saree_code)}
                        className="text-xs text-sage underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-terracotta">Pick a replacement below</p>
                  )}

                  {pickerOpenFor === item.saree_code && (
                    <div className="mt-2 rounded-lg border border-gold/30 bg-white p-2">
                      <input
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        placeholder="Search by code"
                        className="mb-2 w-full rounded-lg border border-gold/30 bg-white px-2 py-1 text-xs text-sage-dark"
                      />
                      <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto">
                        {pickerSarees.map((s) => (
                          <button
                            type="button"
                            key={s.saree_code}
                            onClick={() => chooseReplacement(item.saree_code, s)}
                            className="relative h-16 overflow-hidden rounded-lg border border-transparent"
                          >
                            {s.photo_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={photoProxySrc(s.photo_url)}
                                alt={s.saree_code}
                                className="h-full w-full object-cover"
                              />
                            )}
                            <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 text-[8px] text-cream">
                              {s.saree_code} · ₹{s.selling_price}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {hasChanges && (
          <div className="rounded-xl border border-gold/20 bg-white p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-sage-dark/60">Old Total</span>
              <span className="font-medium">₹{bill.total_amount}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sage-dark/60">New Total</span>
              <span className="font-medium">₹{newTotal}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sage-dark/60">Already Paid</span>
              <span className="font-medium">₹{bill.amount_paid}</span>
            </div>

            {netDelta === 0 ? (
              <p className="mt-2 text-center text-sage-dark/60">No money changes hands.</p>
            ) : (
              <>
                <p
                  className={`mt-2 text-center font-medium ${
                    netDelta > 0 ? "text-terracotta" : "text-sage"
                  }`}
                >
                  {netDelta > 0
                    ? `₹${netDelta} more to collect`
                    : `₹${Math.abs(netDelta)} refund owed`}
                </p>
                <div className="mt-2 flex gap-2">
                  {(["full", "partial", "later"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSettleMode(mode)}
                      className={`flex-1 rounded-lg border-2 py-2 text-xs font-medium ${
                        settleMode === mode
                          ? "border-sage bg-sage text-cream"
                          : "border-gold/30 bg-white text-sage-dark"
                      }`}
                    >
                      {netDelta > 0
                        ? mode === "full"
                          ? "Collect Full"
                          : mode === "partial"
                            ? "Collect Partial"
                            : "Collect Later"
                        : mode === "full"
                          ? "Refund Full"
                          : mode === "partial"
                            ? "Refund Partial"
                            : "Refund Later"}
                    </button>
                  ))}
                </div>
                {settleMode === "partial" && (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={settlePartialAmount}
                    onChange={(e) => setSettlePartialAmount(e.target.value)}
                    placeholder={`Amount (max ₹${Math.abs(netDelta)})`}
                    className="mt-2 w-full rounded-lg border-2 border-gold/30 bg-white px-3 py-2 text-sm text-sage-dark outline-none focus:border-sage"
                  />
                )}
              </>
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
          {submitting ? "Saving..." : "Confirm Changes"}
        </button>
      </div>
    </div>
  );
}
