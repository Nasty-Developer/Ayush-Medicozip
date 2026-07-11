/**
 * useMedicinesByCategory
 *
 * Cursor-based paginated fetch for medicines in one category from the
 * PostgreSQL API. Replaces the previous Firestore implementation.
 *
 * Returns:
 *   medicines     — currently loaded page(s)
 *   loading       — true during the first page fetch
 *   loadingMore   — true while fetching a subsequent page
 *   hasMore       — false once the API reports no more pages
 *   loadMore()    — call to append the next page
 */

import { useEffect, useState, useCallback, useRef } from "react";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

export type CategoryMedicine = {
  id: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  stockStatus?: StockStatus;
  available?: boolean;
  sellingPrice?: number | null;
  mrp?: number | null;
  discount?: number | null;
  categoryName?: string | null;
  order?: number;
  prescriptionRequired?: boolean;
  packInfo?: string | null;
  /** Quantity visible to the system — not shown raw to customers. */
  stockQuantity?: number;
  stockQty?: number;
  showInSpecialMedicines?: boolean;
  showInNewArrivals?: boolean;
  featured?: boolean;
};

const PAGE_SIZE = 50;

export function useMedicinesByCategory(categoryName: string) {
  const [medicines,    setMedicines]    = useState<CategoryMedicine[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(false);
  const [page,         setPage]         = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  /** Fetch a page for `catName`. `append=true` for subsequent pages. */
  const fetchPage = useCallback(async (catName: string, pageNum: number, append: boolean) => {
    if (!catName) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!append) setLoading(true);
    else         setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page:  String(pageNum),
        limit: String(PAGE_SIZE),
        category: catName,
      });

      const resp = await fetch(`/api/medicines?${params}`, { signal: ctrl.signal });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);

      const json = await resp.json() as {
        data: CategoryMedicine[];
        hasMore: boolean;
      };

      setMedicines((prev) => append ? [...prev, ...json.data] : json.data);
      setHasMore(json.hasMore);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      console.warn("[useMedicinesByCategory] fetch error:", err);
      setHasMore(false);
    } finally {
      if (!append) setLoading(false);
      else         setLoadingMore(false);
    }
  }, []);

  // Reset + fetch first page whenever category changes
  useEffect(() => {
    if (!categoryName) {
      setMedicines([]);
      setLoading(false);
      setHasMore(false);
      setPage(1);
      return;
    }
    setMedicines([]);
    setPage(1);
    setHasMore(false);
    fetchPage(categoryName, 1, false);
  }, [categoryName, fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore && categoryName) {
      const next = page + 1;
      setPage(next);
      fetchPage(categoryName, next, true);
    }
  }, [loadingMore, loading, hasMore, categoryName, page, fetchPage]);

  return { medicines, loading, loadingMore, hasMore, loadMore };
}
