/**
 * useBrands
 *
 * Fetches companies from the PostgreSQL API (GET /api/admin/companies).
 * The shape is kept compatible with the previous Firestore Brand type so
 * existing consumers (MedicinesPage dialogs etc.) continue to work unchanged.
 *
 * Note: logoUrl, description, website are not stored in the companies table —
 * they are always empty strings here. Use the BrandsPage (CompaniesPage) for
 * full company management.
 */

import { useEffect, useState } from "react";

export type Brand = {
  id: string;      // string id for backwards-compat (PG id cast to string)
  name: string;
  logoUrl: string;
  description: string;
  website: string;
  order?: number;
  enabled: boolean;
};

type ApiCompany = { id: number; name: string; createdAt: string };

let _cache: { data: Brand[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useBrands(_onlyEnabled = false) {
  const [brands,  setBrands]  = useState<Brand[]>(_cache?.data ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    const now = Date.now();
    if (_cache && now - _cache.ts < CACHE_TTL) {
      setBrands(_cache.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Fetch all companies (up to 1000) — used only for form dropdowns
    fetch("/api/admin/companies?limit=1000")
      .then(async (r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        const json = await r.json() as { data: ApiCompany[] };
        if (cancelled) return;
        const mapped: Brand[] = json.data.map((c) => ({
          id:          String(c.id),
          name:        c.name,
          logoUrl:     "",
          description: "",
          website:     "",
          enabled:     true,
        }));
        _cache = { data: mapped, ts: Date.now() };
        setBrands(mapped);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { brands, loading };
}

/** Invalidate the in-memory cache (call after create/update/delete). */
export function invalidateBrandsCache() {
  _cache = null;
}
