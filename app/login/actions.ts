"use server";

import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";

export type LoginState = { error?: string } | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const pin = formData.get("pin");
  const correctPin = process.env.ADISUTRA_PIN;

  if (!correctPin) {
    return { error: "App is not configured yet (missing ADISUTRA_PIN)." };
  }
  if (typeof pin !== "string" || pin !== correctPin) {
    return { error: "Incorrect PIN. Try again." };
  }

  await createSession();
  redirect("/");
}
