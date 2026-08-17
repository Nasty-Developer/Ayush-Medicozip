// Shared fetch-with-auth helper for the SQL-backed order/address/notification
// services. Attaches the caller's Firebase ID token (if signed in) so the
// api-server's requireAuth middleware can authorize the request.

import { auth } from "./firebase";

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth?.currentUser?.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
}

export async function authFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
