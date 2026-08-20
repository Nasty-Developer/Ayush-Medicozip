// Address Service — SQL-backed CRUD for customer saved addresses.
// Talks to /api/addresses (PostgreSQL `addresses` table, scoped to the
// authenticated Firebase user server-side) instead of Firestore's
// userAddresses/{uid}/addresses subcollection.

import { authFetchJson } from "./apiAuth";
import type { Timestamp } from "./orderService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddressType = "home" | "work" | "other";

export type CustomerAddress = {
  id: string;
  fullName: string;
  mobileNumber: string;
  alternateNumber?: string;
  houseNumber: string;
  buildingName?: string;
  street: string;
  area?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: AddressType;
  isDefault: boolean;
  lat?: number | null;
  lng?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type CreateAddressInput = Omit<CustomerAddress, "id" | "createdAt" | "updatedAt">;

type AddressRow = {
  id: number;
  fullName: string;
  mobileNumber: string;
  alternateNumber: string | null;
  houseNumber: string;
  buildingName: string | null;
  street: string;
  area: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  addressType: AddressType;
  isDefault: boolean;
  lat: string | null;
  lng: string | null;
  createdAt: string;
  updatedAt: string;
};

function toTimestamp(iso: string): Timestamp {
  return { seconds: Math.floor(new Date(iso).getTime() / 1000) };
}

function mapRow(row: AddressRow): CustomerAddress {
  return {
    id: String(row.id),
    fullName: row.fullName,
    mobileNumber: row.mobileNumber,
    alternateNumber: row.alternateNumber ?? undefined,
    houseNumber: row.houseNumber,
    buildingName: row.buildingName ?? undefined,
    street: row.street,
    area: row.area ?? undefined,
    landmark: row.landmark ?? undefined,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    addressType: row.addressType,
    isDefault: row.isDefault,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    createdAt: toTimestamp(row.createdAt),
    updatedAt: toTimestamp(row.updatedAt),
  };
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────
// `uid` is kept in every signature for call-site compatibility (the previous
// Firestore paths were keyed by it) even though the API now derives the
// caller's identity from the Firebase ID token server-side.

export async function getAddresses(_uid: string): Promise<CustomerAddress[]> {
  const rows = await authFetchJson<AddressRow[]>("/api/addresses");
  return rows.map(mapRow);
}

export async function addAddress(
  _uid: string,
  input: CreateAddressInput
): Promise<string> {
  const { id } = await authFetchJson<{ id: number; addresses: AddressRow[] }>("/api/addresses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return String(id);
}

export async function updateAddress(
  _uid: string,
  addressId: string,
  data: Partial<CreateAddressInput>
): Promise<void> {
  await authFetchJson(`/api/addresses/${addressId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(_uid: string, addressId: string): Promise<void> {
  await authFetchJson(`/api/addresses/${addressId}`, { method: "DELETE" });
}

export async function setDefaultAddress(_uid: string, addressId: string): Promise<void> {
  await authFetchJson(`/api/addresses/${addressId}/default`, { method: "PATCH" });
}

// ─── Polling-based "subscription" ─────────────────────────────────────────────
// Firestore's onSnapshot gave live updates; the SQL API is request/response,
// so this polls on an interval while preserving the same callback signature
// and cleanup function so `useAddresses.ts` keeps working unchanged.

const POLL_INTERVAL_MS = 10000;

export function subscribeToAddresses(
  uid: string,
  onData: (addresses: CustomerAddress[]) => void,
  onError?: (err: Error) => void
): () => void {
  let cancelled = false;
  const tick = async () => {
    try {
      const addresses = await getAddresses(uid);
      if (!cancelled) onData(addresses);
    } catch (err) {
      if (!cancelled) onError?.(err as Error);
    }
  };
  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}
