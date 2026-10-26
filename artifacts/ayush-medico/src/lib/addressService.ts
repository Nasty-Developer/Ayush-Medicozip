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
  deliveryInstructions?: string;
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
const addressCache = new Map<string, CustomerAddress[]>();
const mutationVersions = new Map<string, number>();

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
    deliveryInstructions: row.deliveryInstructions ? String(row.deliveryInstructions) : undefined,
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
  addressCache.set(uid, addresses);
  mutationVersions.set(uid, (mutationVersions.get(uid) ?? 0) + 1);
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
    deliveryInstructions: input.deliveryInstructions?.trim() || undefined,
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
  };
}

function normalizePatch(input: Partial<CreateAddressInput>): Partial<CreateAddressInput> {
  const stringFields = [
    "fullName", "mobileNumber", "alternateNumber", "houseNumber", "buildingName",
    "street", "area", "landmark", "deliveryInstructions", "city", "state", "pincode",
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
  const versionAtStart = mutationVersions.get(uid) ?? 0;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Saved addresses took too long to load. Please try again."));
    }, 15_000);
  });
  try {
    const rows = await Promise.race([
      authFetchJson<unknown[]>("/api/addresses", { signal: controller.signal }),
      timedOut,
    ]);
    const addresses = normalizeAddresses(rows);
    // If a save/edit/delete completed while this request was in flight, don't
    // replace its newer result with an older response.
    if ((mutationVersions.get(uid) ?? 0) !== versionAtStart) {
      return addressCache.get(uid) ?? addresses;
    }
    addressCache.set(uid, addresses);
    return addresses;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Saved addresses took too long to load. Please try again.");
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function addAddress(uid: string, input: CreateAddressInput): Promise<CustomerAddress> {
  const normalized = normalizeInput(input);
  const result = await authFetchJson<{ id: number; addresses: unknown[] }>("/api/addresses", {
    method: "POST",
    body: JSON.stringify(addressPayload(normalized)),
  });
  const addresses = normalizeAddresses(result.addresses);
  const created = addresses.find((address) => address.id === String(result.id));
  if (!created) {
    throw new Error("The address was created, but the refreshed address list did not include it. Please retry loading your addresses.");
  }
  notify(uid, addresses);
  return created;
}

export async function updateAddress(
  uid: string,
  addressId: string,
  data: Partial<CreateAddressInput>,
): Promise<CustomerAddress> {
  const result = await authFetchJson<unknown[]>(`/api/addresses/${encodeURIComponent(addressId)}`, {
    method: "PUT",
    body: JSON.stringify(addressPayload(normalizePatch(data))),
  });
  const addresses = normalizeAddresses(result);
  const updated = addresses.find((address) => address.id === addressId);
  if (!updated) {
    throw new Error("The address was updated, but the refreshed address list did not include it. Please retry loading your addresses.");
  }
  notify(uid, addresses);
  return updated;
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