/**
 * useAllMedicines
 * Cursor-based paginated fetch for the `medicines` Firestore collection
 * with NO category filter — used by the "All Medicines" view.
 *
 * Why getDocs instead of onSnapshot:
 *   A browse page with potentially 5,000–10,000 medicines cannot hold a
 *   real-time listener over the entire collection without burning Firestore
 *   read quota on every write.  One-time pagination is the correct pattern
 *   at this scale.  Category-scoped views (useMedicinesByCategory) retain
 *   real-time behaviour because each category set is small.
 *
 * Usage:
 *   const { medicines, initialLoading, loadingMore, hasMore, loadMore } =
 *     useAllMedicines();
 */

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  limit,
  startAfter,
  getDocs,
  orderBy,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CategoryMedicine } from "./useMedicinesByCategory";

const PAGE_SIZE = 48;

// ─────────────────────────────────────────────────────────────────────────────

export interface UseAllMedicinesResult {
  medicines: CategoryMedicine[];
  /** True only during the very first page load */
  initialLoading: boolean;
  /** True while a subsequent "load more" page is being fetched */
  loadingMore: boolean;
  /** False once Firestore returns fewer docs than PAGE_SIZE */
  hasMore: boolean;
  /** Fetch the next page and append to `medicines` */
  loadMore: () => void;
  /** Total medicines loaded so far */
  totalLoaded: number;
}

export function useAllMedicines(): UseAllMedicinesResult {
  const [medicines,      setMedicines]      = useState<CategoryMedicine[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [hasMore,        setHasMore]        = useState(true);
  const [cursor, setCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Fetches one page; `after` === null means the first page.
  const fetchPage = useCallback(
    async (after: QueryDocumentSnapshot<DocumentData> | null) => {
      if (!db) {
        setInitialLoading(false);
        return;
      }

      const isFirst = after === null;
      isFirst ? setInitialLoading(true) : setLoadingMore(true);

      try {
        // Order by `order` field (same convention as useMedicinesByCategory).
        // Documents without `order` sort to 0 by Firestore.
        const constraints = after
          ? [orderBy("order"), limit(PAGE_SIZE), startAfter(after)]
          : [orderBy("order"), limit(PAGE_SIZE)];

        const snap = await getDocs(
          query(collection(db, "medicines"), ...constraints)
        );

        const valid = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as CategoryMedicine))
          .filter((m) => typeof m?.name === "string" && m.name.trim().length > 0);

        setMedicines((prev) => (isFirst ? valid : [...prev, ...valid]));
        setCursor(snap.docs[snap.docs.length - 1] ?? null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err) {
        // Surface in console; the UI gracefully shows whatever was loaded.
        console.warn("[useAllMedicines] Firestore fetch error:", err);
        // If Firestore rejects the compound query (e.g. missing index),
        // fall back to an unordered fetch so the page still renders.
        if (!after) {
          try {
            const snap = await getDocs(
              query(collection(db, "medicines"), limit(PAGE_SIZE))
            );
            const valid = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as CategoryMedicine))
              .filter((m) => typeof m?.name === "string" && m.name.trim().length > 0);
            setMedicines(valid);
            setCursor(snap.docs[snap.docs.length - 1] ?? null);
            setHasMore(snap.docs.length === PAGE_SIZE);
          } catch {
            setHasMore(false);
          }
        }
      } finally {
        isFirst ? setInitialLoading(false) : setLoadingMore(false);
      }
    },
    [] // stable — no external deps
  );

  // Fetch first page on mount.
  useEffect(() => {
    fetchPage(null);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && !initialLoading && hasMore) fetchPage(cursor);
  }, [loadingMore, initialLoading, hasMore, cursor, fetchPage]);

  return {
    medicines,
    initialLoading,
    loadingMore,
    hasMore,
    loadMore,
    totalLoaded: medicines.length,
  };
}
