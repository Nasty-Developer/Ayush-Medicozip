// Shared fetch-with-auth helper for the SQL-backed order/address/notification
// services. Attaches the caller's Firebase ID token (if signed in) so the
// api-server's requireAuth middleware can authorize the request.

import { auth, firebaseProjectId } from "./firebase";

export class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

/**
 * Return a current Firebase ID token for the signed-in user.
 *
 * The Firebase SDK refreshes expired or near-expiry tokens automatically.
 * Callers can force a refresh after the API rejects a token, without making
 * every authenticated request wait on a token refresh.
 */
export async function getFreshIdToken(forceRefresh = false): Promise<string> {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }

  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const tokenResult = await user.getIdTokenResult(forceRefresh);
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

  // A cached token can be rejected before the SDK considers it near expiry.
  // Force one refresh, then retry once; never retry indefinitely.
  return send(await getFreshIdToken(true));
}

export async function authFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorBody = body as { error?: string; code?: string };
    throw new ApiResponseError(
      errorBody.error ?? `Request failed: ${res.status}`,
      res.status,
      errorBody.code,
    );
  }
  return res.json() as Promise<T>;
}
