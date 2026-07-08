"use client";

import { useState } from "react";

const ADD_NEW = "__add_new__";

type Props = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAddNew: (value: string) => Promise<void>;
};

export function AttributeSelect({ label, options, value, onChange, onAddNew }: Props) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onAddNew(trimmed);
      onChange(trimmed);
      setNewValue("");
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-sage-dark/80">{label}</label>

      {!adding ? (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === ADD_NEW) {
              setAdding(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage"
        >
          <option value="" disabled>
            Select {label}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={ADD_NEW}>+ Add new {label.toLowerCase()}...</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`New ${label}`}
            className="flex-1 rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting || !newValue.trim()}
            className="rounded-xl bg-terracotta px-4 py-3 text-cream disabled:opacity-60"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewValue("");
            }}
            className="rounded-xl border-2 border-gold/30 px-3 py-3 text-sage-dark"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
