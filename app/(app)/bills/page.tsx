"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NewBillForm } from "@/components/NewBillForm";
import { AllBillsList } from "@/components/AllBillsList";
import { ExpensesView } from "@/components/ExpensesView";

type View = "new" | "all" | "expenses";

function BillsContent() {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const initialView: View =
    requestedView === "all" ? "all" : requestedView === "expenses" ? "expenses" : "new";
  const [view, setView] = useState<View>(initialView);

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="p-4 pb-2">
        <h1 className="font-serif text-2xl text-sage">Bills</h1>
      </header>

      <div className="mx-4 mb-4 flex overflow-hidden rounded-xl border-2 border-sage">
        <button
          onClick={() => setView("new")}
          className={`flex-1 py-2 text-sm font-medium ${
            view === "new" ? "bg-sage text-cream" : "bg-white text-sage"
          }`}
        >
          New Bill
        </button>
        <button
          onClick={() => setView("all")}
          className={`flex-1 py-2 text-sm font-medium ${
            view === "all" ? "bg-sage text-cream" : "bg-white text-sage"
          }`}
        >
          All Bills
        </button>
        <button
          onClick={() => setView("expenses")}
          className={`flex-1 py-2 text-sm font-medium ${
            view === "expenses" ? "bg-sage text-cream" : "bg-white text-sage"
          }`}
        >
          Expenses
        </button>
      </div>

      {view === "new" ? <NewBillForm /> : view === "all" ? <AllBillsList /> : <ExpensesView />}
    </div>
  );
}

export default function BillsPage() {
  return (
    <Suspense>
      <BillsContent />
    </Suspense>
  );
}
