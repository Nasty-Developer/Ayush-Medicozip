// Address Service — CRUD for customer saved addresses.
// Stored as a subcollection: userAddresses/{uid}/addresses/{addressId}
// This lets Firestore rules scope reads/writes per-user without needing
// a composite index.

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

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

// ─── Collection helpers ───────────────────────────────────────────────────────

function addressesRef(uid: string) {
  if (!db) throw new Error("Firebase is not configured.");
  return collection(db, "userAddresses", uid, "addresses");
}

function addressDocRef(uid: string, addressId: string) {
  if (!db) throw new Error("Firebase is not configured.");
  return doc(db, "userAddresses", uid, "addresses", addressId);
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function getAddresses(uid: string): Promise<CustomerAddress[]> {
  if (!db) return [];
  const snap = await getDocs(addressesRef(uid));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as CustomerAddress))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
    });
}

export async function addAddress(
  uid: string,
  input: CreateAddressInput
): Promise<string> {
  const ref = addressesRef(uid);

  // If this is the first address or it's being set as default,
  // un-default all others first.
  if (input.isDefault) {
    const existing = await getDocs(ref);
    if (!existing.empty) {
      const batch = writeBatch(db!);
      existing.docs.forEach((d) => {
        if (d.data().isDefault) {
          batch.update(d.ref, { isDefault: false, updatedAt: Timestamp.now() });
        }
      });
      await batch.commit();
    }
  }

  const newRef = await addDoc(ref, {
    ...input,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return newRef.id;
}

export async function updateAddress(
  uid: string,
  addressId: string,
  data: Partial<CreateAddressInput>
): Promise<void> {
  const ref = addressesRef(uid);

  if (data.isDefault === true) {
    const existing = await getDocs(ref);
    const batch = writeBatch(db!);
    existing.docs.forEach((d) => {
      if (d.id !== addressId && d.data().isDefault) {
        batch.update(d.ref, { isDefault: false, updatedAt: Timestamp.now() });
      }
    });
    await batch.commit();
  }

  await updateDoc(addressDocRef(uid, addressId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteAddress(uid: string, addressId: string): Promise<void> {
  await deleteDoc(addressDocRef(uid, addressId));
}

export async function setDefaultAddress(uid: string, addressId: string): Promise<void> {
  const ref = addressesRef(uid);
  const existing = await getDocs(ref);
  const batch = writeBatch(db!);
  existing.docs.forEach((d) => {
    const shouldBeDefault = d.id === addressId;
    if (d.data().isDefault !== shouldBeDefault) {
      batch.update(d.ref, { isDefault: shouldBeDefault, updatedAt: Timestamp.now() });
    }
  });
  await batch.commit();
}

// ─── Real-time subscription ───────────────────────────────────────────────────

export function subscribeToAddresses(
  uid: string,
  onData: (addresses: CustomerAddress[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    setTimeout(() => onData([]), 0);
    return () => {};
  }
  return onSnapshot(
    addressesRef(uid),
    (snap) => {
      const addresses = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as CustomerAddress))
        .sort((a, b) => {
          if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
          return (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
        });
      onData(addresses);
    },
    onError
  );
}
