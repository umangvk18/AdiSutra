"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HomeSummary } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-gold/20 bg-white p-4 text-center">
      <p className="text-xs text-sage-dark/60">{label}</p>
      <p className="text-xl font-semibold text-sage-dark">{value}</p>
    </div>
  );
}

export default function HomePage() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then(setSummary);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-24">
      <header className="flex items-center gap-2">
        <Image src="/logo-full.png" alt="AdiSutra" width={44} height={44} priority />
        <h1 className="font-serif text-2xl text-sage">AdiSutra</h1>
      </header>

      {!summary ? (
        <p className="p-8 text-center text-sage-dark/60">Loading...</p>
      ) : (
        <>
          <div className="flex gap-3">
            <StatCard label="Today's Sales" value={`₹${summary.todaySales}`} />
            <StatCard label="This Month" value={`₹${summary.monthSales}`} />
          </div>
          <div
            className={`rounded-2xl border p-4 text-center ${
              summary.totalPendingDues > 0
                ? "border-terracotta bg-terracotta/10"
                : "border-gold/20 bg-white"
            }`}
          >
            <p className="text-xs text-sage-dark/60">Total Pending Dues</p>
            <p
              className={`text-2xl font-semibold ${
                summary.totalPendingDues > 0 ? "text-terracotta" : "text-sage-dark"
              }`}
            >
              ₹{summary.totalPendingDues}
            </p>
            <p className="mt-1 text-xs text-sage-dark/40">
              Full Dashboard (material/region/vendor analytics) coming in Phase 2
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-sage-dark/80">Pending Bills</h2>
              <Link href="/bills?view=all" className="text-sm text-sage underline">
                View All →
              </Link>
            </div>

            {summary.pendingBills.length === 0 ? (
              <p className="rounded-2xl border border-gold/20 bg-white p-6 text-center text-sage-dark/60">
                No pending bills 🎉
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {summary.pendingBills.map((pb) => (
                  <Link
                    key={pb.bill_number}
                    href={`/bills/${pb.bill_number}`}
                    className="flex items-center justify-between rounded-xl border border-gold/20 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-sage-dark">{pb.customer_name}</p>
                      <p className="text-xs text-sage-dark/60">
                        {pb.days_pending} day{pb.days_pending === 1 ? "" : "s"} pending
                      </p>
                    </div>
                    <p className="font-medium text-terracotta">₹{pb.amount_due}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
