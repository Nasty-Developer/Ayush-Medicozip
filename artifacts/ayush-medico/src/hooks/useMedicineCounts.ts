/**
 * useMedicineCounts
 *
 * Returns a map of { [categoryName]: count } for the medicine catalogue.
 *
 * Performance fix (was: real-time subscription over ALL 51k medicines):
 * Now uses Firestore `getCountFromServer` — one cheap aggregation query
 * per category instead of streaming tens of thousands of documents.
 * Results are cached in memory for 5 minutes to avoid refetching on
 * every component remount.
 */

import { useEffect, useState } from "react";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCategories } from "./useCategories";

// Module-level cache so different component instances share counts
const cache = new Map<string, { count: number; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useMedicineCounts(): Record<string, number> {
  const { categories } = useCategories(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!categories.length || !db) return;

    const now = Date.now();

    // Return cached result immediately if all categories are warm
    const allCached = categories.every((cat) => {
      const hit = cache.get(cat.name);
      return hit && now - hit.ts < CACHE_TTL;
    });

    if (allCached) {
      setCounts(
        Object.fromEntries(
          categories.map((cat) => [cat.name, cache.get(cat.name)!.count])
        )
      );
      return;
    }

    const fetchCounts = async () => {
      const results: Record<string, number> = {};

      await Promise.all(
        categories.map(async (cat) => {
          const hit = cache.get(cat.name);
          if (hit && now - hit.ts < CACHE_TTL) {
            results[cat.name] = hit.count;
            return;
          }
          try {
            const snap = await getCountFromServer(
              query(
                collection(db!, "medicines"),
                where("categoryName", "==", cat.name)
              )
            );
            const count = snap.data().count;
            cache.set(cat.name, { count, ts: now });
            results[cat.name] = count;
          } catch {
            // Silently ignore — counts are a nice-to-have, not critical
            results[cat.name] = cache.get(cat.name)?.count ?? 0;
          }
        })
      );

      setCounts(results);
    };

    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  return counts;
}
