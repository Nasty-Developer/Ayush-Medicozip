// Client-only saved addresses.
// Addresses are deliberately scoped to the authenticated Firebase UID and are
// never sent to the API. Orders receive a plain snapshot of the selected data.

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

const STORAGE_PREFIX = "ayush-medico-saved-addresses:";
const listeners = new Map<string, Set<(addresses: CustomerAddress[]) => void>>();

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(uid)}`;
}

function nowTimestamp(): Timestamp {
  return { seconds: Math.floor(Date.now() / 1000) };
}

function readAddresses(uid: string): CustomerAddress[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(storageKey(uid));
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeAddresses(uid: string, addresses: CustomerAddress[]) {
  if (!uid) return;
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(addresses));
  } catch {
    // Private browsing and quota limits should not block order placement.
  }
  listeners.get(uid)?.forEach((listener) => listener(addresses));
}

function idForAddress() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `address-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function withDefault(addresses: CustomerAddress[], preferredId?: string) {
  const chosenId = preferredId ?? addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id;
  return addresses.map((address) => ({ ...address, isDefault: address.id === chosenId }));
}

export async function getAddresses(uid: string): Promise<CustomerAddress[]> {
  return readAddresses(uid);
}

export async function addAddress(uid: string, input: CreateAddressInput): Promise<string> {
  const timestamp = nowTimestamp();
  const address: CustomerAddress = {
    ...normalizeInput(input),
    id: idForAddress(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const current = readAddresses(uid);
  writeAddresses(uid, withDefault([...current, address], input.isDefault ? address.id : undefined));
  return address.id;
}

export async function updateAddress(
  uid: string,
  addressId: string,
  data: Partial<CreateAddressInput>,
): Promise<void> {
  const current = readAddresses(uid);
  const existing = current.find((address) => address.id === addressId);
  if (!existing) throw new Error("Address not found.");
  const next = {
    ...existing,
    ...normalizeInput({ ...existing, ...data }),
    id: existing.id,
    updatedAt: nowTimestamp(),
  };
  const updated = current.map((address) => (address.id === addressId ? next : address));
  writeAddresses(uid, data.isDefault ? withDefault(updated, addressId) : updated);
}

export async function deleteAddress(uid: string, addressId: string): Promise<void> {
  const current = readAddresses(uid);
  const removed = current.find((address) => address.id === addressId);
  if (!removed) return;
  const remaining = current.filter((address) => address.id !== addressId);
  writeAddresses(uid, removed.isDefault ? withDefault(remaining) : remaining);
}

export async function setDefaultAddress(uid: string, addressId: string): Promise<void> {
  const current = readAddresses(uid);
  if (!current.some((address) => address.id === addressId)) throw new Error("Address not found.");
  writeAddresses(uid, withDefault(current, addressId));
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
  try {
    onData(readAddresses(uid));
    const uidListeners = listeners.get(uid) ?? new Set<(addresses: CustomerAddress[]) => void>();
    uidListeners.add(onData);
    listeners.set(uid, uidListeners);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey(uid)) return;
      try {
        onData(readAddresses(uid));
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error("Could not read saved addresses."));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      uidListeners.delete(onData);
      if (uidListeners.size === 0) listeners.delete(uid);
      window.removeEventListener("storage", onStorage);
    };
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error("Could not read saved addresses."));
    return () => undefined;
  }
}