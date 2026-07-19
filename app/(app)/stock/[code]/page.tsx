"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Saree } from "@/lib/types";
import { photoProxySrc } from "@/lib/photoUrl";

export default function SareeDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [saree, setSaree] = useState<Saree | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/inventory/${code}`)
      .then(async (res) => (res.ok ? (await res.json()).saree : null))
      .then(setSaree);
  }, [code]);

  if (saree === undefined) {
    return <p className="p-8 text-center text-sage-dark/60">Loading...</p>;
  }

  if (saree === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sage-dark/70">Saree not found.</p>
        <button onClick={() => router.push("/stock")} className="text-sage underline">
          Back to Stock
        </button>
      </div>
    );
  }

  const row = (label: string, value: string) => (
    <div className="flex justify-between border-b border-gold/15 py-2 text-sm">
      <span className="text-sage-dark/60">{label}</span>
      <span className="font-medium text-sage-dark">{value || "-"}</span>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-sage-dark/70">
          ←
        </button>
        <h1 className="font-serif text-2xl text-sage">{saree.saree_code}</h1>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${
            saree.status === "Sold" ? "bg-terracotta text-cream" : "bg-sage text-cream"
          }`}
        >
          {saree.status}
        </span>
      </header>

      <div className="px-4">
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-blush/30">
          {saree.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoProxySrc(saree.photo_url)} alt={saree.saree_code} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-gold/20 bg-white p-4">
          {row("Region", saree.region)}
          {row("Vendor", saree.vendor)}
          {row("Material", saree.material)}
          {row("Design", saree.design_type)}
          {row("Color", saree.color)}
          {row("Cost Price", `₹${saree.cost_price}`)}
          {row("Selling Price", `₹${saree.selling_price}`)}
          {row("Date Received", saree.date_received)}
          {saree.status === "Sold" && row("Date Sold", saree.date_sold)}
          {saree.status === "Sold" && row("Bill Number", saree.bill_number)}
        </div>

        <Link
          href={`/stock/${saree.saree_code}/edit`}
          className="mt-4 block rounded-2xl bg-sage py-3 text-center font-medium text-cream"
        >
          Edit Saree
        </Link>
      </div>
    </div>
  );
}
