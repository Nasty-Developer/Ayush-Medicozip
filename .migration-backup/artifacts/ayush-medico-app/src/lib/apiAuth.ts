// Shared fetch-with-auth helper for the SQL-backed order/address/notification
// services. Attaches the caller's Firebase ID token (if signed in) so the
// api-server's requireAuth middleware can authorize the request.

import { auth, firebaseProjectId } from "./firebase";

/**
 * Return a current Firebase ID token for the signed-in user.
 *
 * `getIdTokenResult(true)` both forces the Firebase SDK to refresh an expired
 * token and gives us the audience claim. The audience check catches a
 * production configuration drift early instead of sending a token from a
 * different Firebase project to the API.
 */
export async function getFreshIdToken(): Promise<string> {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }

  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const tokenResult = await user.getIdTokenResult(true);
  const audience = tokenResult.claims.aud;
  if (typeof audience === "string" && firebaseProjectId && audience !== firebaseProjectId) {
    throw new Error(
      `Firebase project mismatch: token audience "${audience}" does not match "${firebaseProjectId}".`,
    );
  }

  if (!tokenResult.token) {
    throw new Error("Firebase did not return an ID token. Please sign in again.");
  }

  return tokenResult.token;
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(path, { ...init, headers });
  };

  const firstResponse = await send(await getFreshIdToken());
  if (firstResponse.status !== 401) return firstResponse;

  // A token can expire between Firebase auth state hydration and the request.
  // Retry once with another forced refresh; never retry indefinitely.
  return send(await getFreshIdToken());
}

export async function authFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
