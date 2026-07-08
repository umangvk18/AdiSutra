"use client";

import { useState } from "react";

type Mode = "flat" | "percent";

type Props = {
  subtotal: number;
  onChange: (resolvedAmount: number) => void;
};

export function DiscountInput({ subtotal, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("flat");
  const [raw, setRaw] = useState("");

  function resolve(nextMode: Mode, nextRaw: string) {
    setMode(nextMode);
    setRaw(nextRaw);
    const num = Number(nextRaw);
    if (!nextRaw || !Number.isFinite(num) || num < 0) {
      onChange(0);
      return;
    }
    const amount = nextMode === "percent" ? (subtotal * num) / 100 : num;
    onChange(Math.min(amount, subtotal));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-sage-dark/80">Discount</label>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={raw}
          onChange={(e) => resolve(mode, e.target.value)}
          placeholder="0"
          className="flex-1 rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage"
        />
        <div className="flex overflow-hidden rounded-xl border-2 border-gold/30">
          <button
            type="button"
            onClick={() => resolve("flat", raw)}
            className={`px-4 py-3 ${mode === "flat" ? "bg-sage text-cream" : "bg-white text-sage-dark"}`}
          >
            ₹
          </button>
          <button
            type="button"
            onClick={() => resolve("percent", raw)}
            className={`px-4 py-3 ${mode === "percent" ? "bg-sage text-cream" : "bg-white text-sage-dark"}`}
          >
            %
          </button>
        </div>
      </div>
    </div>
  );
}
