"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }, []);

  const filtered = (customers ?? []).filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="p-4 pb-2">
        <h1 className="font-serif text-2xl text-sage">Customers</h1>
      </header>

      <div className="px-4 pb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          className="w-full rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-sage-dark"
        />
      </div>

      <div className="flex-1 px-4">
        {customers === null ? (
          <p className="p-8 text-center text-sage-dark/60">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sage-dark/60">No customers match.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((c) => (
              <Link
                key={c.customer_id}
                href={`/customers/${c.customer_id}`}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-white px-4 py-3"
              >
                <span className="font-medium text-sage-dark">{c.name}</span>
                <span className="text-sm text-sage-dark/60">{c.phone}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
