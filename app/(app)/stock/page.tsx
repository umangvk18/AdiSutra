"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Saree, AttributesByType } from "@/lib/types";
import { photoProxySrc } from "@/lib/photoUrl";

type SortOption = "newest" | "oldest" | "id_asc" | "id_desc";

function sareeIdNumber(code: string): number {
  const digits = code.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export default function StockPage() {
  const [items, setItems] = useState<Saree[] | null>(null);
  const [attributes, setAttributes] = useState<AttributesByType>({});
  const [status, setStatus] = useState("In Stock");
  const [region, setRegion] = useState("");
  const [material, setMaterial] = useState("");
  const [designType, setDesignType] = useState("");
  const [vendor, setVendor] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (region) params.set("region", region);
    if (material) params.set("material", material);
    if (designType) params.set("design_type", designType);
    if (vendor) params.set("vendor", vendor);
    const res = await fetch(`/api/inventory?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
  }, [status, region, material, designType, vendor]);

  useEffect(() => {
    fetch("/api/attributes")
      .then((r) => r.json())
      .then((d) => setAttributes(d.attributes ?? {}));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searched = (items ?? []).filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const codeDigits = item.saree_code.replace(/\D/g, "");
    const queryDigits = q.replace(/\D/g, "");
    return (
      item.saree_code.toLowerCase().includes(q) ||
      (queryDigits.length > 0 && codeDigits.includes(queryDigits)) ||
      item.material.toLowerCase().includes(q) ||
      item.design_type.toLowerCase().includes(q) ||
      item.color.toLowerCase().includes(q)
    );
  });

  const displayedItems = [...searched].sort((a, b) => {
    switch (sortBy) {
      case "id_asc":
        return sareeIdNumber(a.saree_code) - sareeIdNumber(b.saree_code);
      case "id_desc":
        return sareeIdNumber(b.saree_code) - sareeIdNumber(a.saree_code);
      case "oldest":
        return a.date_received < b.date_received ? -1 : 1;
      case "newest":
      default:
        return a.date_received < b.date_received ? 1 : -1;
    }
  });

  const selectClass =
    "rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-sage-dark";

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="p-4 pb-2">
        <h1 className="font-serif text-2xl text-sage">Stock</h1>
      </header>

      <div className="px-4 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code, material, design, or color"
          className="w-full rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-sage-dark"
        />
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="">All statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Sold">Sold</option>
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectClass}>
          <option value="">All regions</option>
          {(attributes.Region ?? []).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={material} onChange={(e) => setMaterial(e.target.value)} className={selectClass}>
          <option value="">All materials</option>
          {(attributes.Material ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={designType} onChange={(e) => setDesignType(e.target.value)} className={selectClass}>
          <option value="">All designs</option>
          {(attributes.Design ?? []).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={selectClass}>
          <option value="">All vendors</option>
          {(attributes.Vendor ?? []).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className={selectClass}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="id_asc">ID: Low to High</option>
          <option value="id_desc">ID: High to Low</option>
        </select>
      </div>

      <div className="flex-1 px-4">
        {items === null ? (
          <p className="p-8 text-center text-sage-dark/60">Loading...</p>
        ) : displayedItems.length === 0 ? (
          <p className="p-8 text-center text-sage-dark/60">No sarees match.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {displayedItems.map((item) => (
              <Link
                key={item.saree_code}
                href={`/stock/${item.saree_code}`}
                className="overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm"
              >
                <div className="relative aspect-square w-full bg-blush/30">
                  {item.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoProxySrc(item.photo_url)}
                      alt={item.saree_code}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span
                    className={`absolute right-1 top-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.status === "Sold" ? "bg-terracotta text-cream" : "bg-sage text-cream"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-sage-dark">{item.saree_code}</p>
                  <p className="truncate text-xs text-sage-dark/70">
                    {item.material} · {item.design_type}
                  </p>
                  <p className="text-sm font-medium text-terracotta">
                    ₹{item.selling_price}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/stock/add"
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-3xl leading-none text-cream shadow-lg"
        aria-label="Add Saree"
      >
        +
      </Link>
    </div>
  );
}
