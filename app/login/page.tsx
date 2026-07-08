"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1">
        <Image src="/logo-full.png" alt="AdiSutra" width={180} height={180} priority />
        <p className="text-sage-dark/70">Enter the shared PIN to continue</p>
      </div>

      <form action={formAction} className="flex w-full max-w-xs flex-col gap-4">
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          name="pin"
          autoFocus
          maxLength={6}
          placeholder="PIN"
          className="w-full rounded-2xl border-2 border-gold/40 bg-white px-6 py-5 text-center text-3xl tracking-[0.3em] text-sage-dark shadow-sm outline-none focus:border-sage"
        />

        {state?.error && (
          <p className="text-center text-terracotta">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-sage py-5 text-xl font-medium text-cream shadow-sm transition-opacity disabled:opacity-60"
        >
          {pending ? "Checking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}
