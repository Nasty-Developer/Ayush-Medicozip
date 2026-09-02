// PostgreSQL-backed saved addresses.
// The uid argument is retained at the call sites for auth-scoped semantics;
// the API derives the actual owner from the Firebase ID token.

import { authFetchJson } from "./apiAuth";
import type { Timestamp } from "./orderService";

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

const listeners = new Map<string, Set<(addresses: CustomerAddress[]) => void>>();

function toTimestamp(value: unknown): Timestamp | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return { seconds: Math.floor(date.getTime() / 1000) };
}

function normalizeAddress(row: Record<string, unknown>): CustomerAddress {
  const addressType = row.addressType;
  return {
    id: String(row.id),
    fullName: String(row.fullName ?? ""),
    mobileNumber: String(row.mobileNumber ?? ""),
    alternateNumber: row.alternateNumber ? String(row.alternateNumber) : undefined,
    houseNumber: String(row.houseNumber ?? ""),
    buildingName: row.buildingName ? String(row.buildingName) : undefined,
    street: String(row.street ?? ""),
    area: row.area ? String(row.area) : undefined,
    landmark: row.landmark ? String(row.landmark) : undefined,
    city: String(row.city ?? "Mumbai"),
    state: String(row.state ?? "Maharashtra"),
    pincode: String(row.pincode ?? ""),
    addressType: addressType === "work" || addressType === "other" ? addressType : "home",
    isDefault: Boolean(row.isDefault),
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    createdAt: toTimestamp(row.createdAt),
    updatedAt: toTimestamp(row.updatedAt),
  };
}

function normalizeAddresses(rows: unknown): CustomerAddress[] {
  return Array.isArray(rows)
    ? rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object")).map(normalizeAddress)
    : [];
}

function notify(uid: string, addresses: CustomerAddress[]) {
  listeners.get(uid)?.forEach((listener) => listener(addresses));
}

function normalizeInput(input: CreateAddressInput): CreateAddressInput {
  return {
    ...input,
    fullName: input.fullName.trim(),
    mobileNumber: input.mobileNumber.trim(),
    alternateNumber: input.alternateNumber?.trim() || undefined,
    houseNumber: input.houseNumber.trim(),
    buildingName: input.buildingName?.trim() || undefined,
    street: input.street.trim(),
    area: input.area?.trim() || undefined,
    landmark: input.landmark?.trim() || undefined,
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
  };
}

function normalizePatch(input: Partial<CreateAddressInput>): Partial<CreateAddressInput> {
  const stringFields = [
    "fullName", "mobileNumber", "alternateNumber", "houseNumber", "buildingName",
    "street", "area", "landmark", "city", "state", "pincode",
  ] as const;
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        stringFields.includes(key as (typeof stringFields)[number]) && typeof value === "string"
          ? value.trim()
          : value,
      ]),
  ) as Partial<CreateAddressInput>;
}

function addressPayload(input: CreateAddressInput | Partial<CreateAddressInput>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

export async function getAddresses(uid: string): Promise<CustomerAddress[]> {
  if (!uid) return [];
  const rows = await authFetchJson<unknown[]>("/api/addresses");
  return normalizeAddresses(rows);
}

export async function addAddress(uid: string, input: CreateAddressInput): Promise<string> {
  const normalized = normalizeInput(input);
  const result = await authFetchJson<{ id: number; addresses: unknown[] }>("/api/addresses", {
    method: "POST",
    body: JSON.stringify(addressPayload(normalized)),
  });
  notify(uid, normalizeAddresses(result.addresses));
  return String(result.id);
}

export async function updateAddress(
  uid: string,
  addressId: string,
  data: Partial<CreateAddressInput>,
): Promise<void> {
  const result = await authFetchJson<unknown[]>(`/api/addresses/${encodeURIComponent(addressId)}`, {
    method: "PUT",
    body: JSON.stringify(addressPayload(normalizePatch(data))),
  });
  notify(uid, normalizeAddresses(result));
}

export async function deleteAddress(uid: string, addressId: string): Promise<void> {
  const result = await authFetchJson<{ success: boolean; addresses: unknown[] }>(
    `/api/addresses/${encodeURIComponent(addressId)}`,
    { method: "DELETE" },
  );
  notify(uid, normalizeAddresses(result.addresses));
}

export async function setDefaultAddress(uid: string, addressId: string): Promise<void> {
  const result = await authFetchJson<unknown[]>(
    `/api/addresses/${encodeURIComponent(addressId)}/default`,
    { method: "PATCH" },
  );
  notify(uid, normalizeAddresses(result));
}

export function subscribeToAddresses(
  uid: string,
  onData: (addresses: CustomerAddress[]) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!uid) {
    onData([]);
    return () => undefined;
  }

  const uidListeners = listeners.get(uid) ?? new Set<(addresses: CustomerAddress[]) => void>();
  uidListeners.add(onData);
  listeners.set(uid, uidListeners);
  let cancelled = false;

  getAddresses(uid)
    .then((addresses) => {
      if (!cancelled) onData(addresses);
    })
    .catch((error) => {
      if (!cancelled) onError?.(error instanceof Error ? error : new Error("Could not fetch saved addresses."));
    });

  return () => {
    cancelled = true;
    uidListeners.delete(onData);
    if (uidListeners.size === 0) listeners.delete(uid);
  };
}