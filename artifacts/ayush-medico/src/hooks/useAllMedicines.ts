/**
 * useAllMedicines
 * Paginated fetch for the medicines catalogue from the PostgreSQL API.
 *
 * Replaces the previous Firestore implementation. The public API endpoint
 * GET /api/medicines returns medicines ordered: in-stock first, then by name.
 *
 * Usage:
 *   const { medicines, initialLoading, loadingMore, hasMore, loadMore } =
 *     useAllMedicines({ search, sort });
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { CategoryMedicine } from "./useMedicinesByCategory";

export interface UseAllMedicinesOptions {
  search?: string;
  sort?: "default" | "name" | "price-low" | "price-high";
  category?: string;
}

export interface UseAllMedicinesResult {
  medicines: CategoryMedicine[];
  initialLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  totalLoaded: number;
}

const PAGE_SIZE = 48;

export function useAllMedicines(opts: UseAllMedicinesOptions = {}): UseAllMedicinesResult {
  const { search = "", sort = "default", category = "" } = opts;

  const [medicines,      setMedicines]      = useState<CategoryMedicine[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [hasMore,        setHasMore]        = useState(true);
  const [page,           setPage]           = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!append) setInitialLoading(true);
    else         setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page:  String(pageNum),
        limit: String(PAGE_SIZE),
      });
      if (search)   params.set("search",   search);
      if (sort && sort !== "default") params.set("sort", sort);
      if (category) params.set("category", category);

      const resp = await fetch(`/api/medicines?${params}`, { signal: ctrl.signal });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);

      const json = await resp.json() as {
        data: CategoryMedicine[];
        total: number;
        hasMore: boolean;
      };

      setMedicines((prev) => append ? [...prev, ...json.data] : json.data);
      setHasMore(json.hasMore);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      console.warn("[useAllMedicines] fetch error:", err);
      setHasMore(false);
    } finally {
      if (!append) setInitialLoading(false);
      else         setLoadingMore(false);
    }
  }, [search, sort, category]);

  // Reset and fetch first page when filters change
  useEffect(() => {
    setMedicines([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || initialLoading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [loadingMore, initialLoading, hasMore, page, fetchPage]);

  return {
    medicines,
    initialLoading,
    loadingMore,
    hasMore,
    loadMore,
    totalLoaded: medicines.length,
  };
}
