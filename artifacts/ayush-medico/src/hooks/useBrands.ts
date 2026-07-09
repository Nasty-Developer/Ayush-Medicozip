/**
 * useBrands
 * Real-time Firestore listener for the `brands` collection.
 * Mirrors the same pattern as useCategories — live updates everywhere.
 */

import { useEffect, useState } from "react";
import { subscribeToCollection, orderBy } from "@/lib/firestoreHelpers";

export type Brand = {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
  order: number;
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
      [orderBy("order")],
      (docs) => {
        const all = docs as unknown as Brand[];
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
