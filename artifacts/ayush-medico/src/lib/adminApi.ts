/**
 * adminApi — one authenticated fetch helper for the admin panel.
 *
 * Several admin pages were calling /api/admin/* with a bare fetch() and no
 * Authorization header. Those endpoints require a Firebase ID token, so they
 * answered 401 with `{ error: "..." }`, and the page then treated that object as
 * its list payload (`data.data.map` → undefined) and crashed the whole screen
 * with the "Something went wrong" boundary.
 *
 * adminFetch attaches the token, refreshes it once if the server rejects it, and
 * never lets a non-JSON or error body look like valid data: callers get a
 * Response they can check with `ok`, or a typed error.
 */

import { auth } from "@/lib/firebase";

export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function token(force = false): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(force);
  } catch {
    return null;
  }
}

/** Fetch an authenticated admin endpoint. Throws AdminApiError on a failed status. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = async (idToken: string | null) =>
    fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      },
    });

  let res = await send(await token());

  // A stale token is the usual cause of a 401 here; force a refresh once.
  if (res.status === 401) {
    const fresh = await token(true);
    if (fresh) res = await send(fresh);
  }

  if (res.status === 401 || res.status === 403) {
    throw new AdminApiError("Your admin session expired. Refresh the page and sign in again.", res.status);
  }
  return res;
}

/** GET a JSON payload and fail loudly instead of handing back an error body. */
export async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    throw new AdminApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  }
  if (body === null) throw new AdminApiError("The server sent an empty response.", res.status);
  return body;
}
