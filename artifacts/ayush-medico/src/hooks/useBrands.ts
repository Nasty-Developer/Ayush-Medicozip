/**
 * useBrands
 * Real-time Firestore listener for the `brands` collection.
 * Mirrors the same pattern as useCategories — live updates everywhere.
 *
 * NOTE: We do NOT use Firestore's orderBy() constraint — see useCategories.ts
 * for the full explanation. Documents missing the `order` field would be
 * silently excluded by Firestore; we sort client-side instead.
 */

import { useEffect, useState } from "react";
import { subscribeToCollection } from "@/lib/firestoreHelpers";

export type Brand = {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
  order?: number;   // optional — docs without this field are sorted to the front
  enabled: boolean;
};

/**
 * @param onlyEnabled - when true, only returns brands with enabled=true
 */
export function useBrands(onlyEnabled = false) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToCollection(
      "brands",
      [], // No Firestore-side ordering — sort client-side to include all docs
      (docs) => {
        const all = (docs as unknown as Brand[])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setBrands(onlyEnabled ? all.filter((b) => b.enabled) : all);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { brands, loading };
}
