import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`fs_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(`fs_cache_${key}`);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function setCached<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(`fs_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function clearCached(key: string) {
  try {
    sessionStorage.removeItem(`fs_cache_${key}`);
  } catch {}
}

export type FireDoc = { id: string } & DocumentData;

export async function getCollection(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  cacheKey?: string
): Promise<FireDoc[]> {
  if (!db) return [];
  const key = cacheKey ?? collectionName;
  const cached = getCached<FireDoc[]>(key);
  if (cached) return cached;

  const q = constraints.length
    ? query(collection(db, collectionName), ...constraints)
    : collection(db, collectionName);
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  setCached(key, data);
  return data;
}

export async function getDocById(
  collectionName: string,
  docId: string
): Promise<FireDoc | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, collectionName, docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addDocument(
  collectionName: string,
  data: DocumentData,
  invalidateCache?: string
): Promise<string> {
  if (!db) throw new Error("Firebase not configured");
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  if (invalidateCache) clearCached(invalidateCache);
  return ref.id;
}

export async function setDocument(
  collectionName: string,
  docId: string,
  data: DocumentData,
  invalidateCache?: string
): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await setDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
  if (invalidateCache) clearCached(invalidateCache);
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>,
  invalidateCache?: string
): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
  if (invalidateCache) clearCached(invalidateCache);
}

export async function deleteDocument(
  collectionName: string,
  docId: string,
  invalidateCache?: string
): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await deleteDoc(doc(db, collectionName, docId));
  if (invalidateCache) clearCached(invalidateCache);
}

export function subscribeToDoc(
  collectionName: string,
  docId: string,
  onData: (doc: FireDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, collectionName, docId),
    (snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError
  );
}

export function subscribeToCollection(
  collectionName: string,
  constraints: QueryConstraint[],
  onData: (docs: FireDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  const q = constraints.length
    ? query(collection(db, collectionName), ...constraints)
    : collection(db, collectionName);
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function invalidateCache(key: string) {
  clearCached(key);
}

export { orderBy, limit, where, Timestamp };
