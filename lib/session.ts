import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, encryptSession, verifySessionToken } from "./session-core";

export async function createSession(): Promise<void> {
  const token = await encryptSession();
  const cookieStore = await cookies();
  // Deliberately no `expires`/`maxAge` -- this makes it a *session* cookie,
  // which the browser (or the OS, for an installed PWA) discards when the
  // app is fully closed, not just backgrounded. The PIN is asked again on
  // the next real open, while normal navigation within one open session
  // doesn't re-prompt.
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Server-side check for use in Route Handlers / Server Actions / Server Components. */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(COOKIE_NAME)?.value);
}
