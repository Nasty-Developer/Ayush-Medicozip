/**
 * useMedicinesByCategory
 *
 * Cursor-based paginated fetch for medicines belonging to a single category.
 *
 * Performance fix (was: real-time onSnapshot with no limit):
 * Now uses getDocs with limit(PAGE_SIZE) + cursor pagination so we never
 * stream the entire category at once. A category with 5,000 medicines
 * previously triggered 5,000 Firestore reads on every mount; now we
 * read 25 at a time and only load more when the user asks.
 *
 * Returns:
 *   medicines     — currently loaded page(s)
 *   loading       — true during the first page fetch
 *   loadingMore   — true while fetching a subsequent page
 *   hasMore       — false once Firestore returns fewer docs than PAGE_SIZE
 *   loadMore()    — call to append the next page
 */

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

export type CategoryMedicine = {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  stockStatus?: StockStatus;
  available?: boolean;
  sellingPrice?: number;
  mrp?: number;
  discount?: number;
  categoryName?: string;
  order?: number;
  prescriptionRequired?: boolean;
  packInfo?: string;
  stockQuantity?: number;
  stockQty?: number;
  showInSpecialMedicines?: boolean;
  showInNewArrivals?: boolean;
  featured?: boolean;
};

const PAGE_SIZE = 25;

export function useMedicinesByCategory(categoryName: string) {
  const [medicines, setMedicines] = useState<CategoryMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchPage = useCallback(
    async (
      catName: string,
      after: QueryDocumentSnapshot<DocumentData> | null
    ) => {
      if (!db || !catName) return;

      const isFirst = !after;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);

      try {
        const constraints: QueryConstraint[] = [
          where("categoryName", "==", catName),
          orderBy("order"),
          limit(PAGE_SIZE),
          ...(after ? [startAfter(after)] : []),
        ];

        const snap = await getDocs(query(collection(db, "medicines"), ...constraints));
        const valid = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as CategoryMedicine))
          .filter((m) => typeof m.name === "string" && m.name.trim().length > 0);

        setMedicines((prev) => (isFirst ? valid : [...prev, ...valid]));
        setCursor(snap.docs[snap.docs.length - 1] ?? null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch {
        // Fall back to unordered query if Firestore index is missing
        if (!after) {
          try {
            const snap = await getDocs(
              query(
                collection(db, "medicines"),
                where("categoryName", "==", catName),
                limit(PAGE_SIZE)
              )
            );
            const valid = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as CategoryMedicine))
              .filter((m) => typeof m.name === "string" && m.name.trim().length > 0);
            // Sort client-side on first fallback page
            valid.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setMedicines(valid);
            setCursor(snap.docs[snap.docs.length - 1] ?? null);
            setHasMore(snap.docs.length === PAGE_SIZE);
          } catch {
            setHasMore(false);
          }
        }
      } finally {
        if (isFirst) setLoading(false);
        else setLoadingMore(false);
      }
    },
    []
  );

  // Reset + fetch first page whenever category changes
  useEffect(() => {
    if (!categoryName) {
      setMedicines([]);
      setLoading(false);
      setHasMore(false);
      setCursor(null);
      return;
    }
    setMedicines([]);
    setCursor(null);
    setHasMore(false);
    fetchPage(categoryName, null);
  }, [categoryName, fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore && categoryName) {
      fetchPage(categoryName, cursor);
    }
  }, [loadingMore, loading, hasMore, categoryName, cursor, fetchPage]);

  return { medicines, loading, loadingMore, hasMore, loadMore };
}
