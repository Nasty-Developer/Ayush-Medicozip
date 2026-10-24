/**
 * useCategories
 * Fetches the medicine categories from the PostgreSQL API.
 *
 * Replaces the previous Firestore implementation. The API endpoint
 * GET /api/categories returns all enabled categories with medicine counts,
 * ordered by displayOrder then name.
 *
 * @param onlyEnabled  Kept for API compatibility — the API always returns
 *                     only enabled categories, so this param is a no-op.
 */

import { useEffect, useState } from "react";

export type Category = {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  order?: number;
  enabled: boolean;
  slug?: string;
  imageUrl?: string | null;
  count?: number;
};

let _cache: { data: Category[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useCategories(_onlyEnabled = false) {
  const [categories, setCategories] = useState<Category[]>(_cache?.data ?? []);
  const [loading,    setLoading]    = useState(!_cache);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (_cache && now - _cache.ts < CACHE_TTL) {
      setCategories(_cache.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/categories")
      .then(async (r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        const json = await r.json() as { data: Category[] };
        if (cancelled) return;
        _cache = { data: json.data, ts: Date.now() };
        setCategories(json.data);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.warn("[useCategories] fetch error:", err.message);
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { categories, loading, error };
}

/** Call this to invalidate the cache (e.g. after admin updates). */
export function invalidateCategoriesCache() {
  _cache = null;
}
